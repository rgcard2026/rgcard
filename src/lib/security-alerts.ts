import type { NextRequest } from 'next/server';
import { prisma } from './prisma';
import { getSettingMap, resolveSecurityAlertDestination, resolveSecurityAlertEmailDestination } from './settings';

type AlertMetadata = Record<string, unknown> | undefined;
type AlertChannel = 'whatsapp' | 'email';

type AlertResult = {
  sent: boolean;
  reason?: string;
  channels?: AlertChannel[];
};

type DeliveryResult = {
  channel: AlertChannel;
  sent: boolean;
  error?: string;
};

const ALERTABLE_ACTIONS = new Set([
  'SECURITY_ATTACK_BLOCKED',
  'BRUTE_FORCE_ALERT',
  'LOGIN_PAYLOAD_DECRYPT_FAILED',
  'ADMIN_LOGIN_PAYLOAD_DECRYPT_FAILED',
  'ADMIN_BRUTE_FORCE_ALERT',
  'LOGIN_RATE_ALERT'
]);

function requestInfo(request: NextRequest) {
  const forwardedFor = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  return {
    ip: forwardedFor?.split(',')[0]?.trim() || realIp || 'unknown',
    path: request.nextUrl?.pathname || request.url || ''
  };
}

function boolSetting(value: string | undefined, fallback = false) {
  if (value === undefined) return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(value).trim().toLowerCase());
}

function boundedInt(value: string | undefined, fallback: number, min: number, max: number) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.min(max, Math.round(number)));
}

function severityFor(action: string, metadata?: AlertMetadata) {
  const explicit = String(metadata?.severity || '').toLowerCase();
  if (explicit === 'critical') return 'critical';
  if (explicit === 'high') return 'high';
  if (action === 'BRUTE_FORCE_ALERT' || action === 'ADMIN_BRUTE_FORCE_ALERT' || action === 'LOGIN_RATE_ALERT') return 'high';
  return 'high';
}

function arabicActionLabel(action: string) {
  const map: Record<string, string> = {
    SECURITY_ATTACK_BLOCKED: 'تم حظر طلب مشبوه',
    BRUTE_FORCE_ALERT: 'محاولات دخول متكررة',
    ADMIN_BRUTE_FORCE_ALERT: 'محاولات دخول متكررة على لوحة الإدارة',
    LOGIN_RATE_ALERT: 'معدل مرتفع لمحاولات الدخول الفاشلة',
    LOGIN_PAYLOAD_DECRYPT_FAILED: 'فشل قراءة بيانات دخول المستخدم',
    ADMIN_LOGIN_PAYLOAD_DECRYPT_FAILED: 'فشل قراءة بيانات دخول الأدمن',
    TEST_SECURITY_ALERT: 'رسالة اختبار للتنبيهات الأمنية'
  };
  return map[action] || action;
}

function safeContext(metadata?: AlertMetadata) {
  const candidates = [metadata?.event, metadata?.target, metadata?.reason, metadata?.attackSignature, metadata?.urlAttack, metadata?.bodyAttack];
  const value = candidates.find((item) => typeof item === 'string' && item.trim());
  return typeof value === 'string' ? value.replace(/[\r\n]+/g, ' ').slice(0, 120) : '';
}

function escapeHtml(value: string) {
  const entities: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' };
  return value.replace(/[&<>'"]/g, (char) => entities[char] || char);
}

function emailHtml(rows: Array<[string, string]>) {
  return `<!doctype html><html dir="rtl" lang="ar"><body style="margin:0;background:#f8f8f4;font-family:Arial,sans-serif;color:#161a22"><div style="max-width:640px;margin:24px auto;background:#fff;border:1px solid #ece8df;border-radius:16px;overflow:hidden"><div style="padding:20px 24px;background:#111827;color:#fff"><div style="font-size:12px;color:#f4d995;letter-spacing:.08em">RG-CARD</div><h1 style="font-size:22px;margin:8px 0 0">تنبيه أمني</h1></div><div style="padding:24px"><p style="margin:0 0 18px;line-height:1.7">تم تسجيل حدث أمني عالي الخطورة داخل منصة RG-Card.</p><table style="width:100%;border-collapse:collapse">${rows.map(([label, value]) => `<tr><td style="padding:10px 0;border-bottom:1px solid #eee;color:#6b7280;width:38%">${escapeHtml(label)}</td><td style="padding:10px 0;border-bottom:1px solid #eee;font-weight:700;word-break:break-word">${escapeHtml(value)}</td></tr>`).join('')}</table><p style="margin:18px 0 0;color:#6b7280;font-size:12px;line-height:1.7">لا تحتوي هذه الرسالة على كلمات مرور أو أرقام بطاقات أو محتوى كامل للطلبات.</p></div></div></body></html>`;
}

async function timedFetch(url: string, options: RequestInit, timeoutMs: number) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function sendWebhook(endpoint: string, token: string, payload: Record<string, unknown>, timeoutMs: number): Promise<DeliveryResult> {
  try {
    const response = await timedFetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(payload)
    }, timeoutMs);
    if (!response.ok) throw new Error(`webhook returned ${response.status}`);
    return { channel: 'whatsapp', sent: true };
  } catch (error) {
    return { channel: 'whatsapp', sent: false, error: error instanceof Error ? error.message.slice(0, 160) : 'webhook_failed' };
  }
}

