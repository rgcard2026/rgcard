import { access, constants, stat } from 'node:fs/promises';
import path from 'node:path';
import { NextRequest, NextResponse } from 'next/server';
import { forbidden, requireApiSession, unauthorized } from '@/lib/api';
import { adminHasPermission } from '@/lib/admin-auth';
import { writeAuditLog } from '@/lib/audit';
import { uploadsRoot } from '@/lib/uploads';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type CheckStatus = 'ok' | 'warn' | 'error';

type StatusCheck = {
  key: string;
  label: string;
  status: CheckStatus;
  detail: string;
};

function getDatabasePath() {
  const configuredPath = String(process.env.RG_CARD_DB_PATH || '').trim();
  if (configuredPath) return path.resolve(configuredPath);

  const databaseUrl = String(process.env.DATABASE_URL || '');
  if (!databaseUrl.startsWith('file:')) return null;

  const relativeOrAbsolutePath = decodeURIComponent(databaseUrl.slice(5).split('?')[0]);
  if (!relativeOrAbsolutePath) return null;
  return path.resolve(relativeOrAbsolutePath);
}

export async function GET(request: NextRequest) {
  const admin = await requireApiSession(request, 'admin');
  if (!admin) return unauthorized();
  if (!(await adminHasPermission(admin, 'EXPORTS'))) {
    return forbidden('ليست لديك صلاحية فحص حالة النظام');
  }

  const checks: StatusCheck[] = [];
  const push = (key: string, label: string, status: CheckStatus, detail: string) =>
    checks.push({ key, label, status, detail });

  // 1) Database connectivity
  let databaseReachable = false;
  try {
    await prisma.$queryRawUnsafe('SELECT 1');
    databaseReachable = true;
    push('db-connection', 'الاتصال بقاعدة البيانات', 'ok', 'تم الاتصال بقاعدة البيانات بنجاح.');
  } catch (error) {
    push('db-connection', 'الاتصال بقاعدة البيانات', 'error', `تعذر الاتصال بقاعدة البيانات: ${String((error as Error)?.message || error)}`);
  }

  // 2) SQLite integrity + foreign-key check (only meaningful once reachable)
  if (databaseReachable) {
    try {
      const integrity = (await prisma.$queryRawUnsafe('PRAGMA integrity_check')) as Array<Record<string, unknown>>;
      const firstValue = integrity?.[0] ? String(Object.values(integrity[0])[0] ?? '') : '';
      if (firstValue.toLowerCase() === 'ok') {
        push('db-integrity', 'سلامة قاعدة البيانات', 'ok', 'فحص السلامة (integrity_check) تمام، لا يوجد تلف.');
      } else {
        const issues = integrity.map((row) => String(Object.values(row)[0] ?? '')).filter(Boolean);
        push('db-integrity', 'سلامة قاعدة البيانات', 'error', `تم اكتشاف تلف محتمل: ${issues.slice(0, 5).join(' | ') || 'نتيجة غير متوقعة'}`);
      }
    } catch (error) {
      push('db-integrity', 'سلامة قاعدة البيانات', 'warn', `تعذر تنفيذ فحص السلامة: ${String((error as Error)?.message || error)}`);
    }

    try {
      const fkIssues = (await prisma.$queryRawUnsafe('PRAGMA foreign_key_check')) as Array<unknown>;
      if (!fkIssues || fkIssues.length === 0) {
        push('db-foreign-keys', 'ترابط الجداول (المفاتيح الخارجية)', 'ok', 'لا توجد سجلات يتيمة أو علاقات مكسورة.');
      } else {
        push('db-foreign-keys', 'ترابط الجداول (المفاتيح الخارجية)', 'error', `تم العثور على ${fkIssues.length} علاقة مكسورة بين الجداول.`);
      }
    } catch (error) {
      push('db-foreign-keys', 'ترابط الجداول (المفاتيح الخارجية)', 'warn', `تعذر فحص المفاتيح الخارجية: ${String((error as Error)?.message || error)}`);
    }

    // 3) Core data counts (so the admin can confirm data is present)
    try {
      const [admins, users, places, offers, arrivals] = await Promise.all([
        prisma.admin.count(),
        prisma.user.count(),
        prisma.place.count(),
        prisma.offer.count(),
        prisma.newArrival.count(),
      ]);
      const summary = `المسؤولون: ${admins} • الأعضاء: ${users} • الأماكن: ${places} • العروض: ${offers} • وصل حديثًا: ${arrivals}`;
      if (admins === 0 || users === 0) {
        push('db-data', 'بيانات النظام', 'warn', `${summary} — تنبيه: لا يوجد مسؤولون أو أعضاء مسجّلون.`);
      } else {
        push('db-data', 'بيانات النظام', 'ok', summary);
      }
    } catch (error) {
      push('db-data', 'بيانات النظام', 'warn', `تعذر قراءة عدّادات البيانات: ${String((error as Error)?.message || error)}`);
    }
  }

  // 4) Database file on disk
  const databasePath = getDatabasePath();
  if (databasePath) {
    try {
      const info = await stat(databasePath);
      const sizeMb = (info.size / (1024 * 1024)).toFixed(2);
      push('db-file', 'ملف قاعدة البيانات', 'ok', `موجود بحجم ${sizeMb} ميجابايت.`);
    } catch {
      push('db-file', 'ملف قاعدة البيانات', 'error', `تعذر الوصول لملف قاعدة البيانات على المسار: ${databasePath}`);
    }
  }

  // 5) Uploads directory
  try {
    const uploadDirectory = uploadsRoot();
    const info = await stat(uploadDirectory);
    if (!info.isDirectory()) {
      push('uploads', 'مجلد الملفات المرفوعة', 'error', 'مسار الملفات المرفوعة ليس مجلدًا.');
    } else {
      try {
        await access(uploadDirectory, constants.W_OK);
        push('uploads', 'مجلد الملفات المرفوعة', 'ok', 'المجلد موجود وقابل للكتابة.');
      } catch {
        push('uploads', 'مجلد الملفات المرفوعة', 'warn', 'المجلد موجود لكنه غير قابل للكتابة.');
      }
    }
  } catch {
    push('uploads', 'مجلد الملفات المرفوعة', 'error', 'تعذر الوصول لمجلد الملفات المرفوعة.');
  }

  // 6) Required public card assets
  const publicDirectory = path.join(process.cwd(), 'public');
  const requiredAssets = ['card-template.png', 'card-template.jpg', 'card-back.png'];
  const missingAssets: string[] = [];
  await Promise.all(requiredAssets.map(async (asset) => {
    try {
      await access(path.join(publicDirectory, asset));
    } catch {
      missingAssets.push(asset);
    }
  }));
  if (missingAssets.length === 0) {
    push('assets', 'صور وقوالب الكارت', 'ok', 'كل ملفات قوالب الكارت المطلوبة موجودة.');
  } else {
    push('assets', 'صور وقوالب الكارت', 'warn', `ملفات مفقودة: ${missingAssets.join('، ')}`);
  }

  const hasError = checks.some((check) => check.status === 'error');
  const hasWarn = checks.some((check) => check.status === 'warn');
  const overall: CheckStatus = hasError ? 'error' : hasWarn ? 'warn' : 'ok';
  const message = hasError
    ? 'تم اكتشاف مشاكل قد تشير إلى تلف أو خلل — راجع التفاصيل بالأسفل.'
    : hasWarn
      ? 'النظام يعمل لكن توجد تنبيهات تستحق المراجعة.'
      : 'كل الفحوصات سليمة — لا يوجد تلف أو مشاكل.';

  try {
    await writeAuditLog(request, 'ADMIN_SYSTEM_STATUS_CHECK', { adminId: admin.sub }, { overall, hasError, hasWarn });
  } catch {
    // auditing failure should not break the status response
  }

  return NextResponse.json(
    { ok: !hasError, overall, message, checkedAt: new Date().toISOString(), checks },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