async function sendEmail(apiKey: string, from: string, to: string[], subject: string, text: string, html: string, timeoutMs: number): Promise<DeliveryResult> {
  try {
    const response = await timedFetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to, subject, text, html })
    }, timeoutMs);
    if (!response.ok) {
      const detail = (await response.text().catch(() => '')).replace(/[\r\n]+/g, ' ').slice(0, 120);
      throw new Error(`email provider returned ${response.status}${detail ? `: ${detail}` : ''}`);
    }
    return { channel: 'email', sent: true };
  } catch (error) {
    return { channel: 'email', sent: false, error: error instanceof Error ? error.message.slice(0, 160) : 'email_failed' };
  }
}

async function writeDeliveryLog(request: NextRequest, action: string, sourceAction: string, severity: string, extra: Record<string, unknown> = {}) {
  const info = requestInfo(request);
  await prisma.auditLog.create({
    data: {
      action,
      path: info.path,
      ip: info.ip,
      userAgent: request.headers.get('user-agent') || 'unknown',
      metadata: JSON.stringify({ sourceAction, severity, ...extra })
    }
  }).catch(() => null);
}

export async function getSecurityAlertConfig() {
  const settings = await getSettingMap();
  const destination = resolveSecurityAlertDestination(settings);
  const email = resolveSecurityAlertEmailDestination(settings);
  return {
    enabled: boolSetting(settings.securityAlertEnabled, false),
    cooldownMinutes: boundedInt(settings.securityAlertCooldownMinutes, 5, 1, 60),
    configured: Boolean(destination.url || email.configured),
    endpoint: destination.url,
    token: destination.token,
    source: destination.source,
    email
  };
}

export async function dispatchSecurityAlert(
  request: NextRequest,
  action: string,
  metadata?: AlertMetadata,
  options: { force?: boolean } = {}
): Promise<AlertResult> {
  if (!options.force && !ALERTABLE_ACTIONS.has(action)) return { sent: false, reason: 'not-alertable' };

  const config = await getSecurityAlertConfig();
  if (!config.enabled) return { sent: false, reason: 'disabled' };
  if (!config.configured) return { sent: false, reason: 'not-configured' };

  const info = requestInfo(request);
  const since = new Date(Date.now() - config.cooldownMinutes * 60 * 1000);

  try {
    const recent = await prisma.auditLog.findFirst({
      where: {
        action: { in: ['WHATSAPP_SECURITY_ALERT_SENT', 'EMAIL_SECURITY_ALERT_SENT'] },
        ip: info.ip,
        createdAt: { gte: since },
        metadata: { contains: `\"sourceAction\":\"${action}\"` }
      },
      orderBy: { createdAt: 'desc' },
      select: { id: true }
    });
    if (recent && !options.force) return { sent: false, reason: 'cooldown' };

    const severity = severityFor(action, metadata);
    const context = safeContext(metadata);
    let occurredAt = new Date().toISOString();
    try { occurredAt = new Date().toLocaleString('ar-EG', { timeZone: process.env.TZ || 'Africa/Cairo' }); } catch { /* keep ISO fallback */ }

    const label = arabicActionLabel(action);
    const lines = [
      '🚨 RG-Card Security Alert',
      `الحدث: ${label}`,
      `الخطورة: ${severity.toUpperCase()}`,
      `المصدر: ${info.ip}`,
      `المسار: ${info.path}`,
      context ? `تفاصيل مختصرة: ${context}` : '',
      `الوقت: ${occurredAt}`
    ].filter(Boolean);
    const message = lines.join('\n');
    const html = emailHtml([
      ['الحدث', label],
      ['الخطورة', severity.toUpperCase()],
      ['عنوان المصدر', info.ip],
      ['المسار', info.path],
      ...(context ? [['تفاصيل مختصرة', context] as [string, string]] : []),
      ['الوقت', occurredAt]
    ]);
    const timeoutMs = boundedInt(process.env.SECURITY_ALERT_TIMEOUT_MS, 6000, 1500, 15000);
    const deliveries: Promise<DeliveryResult>[] = [];

    if (config.endpoint) {
      deliveries.push(sendWebhook(config.endpoint, config.token, {
        channel: 'whatsapp',
        type: 'RG_CARD_SECURITY_ALERT',
        severity,
        sourceAction: action,
        occurredAt: new Date().toISOString(),
        source: info,
        message
      }, timeoutMs));
    }
    if (config.email.configured) {
      deliveries.push(sendEmail(
        config.email.apiKey,
        config.email.from,
        config.email.to,
        `RG-Card | ${label}`,
        message,
        html,
        timeoutMs
      ));
    }

    const deliveriesResult = await Promise.all(deliveries);
    const sent = deliveriesResult.filter((result) => result.sent);
    const failed = deliveriesResult.filter((result) => !result.sent);

    await Promise.all([
      ...sent.map((result) => writeDeliveryLog(
        request,
        result.channel === 'email' ? 'EMAIL_SECURITY_ALERT_SENT' : 'WHATSAPP_SECURITY_ALERT_SENT',
        action,
        severity,
        { cooldownMinutes: config.cooldownMinutes }
      )),
      ...failed.map((result) => writeDeliveryLog(
        request,
        result.channel === 'email' ? 'EMAIL_SECURITY_ALERT_FAILED' : 'WHATSAPP_SECURITY_ALERT_FAILED',
        action,
        severity,
        { error: result.error || 'delivery_failed' }
      ))
    ]);

    if (sent.length > 0) return { sent: true, channels: sent.map((result) => result.channel) };
    console.error('security alert delivery failed', failed);
    return { sent: false, reason: 'delivery-failed' };
  } catch (error) {
    console.error('security alert dispatch failed', error);
    await writeDeliveryLog(request, 'SECURITY_ALERT_DISPATCH_FAILED', action, severityFor(action, metadata), {
      error: error instanceof Error ? error.message.slice(0, 160) : 'unknown'
    });
    return { sent: false, reason: 'delivery-failed' };
  }
}
