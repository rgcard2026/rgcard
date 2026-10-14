import { prisma } from "./prisma";
import { CARD_TEMPLATE } from "./card-layout";
import { DESIGN_DEFAULTS } from "./design-defaults";
import { decryptValue, encryptValue } from "./vault";

const DEFAULT_WHATSAPP_NUMBER =
  process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "201000033494";
const DEFAULT_WHATSAPP_MESSAGE =
  "مرحبًا، أحتاج مساعدة بخصوص حساب RG-Card\nCard / ID: {{id}}";
const DEFAULT_CARD_TEMPLATE_URL =
  CARD_TEMPLATE.templateUrl || "/card-template.png";

const WEBHOOK_URL_KEY = "securityAlertWebhookUrlEnc";
const WEBHOOK_TOKEN_KEY = "securityAlertWebhookTokenEnc";
const EMAIL_TO_KEY = "securityAlertEmailToEnc";

function cleanHexColor(value: unknown, fallback: string) {
  const raw = String(value || "").trim();
  return /^#[0-9a-fA-F]{6}$/.test(raw) ? raw.toUpperCase() : fallback;
}

function cleanDesignFont(value: unknown, fallback = DESIGN_DEFAULTS.designFontFamily) {
  const allowed = [
    "IBM Plex Sans Arabic",
    "Cairo",
    "Tajawal",
    "Noto Kufi Arabic",
    "Noto Sans Arabic",
    "Almarai",
    "Changa",
    "El Messiri",
    "Amiri",
    "Readex Pro",
    "Alexandria",
    "Reem Kufi",
    "Arial",
    "Tahoma",
    "Segoe UI",
    "Verdana",
    "Trebuchet MS",
    "Georgia",
    "Times New Roman",
    "Courier New",
    "Outfit",
    "Inter",
    "Poppins",
    "Montserrat",
    "Roboto",
  ];
  const raw = String(value || "").trim();
  return allowed.includes(raw) ? raw : fallback;
}

function cleanBackgroundImageUrl(value: unknown) {
  const raw = String(value || "").trim();
  return raw.startsWith("/uploads/design-background/") ? raw : "";
}

function cleanLoginBannerImageUrl(value: unknown) {
  const raw = String(value || "").trim();
  return raw.startsWith("/uploads/design-login-banner/") ? raw : "";
}

function cleanPopupImageUrl(value: unknown) {
  const raw = String(value || "").trim();
  return raw.startsWith("/uploads/design-popup/") ? raw : "";
}

function cleanCardBackUrl(value: unknown) {
  const raw = String(value || "").trim();
  return raw.startsWith("/uploads/design-card-back/") ? raw : "";
}

export function cleanCardNumberList(value: unknown) {
  const raw = String(value || "");
  const items = raw
    .split(/[\s,;\n]+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => part.slice(0, 80));
  // Dedupe, cap the number of targeted users to a sane limit.
  return Array.from(new Set(items)).slice(0, 2000).join(",");
}

function cleanHttpsUrl(value: unknown) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" && url.protocol !== "http:") return "";
    return url.toString().slice(0, 500);
  } catch {
    return "";
  }
}

function cleanText(value: unknown, fallback: string, maxLength: number) {
  const text = String(value ?? "").replace(/[\r\n]+/g, " ").trim().slice(0, maxLength);
  return text || fallback;
}

// UI text overrides let an admin rename buttons / labels per language without a
// code change. Stored as a compact JSON string: { ar: {key: text}, en: {...} }.
export function cleanUiTextOverrides(value: unknown): string {
  let input: any = value;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return "";
    try {
      input = JSON.parse(trimmed);
    } catch {
      return "";
    }
  }
  if (!input || typeof input !== "object") return "";
  const result: Record<string, Record<string, string>> = {};
  for (const lang of ["ar", "en"]) {
    const bucket = (input as Record<string, unknown>)[lang];
    if (!bucket || typeof bucket !== "object") continue;
    const cleanBucket: Record<string, string> = {};
    let count = 0;
    for (const [key, text] of Object.entries(bucket as Record<string, unknown>)) {
      if (count >= 2000) break;
      const safeKey = String(key).trim().slice(0, 60);
      const safeText = String(text ?? "").replace(/[\r\n]+/g, " ").trim().slice(0, 240);
      if (safeKey && safeText) {
        cleanBucket[safeKey] = safeText;
        count++;
      }
    }
    if (Object.keys(cleanBucket).length) result[lang] = cleanBucket;
  }
  return Object.keys(result).length ? JSON.stringify(result) : "";
}

export function parseUiTextOverrides(value: unknown): Record<string, Record<string, string>> {
  const cleaned = cleanUiTextOverrides(value);
  if (!cleaned) return {};
  try {
    return JSON.parse(cleaned);
  } catch {
    return {};
  }
}

function designSettingsFromMap(map: Record<string, string>) {
  return {
    designPrimaryColor: cleanHexColor(
      map.designPrimaryColor,
      DESIGN_DEFAULTS.designPrimaryColor,
    ),
    designSecondaryColor: cleanHexColor(
      map.designSecondaryColor,
      DESIGN_DEFAULTS.designSecondaryColor,
    ),
    designAccentColor: cleanHexColor(
      map.designAccentColor,
      DESIGN_DEFAULTS.designAccentColor,
    ),
    designBackgroundColor: cleanHexColor(
      map.designBackgroundColor,
      DESIGN_DEFAULTS.designBackgroundColor,
    ),
    designSurfaceColor: cleanHexColor(
      map.designSurfaceColor,
      DESIGN_DEFAULTS.designSurfaceColor,
    ),
    designTextColor: cleanHexColor(
      map.designTextColor,
      DESIGN_DEFAULTS.designTextColor,
    ),
    designButtonTextColor: cleanHexColor(
      map.designButtonTextColor,
      DESIGN_DEFAULTS.designButtonTextColor,
    ),
    designMutedTextColor: cleanHexColor(
      map.designMutedTextColor,
      DESIGN_DEFAULTS.designMutedTextColor,
    ),
    designInputBackgroundColor: cleanHexColor(
      map.designInputBackgroundColor,
      DESIGN_DEFAULTS.designInputBackgroundColor,
    ),
    designSuccessColor: cleanHexColor(
      map.designSuccessColor,
      DESIGN_DEFAULTS.designSuccessColor,
    ),
    designDangerColor: cleanHexColor(
      map.designDangerColor,
      DESIGN_DEFAULTS.designDangerColor,
    ),
    designFontFamily: cleanDesignFont(map.designFontFamily),
    designHeadingFontFamily: cleanDesignFont(
      map.designHeadingFontFamily,
      DESIGN_DEFAULTS.designHeadingFontFamily,
    ),
    designButtonFontFamily: cleanDesignFont(
      map.designButtonFontFamily,
      DESIGN_DEFAULTS.designButtonFontFamily,
    ),
    designFontWeight: intSetting(
      map.designFontWeight,
      DESIGN_DEFAULTS.designFontWeight,
      300,
      950,
    ),
    designHeadingWeight: intSetting(
      map.designHeadingWeight,
      DESIGN_DEFAULTS.designHeadingWeight,
      300,
      950,
    ),
    designButtonWeight: intSetting(
      map.designButtonWeight,
      DESIGN_DEFAULTS.designButtonWeight,
      300,
      950,
    ),
    designFontStyle: map.designFontStyle === "italic" ? "italic" : "normal",
    designHeadingStyle: map.designHeadingStyle === "italic" ? "italic" : "normal",
    designButtonStyle: map.designButtonStyle === "italic" ? "italic" : "normal",
    designBodyFontSize: intSetting(map.designBodyFontSize, DESIGN_DEFAULTS.designBodyFontSize, 12, 24),
    designH1FontSize: intSetting(map.designH1FontSize, DESIGN_DEFAULTS.designH1FontSize, 26, 72),
    designH2FontSize: intSetting(map.designH2FontSize, DESIGN_DEFAULTS.designH2FontSize, 22, 60),
    designH3FontSize: intSetting(map.designH3FontSize, DESIGN_DEFAULTS.designH3FontSize, 18, 48),
    designCardTitleFontSize: intSetting(map.designCardTitleFontSize, DESIGN_DEFAULTS.designCardTitleFontSize, 14, 36),
    designButtonFontSize: intSetting(map.designButtonFontSize, DESIGN_DEFAULTS.designButtonFontSize, 11, 24),
    designInputFontSize: intSetting(map.designInputFontSize, DESIGN_DEFAULTS.designInputFontSize, 11, 24),
    designNavFontSize: intSetting(map.designNavFontSize, DESIGN_DEFAULTS.designNavFontSize, 11, 24),
    designCaptionFontSize: intSetting(map.designCaptionFontSize, DESIGN_DEFAULTS.designCaptionFontSize, 9, 20),
    designLineHeightPercent: intSetting(map.designLineHeightPercent, DESIGN_DEFAULTS.designLineHeightPercent, 110, 240),
    designLetterSpacing: numberSetting(map.designLetterSpacing, DESIGN_DEFAULTS.designLetterSpacing, -2, 5),
    designButtonRadius: intSetting(
      map.designButtonRadius,
      DESIGN_DEFAULTS.designButtonRadius,
      0,
      40,
    ),
    designCardRadius: intSetting(
      map.designCardRadius,
      DESIGN_DEFAULTS.designCardRadius,
      0,
      60,
    ),
    designInputRadius: intSetting(
      map.designInputRadius,
      DESIGN_DEFAULTS.designInputRadius,
      0,
      40,
    ),
    designButtonShadow: intSetting(map.designButtonShadow, DESIGN_DEFAULTS.designButtonShadow, 0, 40),
    designButtonPaddingX: intSetting(map.designButtonPaddingX, DESIGN_DEFAULTS.designButtonPaddingX, 8, 40),
    designPlaceLogoScale: intSetting(map.designPlaceLogoScale, DESIGN_DEFAULTS.designPlaceLogoScale, 60, 180),
    designCardOpacity: intSetting(map.designCardOpacity, DESIGN_DEFAULTS.designCardOpacity, 0, 100),
    designCardWidth: intSetting(map.designCardWidth, DESIGN_DEFAULTS.designCardWidth, 0, 100),
    designCardHeight: intSetting(map.designCardHeight, DESIGN_DEFAULTS.designCardHeight, 0, 800),
    designBoxOpacity: intSetting(map.designBoxOpacity, DESIGN_DEFAULTS.designBoxOpacity, 0, 100),
    designBoxWidth: intSetting(map.designBoxWidth, DESIGN_DEFAULTS.designBoxWidth, 0, 100),
    designBoxHeight: intSetting(map.designBoxHeight, DESIGN_DEFAULTS.designBoxHeight, 0, 800),
    designFieldOpacity: intSetting(map.designFieldOpacity, DESIGN_DEFAULTS.designFieldOpacity, 0, 100),
    designFieldWidth: intSetting(map.designFieldWidth, DESIGN_DEFAULTS.designFieldWidth, 0, 100),
    designFieldHeight: intSetting(map.designFieldHeight, DESIGN_DEFAULTS.designFieldHeight, 0, 100),
    designButtonOpacity: intSetting(map.designButtonOpacity, DESIGN_DEFAULTS.designButtonOpacity, 0, 100),
    designButtonWidth: intSetting(map.designButtonWidth, DESIGN_DEFAULTS.designButtonWidth, 0, 100),
    designButtonHeight: intSetting(map.designButtonHeight, DESIGN_DEFAULTS.designButtonHeight, 0, 100),
    designBackgroundImageUrl: cleanBackgroundImageUrl(
      map.designBackgroundImageUrl,
    ),
    designBackgroundImageEnabled: boolSetting(
      map.designBackgroundImageEnabled,
      false,
    ),
    designBackgroundSize: ["cover", "contain", "auto"].includes(
      map.designBackgroundSize || "",
    )
      ? map.designBackgroundSize
      : DESIGN_DEFAULTS.designBackgroundSize,
    designBackgroundOverlay: intSetting(
      map.designBackgroundOverlay,
      DESIGN_DEFAULTS.designBackgroundOverlay,
      0,
      90,
    ),
    designLoginBannerTitle: cleanText(map.designLoginBannerTitle, DESIGN_DEFAULTS.designLoginBannerTitle, 60),
    designLoginBannerSubtitleAr: cleanText(map.designLoginBannerSubtitleAr, DESIGN_DEFAULTS.designLoginBannerSubtitleAr, 120),
    designLoginBannerSubtitleEn: cleanText(map.designLoginBannerSubtitleEn, DESIGN_DEFAULTS.designLoginBannerSubtitleEn, 120),
    designLoginBannerLogo: cleanText(map.designLoginBannerLogo, DESIGN_DEFAULTS.designLoginBannerLogo, 4),
    designLoginBannerShowLogo: boolSetting(map.designLoginBannerShowLogo, DESIGN_DEFAULTS.designLoginBannerShowLogo),
    designLoginBannerStartColor: cleanHexColor(map.designLoginBannerStartColor, DESIGN_DEFAULTS.designLoginBannerStartColor),
    designLoginBannerEndColor: cleanHexColor(map.designLoginBannerEndColor, DESIGN_DEFAULTS.designLoginBannerEndColor),
    designLoginBannerTextColor: cleanHexColor(map.designLoginBannerTextColor, DESIGN_DEFAULTS.designLoginBannerTextColor),
    designLoginBannerHeight: intSetting(map.designLoginBannerHeight, DESIGN_DEFAULTS.designLoginBannerHeight, 120, 700),
    designLoginBannerRadius: intSetting(map.designLoginBannerRadius, DESIGN_DEFAULTS.designLoginBannerRadius, 0, 180),
    designLoginBannerOpacity: intSetting(map.designLoginBannerOpacity, DESIGN_DEFAULTS.designLoginBannerOpacity, 0, 100),
    designLoginBannerContentAlign: ["start", "center", "end"].includes(map.designLoginBannerContentAlign || "")
      ? map.designLoginBannerContentAlign
      : DESIGN_DEFAULTS.designLoginBannerContentAlign,
    designLoginBannerImageUrl: cleanLoginBannerImageUrl(map.designLoginBannerImageUrl),
    designLoginBannerImageEnabled: boolSetting(map.designLoginBannerImageEnabled, false),
    designPopupEnabled: boolSetting(map.designPopupEnabled, false),
    designPopupTitle: cleanText(map.designPopupTitle, DESIGN_DEFAULTS.designPopupTitle, 120),
    designPopupText: cleanText(map.designPopupText, DESIGN_DEFAULTS.designPopupText, 600),
    designPopupImageUrl: cleanPopupImageUrl(map.designPopupImageUrl),
    designPopupLinkUrl: cleanHttpsUrl(map.designPopupLinkUrl),
    designCardBackLine1: cleanText(map.designCardBackLine1, DESIGN_DEFAULTS.designCardBackLine1, 120),
    designCardBackLine2: cleanText(map.designCardBackLine2, DESIGN_DEFAULTS.designCardBackLine2, 120),
    designCardBackBrand: cleanText(map.designCardBackBrand, DESIGN_DEFAULTS.designCardBackBrand, 40),
    designCardBackUrl: cleanCardBackUrl(map.designCardBackUrl),
    designArrivalEnabled: boolSetting(map.designArrivalEnabled, DESIGN_DEFAULTS.designArrivalEnabled),
    designArrivalBannerMaxWidth: intSetting(map.designArrivalBannerMaxWidth, DESIGN_DEFAULTS.designArrivalBannerMaxWidth, 40, 100),
    designArrivalBannerRadius: intSetting(map.designArrivalBannerRadius, DESIGN_DEFAULTS.designArrivalBannerRadius, 0, 60),
    designArrivalPaddingY: intSetting(map.designArrivalPaddingY, DESIGN_DEFAULTS.designArrivalPaddingY, 0, 80),
    designArrivalTileWidth: intSetting(map.designArrivalTileWidth, DESIGN_DEFAULTS.designArrivalTileWidth, 80, 280),
    designArrivalTileHeight: intSetting(map.designArrivalTileHeight, DESIGN_DEFAULTS.designArrivalTileHeight, 50, 200),
    designArrivalTileRadius: intSetting(map.designArrivalTileRadius, DESIGN_DEFAULTS.designArrivalTileRadius, 0, 40),
    designArrivalTileGap: intSetting(map.designArrivalTileGap, DESIGN_DEFAULTS.designArrivalTileGap, 4, 40),
    designArrivalCustomColors: boolSetting(map.designArrivalCustomColors, DESIGN_DEFAULTS.designArrivalCustomColors),
    designArrivalBannerBg: cleanHexColor(map.designArrivalBannerBg, DESIGN_DEFAULTS.designArrivalBannerBg),
    designArrivalBannerBorder: cleanHexColor(map.designArrivalBannerBorder, DESIGN_DEFAULTS.designArrivalBannerBorder),
    designArrivalTitleColor: cleanHexColor(map.designArrivalTitleColor, DESIGN_DEFAULTS.designArrivalTitleColor),
    designArrivalSubtitleColor: cleanHexColor(map.designArrivalSubtitleColor, DESIGN_DEFAULTS.designArrivalSubtitleColor),
    designArrivalTileBg: cleanHexColor(map.designArrivalTileBg, DESIGN_DEFAULTS.designArrivalTileBg),
    designArrivalTileBorder: cleanHexColor(map.designArrivalTileBorder, DESIGN_DEFAULTS.designArrivalTileBorder),
    designArrivalNameColor: cleanHexColor(map.designArrivalNameColor, DESIGN_DEFAULTS.designArrivalNameColor),
  };
}

function cleanWhatsAppNumber(value?: string | null) {
  const cleaned = String(value || "").replace(/[^0-9]/g, "");
  if (!cleaned) return DEFAULT_WHATSAPP_NUMBER;
  if (cleaned.startsWith("0")) return `20${cleaned.slice(1)}`;
  return cleaned;
}

function cleanWhatsAppMessage(value?: string | null) {
  const message = String(value || "").trim();
  if (!message) return DEFAULT_WHATSAPP_MESSAGE;
  return message.slice(0, 500);
}

function cleanCardTemplateUrl(value?: string | null) {
  const url = String(value || "").trim();
  if (!url) return DEFAULT_CARD_TEMPLATE_URL;
  if (
    !url.startsWith("/uploads/card-template/") &&
    url !== "/card-template.png"
  )
    return DEFAULT_CARD_TEMPLATE_URL;
  return url;
}

function boolSetting(value: string | undefined, fallback = false) {
  if (value === undefined) return fallback;
  return ["1", "true", "yes", "on"].includes(
    String(value).trim().toLowerCase(),
  );
}

function intSetting(
  value: string | undefined,
  fallback: number,
  min: number,
  max: number,
) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.round(n)));
}

function numberSetting(
  value: string | undefined,
  fallback: number,
  min: number,
  max: number,
) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.round(n * 100) / 100));
}

function maskEmail(value: string) {
  const [local, domain] = value.split("@");
  if (!local || !domain) return "configured";
  const visible = local.length <= 2 ? local[0] || "*" : `${local.slice(0, 2)}…`;
  return `${visible}@${domain}`;
}

function cleanHeaderValue(value?: string | null) {
  return String(value || "")
    .replace(/[\r\n]+/g, " ")
    .trim()
    .slice(0, 320);
}

export function normalizeSecurityAlertEmails(value?: string | null) {
  const raw = String(value || "").trim();
  if (!raw) return [] as string[];
  const parts = raw
    .split(/[;,\n]+/)
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const unique = Array.from(new Set(parts));
  if (
    unique.length > 5 ||
    unique.some((item) => item.length > 254 || !emailPattern.test(item))
  )
    return null;
  return unique;
}

export function normalizeSecurityWebhookUrl(value?: string | null) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  try {
    const url = new URL(raw);
    const host = url.hostname.toLowerCase();
    const privateIpv4 =
      /^(127\.|0\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[0-1])\.)/;
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      host === "localhost" ||
      host === "::1" ||
      host.endsWith(".local") ||
      privateIpv4.test(host)
    )
      return "";
    return url.toString();
  } catch {
    return "";
  }
}

export async function getSettingMap() {
  try {
    const rows = await prisma.appSetting.findMany();
    return Object.fromEntries(rows.map((row) => [row.key, row.value]));
  } catch {
    return {} as Record<string, string>;
  }
}

export const DEFAULT_SESSION_MINUTES = Number(process.env.SESSION_MINUTES || 60);

export function sessionMinutesFromMap(map: Record<string, string>) {
  return intSetting(map.sessionMinutes, DEFAULT_SESSION_MINUTES, 5, 1440);
}

/** Admin-configurable session lifetime in minutes (default 60). */
export async function getSessionMinutes() {
  const map = await getSettingMap();
  return sessionMinutesFromMap(map);
}

export function resolveSecurityAlertDestination(map: Record<string, string>) {
  const envUrl = normalizeSecurityWebhookUrl(
    process.env.SECURITY_ALERT_WEBHOOK_URL,
  );
  if (envUrl) {
    return {
      url: envUrl,
      token: String(process.env.SECURITY_ALERT_WEBHOOK_TOKEN || ""),
      source: "environment" as const,
    };
  }

  const storedUrl = normalizeSecurityWebhookUrl(
    decryptValue(map[WEBHOOK_URL_KEY]),
  );
  return {
    url: storedUrl,
    token: storedUrl ? decryptValue(map[WEBHOOK_TOKEN_KEY]) : "",
    source: storedUrl ? ("dashboard" as const) : ("none" as const),
  };
}

export function resolveSecurityAlertEmailDestination(
  map: Record<string, string>,
) {
  const apiKey = String(process.env.RESEND_API_KEY || "").trim();
  const from = cleanHeaderValue(
    process.env.SECURITY_ALERT_EMAIL_FROM || process.env.RESEND_FROM_EMAIL,
  );
  const envRecipients = normalizeSecurityAlertEmails(
    process.env.SECURITY_ALERT_EMAIL_TO,
  );
  const storedRecipients = normalizeSecurityAlertEmails(
    decryptValue(map[EMAIL_TO_KEY]),
  );
  const to =
    envRecipients && envRecipients.length > 0
      ? envRecipients
      : storedRecipients || [];
  const source =
    envRecipients && envRecipients.length > 0
      ? ("environment" as const)
      : to.length > 0
        ? ("dashboard" as const)
        : ("none" as const);
  const providerReady = Boolean(apiKey && from);

  return {
    apiKey,
    from,
    to,
    source,
    providerReady,
    configured: Boolean(providerReady && to.length > 0),
  };
}

export async function getPublicSettings() {
  const map = await getSettingMap();
  return {
    whatsappNumber: cleanWhatsAppNumber(map.whatsappNumber),
    whatsappMessage: cleanWhatsAppMessage(map.whatsappMessage),
    uiTextOverrides: parseUiTextOverrides(map.uiTextOverrides),
    ...designSettingsFromMap(map),
  };
}

export async function getCardRenderSettings() {
  const map = await getSettingMap();
  return {
    ...CARD_TEMPLATE,
    width: intSetting(map.cardCanvasWidth, CARD_TEMPLATE.width, 600, 2400),
    height: intSetting(map.cardCanvasHeight, CARD_TEMPLATE.height, 400, 1600),
    templateUrl: cleanCardTemplateUrl(map.cardTemplateUrl),
    templateOpacity: intSetting(map.cardTemplateOpacity, 100, 0, 100) / 100,
    qr: {
      x: intSetting(map.cardQrX, CARD_TEMPLATE.qr.x, 0, 2400),
      y: intSetting(map.cardQrY, CARD_TEMPLATE.qr.y, 0, 1600),
      size: intSetting(map.cardQrSize, CARD_TEMPLATE.qr.size, 60, 600),
      opacity: intSetting(map.cardQrOpacity, 100, 0, 100) / 100,
    },
    id: {
      ...CARD_TEMPLATE.id,
      x: intSetting(map.cardIdX, CARD_TEMPLATE.id.x, 0, 2400),
      y: intSetting(map.cardIdY, CARD_TEMPLATE.id.y, 0, 1600),
      width: intSetting(map.cardIdWidth, CARD_TEMPLATE.id.width, 40, 1200),
      height: intSetting(map.cardIdHeight, CARD_TEMPLATE.id.height, 20, 400),
      fontSize: intSetting(map.cardIdFontSize, CARD_TEMPLATE.id.fontSize, 8, 120),
      opacity: intSetting(map.cardIdOpacity, 100, 0, 100) / 100,
    },
    membershipClass: {
      ...CARD_TEMPLATE.membershipClass,
      x: intSetting(map.cardMembershipX, CARD_TEMPLATE.membershipClass.x, 0, 2400),
      y: intSetting(map.cardMembershipY, CARD_TEMPLATE.membershipClass.y, 0, 1600),
      width: intSetting(map.cardMembershipWidth, CARD_TEMPLATE.membershipClass.width, 40, 1200),
      height: intSetting(map.cardMembershipHeight, CARD_TEMPLATE.membershipClass.height, 20, 400),
      fontSize: intSetting(map.cardMembershipFontSize, CARD_TEMPLATE.membershipClass.fontSize, 8, 120),
      opacity: intSetting(map.cardMembershipOpacity, 100, 0, 100) / 100,
    },
    expiry: {
      ...CARD_TEMPLATE.expiry,
      x: intSetting(map.cardExpiryX, CARD_TEMPLATE.expiry.x, 0, 2400),
      y: intSetting(map.cardExpiryY, CARD_TEMPLATE.expiry.y, 0, 1600),
      width: intSetting(map.cardExpiryWidth, CARD_TEMPLATE.expiry.width, 40, 1200),
      height: intSetting(map.cardExpiryHeight, CARD_TEMPLATE.expiry.height, 20, 400),
      fontSize: intSetting(
        map.cardExpiryFontSize,
        CARD_TEMPLATE.expiry.fontSize,
        8,
        120,
      ),
      opacity: intSetting(map.cardExpiryOpacity, 100, 0, 100) / 100,
    },
  };
}

export async function getAdminSettings() {
  const map = await getSettingMap();
  const publicSettings = await getPublicSettings();
  const cardLayout = await getCardRenderSettings();
  const destination = resolveSecurityAlertDestination(map);
  const emailDestination = resolveSecurityAlertEmailDestination(map);
  return {
    ...publicSettings,
    designPopupAudience: ["all", "selected"].includes(map.designPopupAudience || "") ? map.designPopupAudience : "all",
    designPopupUserIds: cleanCardNumberList(map.designPopupUserIds),
    cardTemplateUrl: cardLayout.templateUrl,
    cardCanvasWidth: cardLayout.width,
    cardCanvasHeight: cardLayout.height,
    cardTemplateOpacity: Math.round((cardLayout.templateOpacity ?? 1) * 100),
    cardQrX: cardLayout.qr.x,
    cardQrY: cardLayout.qr.y,
    cardQrSize: cardLayout.qr.size,
    cardQrOpacity: Math.round((cardLayout.qr.opacity ?? 1) * 100),
    cardIdX: cardLayout.id.x,
    cardIdY: cardLayout.id.y,
    cardIdWidth: cardLayout.id.width,
    cardIdHeight: cardLayout.id.height,
    cardIdFontSize: cardLayout.id.fontSize,
    cardIdOpacity: Math.round((cardLayout.id.opacity ?? 1) * 100),
    cardMembershipX: cardLayout.membershipClass.x,
    cardMembershipY: cardLayout.membershipClass.y,
    cardMembershipWidth: cardLayout.membershipClass.width,
    cardMembershipHeight: cardLayout.membershipClass.height,
    cardMembershipFontSize: cardLayout.membershipClass.fontSize,
    cardMembershipOpacity: Math.round((cardLayout.membershipClass.opacity ?? 1) * 100),
    cardExpiryX: cardLayout.expiry.x,
    cardExpiryY: cardLayout.expiry.y,
    cardExpiryWidth: cardLayout.expiry.width,
    cardExpiryHeight: cardLayout.expiry.height,
    cardExpiryFontSize: cardLayout.expiry.fontSize,
    cardExpiryOpacity: Math.round((cardLayout.expiry.opacity ?? 1) * 100),
    sessionMinutes: sessionMinutesFromMap(map),
    securityAlertEnabled: boolSetting(map.securityAlertEnabled, false),
    securityAlertCooldownMinutes: intSetting(
      map.securityAlertCooldownMinutes,
      5,
      1,
      60,
    ),
    securityAlertConfigured: Boolean(
      destination.url || emailDestination.configured,
    ),
    securityAlertWebhookConfigured: Boolean(destination.url),
    securityAlertWebhookUrl:
      destination.source === "dashboard" ? destination.url : "",
    securityAlertWebhookTokenConfigured: Boolean(destination.token),
    securityAlertConfigSource: destination.source,
    securityAlertEmailConfigured: emailDestination.configured,
    securityAlertEmailProviderReady: emailDestination.providerReady,
    securityAlertEmailTo:
      emailDestination.source === "dashboard"
        ? emailDestination.to.join(", ")
        : "",
    securityAlertEmailRecipientLabel: emailDestination.to
      .map(maskEmail)
      .join(", "),
    securityAlertEmailConfigSource: emailDestination.source,
  };
}

type AdminSettingInput = {
  whatsappNumber?: string;
  whatsappMessage?: string;
  cardCanvasWidth?: unknown;
  cardCanvasHeight?: unknown;
  cardTemplateOpacity?: unknown;
  cardQrX?: unknown;
  cardQrY?: unknown;
  cardQrSize?: unknown;
  cardQrOpacity?: unknown;
  cardIdX?: unknown;
  cardIdY?: unknown;
  cardIdWidth?: unknown;
  cardIdHeight?: unknown;
  cardIdFontSize?: unknown;
  cardIdOpacity?: unknown;
  cardMembershipX?: unknown;
  cardMembershipY?: unknown;
  cardMembershipWidth?: unknown;
  cardMembershipHeight?: unknown;
  cardMembershipFontSize?: unknown;
  cardMembershipOpacity?: unknown;
  cardExpiryX?: unknown;
  cardExpiryY?: unknown;
  cardExpiryWidth?: unknown;
  cardExpiryHeight?: unknown;
  cardExpiryFontSize?: unknown;
  cardExpiryOpacity?: unknown;
  sessionMinutes?: unknown;
  securityAlertEnabled?: unknown;
  securityAlertCooldownMinutes?: unknown;
  securityAlertWebhookUrl?: unknown;
  securityAlertWebhookToken?: unknown;
  securityAlertEmailTo?: unknown;
  designPrimaryColor?: unknown;
  designSecondaryColor?: unknown;
  designAccentColor?: unknown;
  designBackgroundColor?: unknown;
  designSurfaceColor?: unknown;
  designTextColor?: unknown;
  designMutedTextColor?: unknown;
  designButtonTextColor?: unknown;
  designInputBackgroundColor?: unknown;
  designSuccessColor?: unknown;
  designDangerColor?: unknown;
  designFontFamily?: unknown;
  designHeadingFontFamily?: unknown;
  designButtonFontFamily?: unknown;
  designFontWeight?: unknown;
  designHeadingWeight?: unknown;
  designButtonWeight?: unknown;
  designFontStyle?: unknown;
  designHeadingStyle?: unknown;
  designButtonStyle?: unknown;
  designBodyFontSize?: unknown;
  designH1FontSize?: unknown;
  designH2FontSize?: unknown;
  designH3FontSize?: unknown;
  designCardTitleFontSize?: unknown;
  designButtonFontSize?: unknown;
  designInputFontSize?: unknown;
  designNavFontSize?: unknown;
  designCaptionFontSize?: unknown;
  designLineHeightPercent?: unknown;
  designLetterSpacing?: unknown;
  designButtonRadius?: unknown;
  designCardRadius?: unknown;
  designInputRadius?: unknown;
  designButtonShadow?: unknown;
  designButtonPaddingX?: unknown;
  designPlaceLogoScale?: unknown;
  designCardOpacity?: unknown;
  designCardWidth?: unknown;
  designCardHeight?: unknown;
  designBoxOpacity?: unknown;
  designBoxWidth?: unknown;
  designBoxHeight?: unknown;
  designFieldOpacity?: unknown;
  designFieldWidth?: unknown;
  designFieldHeight?: unknown;
  designButtonOpacity?: unknown;
  designButtonWidth?: unknown;
  designButtonHeight?: unknown;
  uiTextOverrides?: unknown;
  designBackgroundImageUrl?: unknown;
  designBackgroundImageEnabled?: unknown;
  designBackgroundSize?: unknown;
  designBackgroundOverlay?: unknown;
  designLoginBannerTitle?: unknown;
  designLoginBannerSubtitleAr?: unknown;
  designLoginBannerSubtitleEn?: unknown;
  designLoginBannerLogo?: unknown;
  designLoginBannerShowLogo?: unknown;
  designLoginBannerStartColor?: unknown;
  designLoginBannerEndColor?: unknown;
  designLoginBannerTextColor?: unknown;
  designLoginBannerHeight?: unknown;
  designLoginBannerRadius?: unknown;
  designLoginBannerOpacity?: unknown;
  designLoginBannerContentAlign?: unknown;
  designLoginBannerImageUrl?: unknown;
  designLoginBannerImageEnabled?: unknown;
  designPopupEnabled?: unknown;
  designPopupTitle?: unknown;
  designPopupText?: unknown;
  designPopupImageUrl?: unknown;
  designPopupLinkUrl?: unknown;
  designPopupAudience?: unknown;
  designPopupUserIds?: unknown;
  designCardBackLine1?: unknown;
  designCardBackLine2?: unknown;
  designCardBackBrand?: unknown;
  designCardBackUrl?: unknown;
  designArrivalEnabled?: unknown;
  designArrivalBannerMaxWidth?: unknown;
  designArrivalBannerRadius?: unknown;
  designArrivalPaddingY?: unknown;
  designArrivalTileWidth?: unknown;
  designArrivalTileHeight?: unknown;
  designArrivalTileRadius?: unknown;
  designArrivalTileGap?: unknown;
  designArrivalCustomColors?: unknown;
  designArrivalBannerBg?: unknown;
  designArrivalBannerBorder?: unknown;
  designArrivalTitleColor?: unknown;
  designArrivalSubtitleColor?: unknown;
  designArrivalTileBg?: unknown;
  designArrivalTileBorder?: unknown;
  designArrivalNameColor?: unknown;
};

export async function saveAdminSettings(values: AdminSettingInput) {
  const updates: { key: string; value: string }[] = [];
  if (values.whatsappNumber !== undefined)
    updates.push({
      key: "whatsappNumber",
      value: cleanWhatsAppNumber(values.whatsappNumber),
    });
  if (values.whatsappMessage !== undefined)
    updates.push({
      key: "whatsappMessage",
      value: cleanWhatsAppMessage(values.whatsappMessage),
    });
  const cardIntegerFields: Array<[keyof AdminSettingInput, string, number, number, number]> = [
    ["cardCanvasWidth", "cardCanvasWidth", CARD_TEMPLATE.width, 600, 2400],
    ["cardCanvasHeight", "cardCanvasHeight", CARD_TEMPLATE.height, 400, 1600],
    ["cardIdX", "cardIdX", CARD_TEMPLATE.id.x, 0, 2400],
    ["cardIdY", "cardIdY", CARD_TEMPLATE.id.y, 0, 1600],
    ["cardIdWidth", "cardIdWidth", CARD_TEMPLATE.id.width, 40, 1200],
    ["cardIdHeight", "cardIdHeight", CARD_TEMPLATE.id.height, 20, 400],
    ["cardIdFontSize", "cardIdFontSize", CARD_TEMPLATE.id.fontSize, 8, 120],
    ["cardMembershipX", "cardMembershipX", CARD_TEMPLATE.membershipClass.x, 0, 2400],
    ["cardMembershipY", "cardMembershipY", CARD_TEMPLATE.membershipClass.y, 0, 1600],
    ["cardMembershipWidth", "cardMembershipWidth", CARD_TEMPLATE.membershipClass.width, 40, 1200],
    ["cardMembershipHeight", "cardMembershipHeight", CARD_TEMPLATE.membershipClass.height, 20, 400],
    ["cardMembershipFontSize", "cardMembershipFontSize", CARD_TEMPLATE.membershipClass.fontSize, 8, 120],
    ["cardExpiryWidth", "cardExpiryWidth", CARD_TEMPLATE.expiry.width, 40, 1200],
    ["cardExpiryHeight", "cardExpiryHeight", CARD_TEMPLATE.expiry.height, 20, 400],
  ];
  for (const [inputKey, storageKey, fallback, min, max] of cardIntegerFields) {
    const value = values[inputKey];
    if (value !== undefined) {
      updates.push({
        key: storageKey,
        value: String(intSetting(String(value), fallback, min, max)),
      });
    }
  }
  const cardOpacityFields: Array<[keyof AdminSettingInput, string]> = [
    ["cardTemplateOpacity", "cardTemplateOpacity"],
    ["cardQrOpacity", "cardQrOpacity"],
    ["cardIdOpacity", "cardIdOpacity"],
    ["cardMembershipOpacity", "cardMembershipOpacity"],
    ["cardExpiryOpacity", "cardExpiryOpacity"],
  ];
  for (const [inputKey, storageKey] of cardOpacityFields) {
    const value = values[inputKey];
    if (value !== undefined) {
      updates.push({
        key: storageKey,
        value: String(intSetting(String(value), 100, 0, 100)),
      });
    }
  }
  if (values.cardQrX !== undefined)
    updates.push({
      key: "cardQrX",
      value: String(
        intSetting(String(values.cardQrX), CARD_TEMPLATE.qr.x, 0, 2400),
      ),
    });
  if (values.cardQrY !== undefined)
    updates.push({
      key: "cardQrY",
      value: String(
        intSetting(String(values.cardQrY), CARD_TEMPLATE.qr.y, 0, 1600),
      ),
    });
  if (values.cardQrSize !== undefined)
    updates.push({
      key: "cardQrSize",
      value: String(
        intSetting(String(values.cardQrSize), CARD_TEMPLATE.qr.size, 60, 600),
      ),
    });
  if (values.cardExpiryX !== undefined)
    updates.push({
      key: "cardExpiryX",
      value: String(
        intSetting(String(values.cardExpiryX), CARD_TEMPLATE.expiry.x, 0, 2400),
      ),
    });
  if (values.cardExpiryY !== undefined)
    updates.push({
      key: "cardExpiryY",
      value: String(
        intSetting(
          String(values.cardExpiryY),
          CARD_TEMPLATE.expiry.y,
          0,
          1600,
        ),
      ),
    });
  if (values.cardExpiryFontSize !== undefined)
    updates.push({
      key: "cardExpiryFontSize",
      value: String(
        intSetting(
          String(values.cardExpiryFontSize),
          CARD_TEMPLATE.expiry.fontSize,
          8,
          120,
        ),
      ),
    });
  if (values.sessionMinutes !== undefined)
    updates.push({
      key: "sessionMinutes",
      value: String(intSetting(String(values.sessionMinutes), DEFAULT_SESSION_MINUTES, 5, 1440)),
    });
  if (values.securityAlertEnabled !== undefined)
    updates.push({
      key: "securityAlertEnabled",
      value: boolSetting(String(values.securityAlertEnabled), false)
        ? "true"
        : "false",
    });
  if (values.securityAlertCooldownMinutes !== undefined)
    updates.push({
      key: "securityAlertCooldownMinutes",
      value: String(
        intSetting(String(values.securityAlertCooldownMinutes), 5, 1, 60),
      ),
    });
  if (values.designPrimaryColor !== undefined)
    updates.push({
      key: "designPrimaryColor",
      value: cleanHexColor(
        values.designPrimaryColor,
        DESIGN_DEFAULTS.designPrimaryColor,
      ),
    });
  if (values.designSecondaryColor !== undefined)
    updates.push({
      key: "designSecondaryColor",
      value: cleanHexColor(
        values.designSecondaryColor,
        DESIGN_DEFAULTS.designSecondaryColor,
      ),
    });
  if (values.designAccentColor !== undefined)
    updates.push({
      key: "designAccentColor",
      value: cleanHexColor(
        values.designAccentColor,
        DESIGN_DEFAULTS.designAccentColor,
      ),
    });
  if (values.designBackgroundColor !== undefined)
    updates.push({
      key: "designBackgroundColor",
      value: cleanHexColor(
        values.designBackgroundColor,
        DESIGN_DEFAULTS.designBackgroundColor,
      ),
    });
  if (values.designSurfaceColor !== undefined)
    updates.push({
      key: "designSurfaceColor",
      value: cleanHexColor(
        values.designSurfaceColor,
        DESIGN_DEFAULTS.designSurfaceColor,
      ),
    });
  if (values.designTextColor !== undefined)
    updates.push({
      key: "designTextColor",
      value: cleanHexColor(
        values.designTextColor,
        DESIGN_DEFAULTS.designTextColor,
      ),
    });
  if (values.designButtonTextColor !== undefined)
    updates.push({
      key: "designButtonTextColor",
      value: cleanHexColor(
        values.designButtonTextColor,
        DESIGN_DEFAULTS.designButtonTextColor,
      ),
    });
  if (values.designMutedTextColor !== undefined)
    updates.push({ key: "designMutedTextColor", value: cleanHexColor(values.designMutedTextColor, DESIGN_DEFAULTS.designMutedTextColor) });
  if (values.designInputBackgroundColor !== undefined)
    updates.push({ key: "designInputBackgroundColor", value: cleanHexColor(values.designInputBackgroundColor, DESIGN_DEFAULTS.designInputBackgroundColor) });
  if (values.designSuccessColor !== undefined)
    updates.push({ key: "designSuccessColor", value: cleanHexColor(values.designSuccessColor, DESIGN_DEFAULTS.designSuccessColor) });
  if (values.designDangerColor !== undefined)
    updates.push({ key: "designDangerColor", value: cleanHexColor(values.designDangerColor, DESIGN_DEFAULTS.designDangerColor) });
  if (values.designFontFamily !== undefined)
    updates.push({
      key: "designFontFamily",
      value: cleanDesignFont(values.designFontFamily),
    });
  if (values.designHeadingFontFamily !== undefined)
    updates.push({ key: "designHeadingFontFamily", value: cleanDesignFont(values.designHeadingFontFamily, DESIGN_DEFAULTS.designHeadingFontFamily) });
  if (values.designButtonFontFamily !== undefined)
    updates.push({ key: "designButtonFontFamily", value: cleanDesignFont(values.designButtonFontFamily, DESIGN_DEFAULTS.designButtonFontFamily) });
  if (values.designFontWeight !== undefined)
    updates.push({
      key: "designFontWeight",
      value: String(
        intSetting(
          String(values.designFontWeight),
          DESIGN_DEFAULTS.designFontWeight,
          300,
          950,
        ),
      ),
    });
  if (values.designHeadingWeight !== undefined)
    updates.push({ key: "designHeadingWeight", value: String(intSetting(String(values.designHeadingWeight), DESIGN_DEFAULTS.designHeadingWeight, 300, 950)) });
  if (values.designButtonWeight !== undefined)
    updates.push({ key: "designButtonWeight", value: String(intSetting(String(values.designButtonWeight), DESIGN_DEFAULTS.designButtonWeight, 300, 950)) });
  if (values.designFontStyle !== undefined)
    updates.push({
      key: "designFontStyle",
      value: String(values.designFontStyle) === "italic" ? "italic" : "normal",
    });
  if (values.designHeadingStyle !== undefined)
    updates.push({ key: "designHeadingStyle", value: String(values.designHeadingStyle) === "italic" ? "italic" : "normal" });
  if (values.designButtonStyle !== undefined)
    updates.push({ key: "designButtonStyle", value: String(values.designButtonStyle) === "italic" ? "italic" : "normal" });
  const designSizeFields: Array<[keyof typeof DESIGN_DEFAULTS, unknown, number, number]> = [
    ["designBodyFontSize", values.designBodyFontSize, 12, 24],
    ["designH1FontSize", values.designH1FontSize, 26, 72],
    ["designH2FontSize", values.designH2FontSize, 22, 60],
    ["designH3FontSize", values.designH3FontSize, 18, 48],
    ["designCardTitleFontSize", values.designCardTitleFontSize, 14, 36],
    ["designButtonFontSize", values.designButtonFontSize, 11, 24],
    ["designInputFontSize", values.designInputFontSize, 11, 24],
    ["designNavFontSize", values.designNavFontSize, 11, 24],
    ["designCaptionFontSize", values.designCaptionFontSize, 9, 20],
    ["designLineHeightPercent", values.designLineHeightPercent, 110, 240],
  ];
  for (const [key, value, min, max] of designSizeFields) {
    if (value !== undefined) updates.push({ key, value: String(intSetting(String(value), Number(DESIGN_DEFAULTS[key]), min, max)) });
  }
  if (values.designLetterSpacing !== undefined)
    updates.push({ key: "designLetterSpacing", value: String(numberSetting(String(values.designLetterSpacing), DESIGN_DEFAULTS.designLetterSpacing, -2, 5)) });
  if (values.designButtonRadius !== undefined)
    updates.push({
      key: "designButtonRadius",
      value: String(
        intSetting(
          String(values.designButtonRadius),
          DESIGN_DEFAULTS.designButtonRadius,
          0,
          40,
        ),
      ),
    });
  if (values.designCardRadius !== undefined)
    updates.push({
      key: "designCardRadius",
      value: String(
        intSetting(
          String(values.designCardRadius),
          DESIGN_DEFAULTS.designCardRadius,
          0,
          60,
        ),
      ),
    });
  if (values.designInputRadius !== undefined)
    updates.push({ key: "designInputRadius", value: String(intSetting(String(values.designInputRadius), DESIGN_DEFAULTS.designInputRadius, 0, 40)) });
  if (values.designButtonShadow !== undefined)
    updates.push({ key: "designButtonShadow", value: String(intSetting(String(values.designButtonShadow), DESIGN_DEFAULTS.designButtonShadow, 0, 40)) });
  if (values.designButtonPaddingX !== undefined)
    updates.push({ key: "designButtonPaddingX", value: String(intSetting(String(values.designButtonPaddingX), DESIGN_DEFAULTS.designButtonPaddingX, 8, 40)) });
  if (values.designPlaceLogoScale !== undefined)
    updates.push({ key: "designPlaceLogoScale", value: String(intSetting(String(values.designPlaceLogoScale), DESIGN_DEFAULTS.designPlaceLogoScale, 60, 180)) });
  const designLayoutFields: Array<[keyof typeof DESIGN_DEFAULTS, unknown, number, number]> = [
    ["designCardOpacity", values.designCardOpacity, 0, 100],
    ["designCardWidth", values.designCardWidth, 0, 100],
    ["designCardHeight", values.designCardHeight, 0, 800],
    ["designBoxOpacity", values.designBoxOpacity, 0, 100],
    ["designBoxWidth", values.designBoxWidth, 0, 100],
    ["designBoxHeight", values.designBoxHeight, 0, 800],
    ["designFieldOpacity", values.designFieldOpacity, 0, 100],
    ["designFieldWidth", values.designFieldWidth, 0, 100],
    ["designFieldHeight", values.designFieldHeight, 0, 100],
    ["designButtonOpacity", values.designButtonOpacity, 0, 100],
    ["designButtonWidth", values.designButtonWidth, 0, 100],
    ["designButtonHeight", values.designButtonHeight, 0, 100],
  ];
  for (const [key, value, min, max] of designLayoutFields) {
    if (value !== undefined) {
      updates.push({
        key,
        value: String(intSetting(String(value), Number(DESIGN_DEFAULTS[key]), min, max)),
      });
    }
    const loginBannerTextFields: Array<[keyof AdminSettingInput, string, string, number]> = [
      ["designLoginBannerTitle", "designLoginBannerTitle", DESIGN_DEFAULTS.designLoginBannerTitle, 60],
      ["designLoginBannerSubtitleAr", "designLoginBannerSubtitleAr", DESIGN_DEFAULTS.designLoginBannerSubtitleAr, 120],
      ["designLoginBannerSubtitleEn", "designLoginBannerSubtitleEn", DESIGN_DEFAULTS.designLoginBannerSubtitleEn, 120],
      ["designLoginBannerLogo", "designLoginBannerLogo", DESIGN_DEFAULTS.designLoginBannerLogo, 4],
    ];
    for (const [inputKey, storageKey, fallback, maxLength] of loginBannerTextFields) {
      const value = values[inputKey];
      if (value !== undefined) updates.push({ key: storageKey, value: cleanText(value, fallback, maxLength) });
    }
    const loginBannerColors: Array<[keyof AdminSettingInput, string]> = [
      ["designLoginBannerStartColor", "designLoginBannerStartColor"],
      ["designLoginBannerEndColor", "designLoginBannerEndColor"],
      ["designLoginBannerTextColor", "designLoginBannerTextColor"],
    ];
    for (const [inputKey, storageKey] of loginBannerColors) {
      const value = values[inputKey];
      if (value !== undefined) {
        const fallback = DESIGN_DEFAULTS[storageKey as keyof typeof DESIGN_DEFAULTS] as string;
        updates.push({ key: storageKey, value: cleanHexColor(value, fallback) });
      }
    }
    const loginBannerNumberFields: Array<[keyof AdminSettingInput, string, number, number, number]> = [
      ["designLoginBannerHeight", "designLoginBannerHeight", DESIGN_DEFAULTS.designLoginBannerHeight, 120, 700],
      ["designLoginBannerRadius", "designLoginBannerRadius", DESIGN_DEFAULTS.designLoginBannerRadius, 0, 180],
      ["designLoginBannerOpacity", "designLoginBannerOpacity", DESIGN_DEFAULTS.designLoginBannerOpacity, 0, 100],
    ];
    for (const [inputKey, storageKey, fallback, min, max] of loginBannerNumberFields) {
      const value = values[inputKey];
      if (value !== undefined) updates.push({ key: storageKey, value: String(intSetting(String(value), fallback, min, max)) });
    }
    if (values.designLoginBannerShowLogo !== undefined)
      updates.push({ key: "designLoginBannerShowLogo", value: boolSetting(String(values.designLoginBannerShowLogo), true) ? "true" : "false" });
    if (values.designLoginBannerImageEnabled !== undefined)
      updates.push({ key: "designLoginBannerImageEnabled", value: boolSetting(String(values.designLoginBannerImageEnabled), false) ? "true" : "false" });
    if (values.designLoginBannerImageUrl !== undefined)
      updates.push({ key: "designLoginBannerImageUrl", value: cleanLoginBannerImageUrl(values.designLoginBannerImageUrl) });
    if (values.designLoginBannerContentAlign !== undefined)
      updates.push({
        key: "designLoginBannerContentAlign",
        value: ["start", "center", "end"].includes(String(values.designLoginBannerContentAlign))
          ? String(values.designLoginBannerContentAlign)
          : DESIGN_DEFAULTS.designLoginBannerContentAlign,
      });
  }
  if (values.designPopupEnabled !== undefined)
    updates.push({ key: "designPopupEnabled", value: boolSetting(String(values.designPopupEnabled), false) ? "true" : "false" });
  if (values.designPopupTitle !== undefined)
    updates.push({ key: "designPopupTitle", value: cleanText(values.designPopupTitle, "", 120) });
  if (values.designPopupText !== undefined)
    updates.push({ key: "designPopupText", value: cleanText(values.designPopupText, "", 600) });
  if (values.designPopupImageUrl !== undefined)
    updates.push({ key: "designPopupImageUrl", value: cleanPopupImageUrl(values.designPopupImageUrl) });
  if (values.designPopupLinkUrl !== undefined)
    updates.push({ key: "designPopupLinkUrl", value: cleanHttpsUrl(values.designPopupLinkUrl) });
  if (values.designPopupAudience !== undefined)
    updates.push({ key: "designPopupAudience", value: ["all", "selected"].includes(String(values.designPopupAudience)) ? String(values.designPopupAudience) : "all" });
  if (values.designPopupUserIds !== undefined)
    updates.push({ key: "designPopupUserIds", value: cleanCardNumberList(values.designPopupUserIds) });
  if (values.designCardBackLine1 !== undefined)
    updates.push({ key: "designCardBackLine1", value: cleanText(values.designCardBackLine1, DESIGN_DEFAULTS.designCardBackLine1, 120) });
  if (values.designCardBackLine2 !== undefined)
    updates.push({ key: "designCardBackLine2", value: cleanText(values.designCardBackLine2, DESIGN_DEFAULTS.designCardBackLine2, 120) });
  if (values.designCardBackBrand !== undefined)
    updates.push({ key: "designCardBackBrand", value: cleanText(values.designCardBackBrand, DESIGN_DEFAULTS.designCardBackBrand, 40) });
  if (values.designCardBackUrl !== undefined)
    updates.push({ key: "designCardBackUrl", value: cleanCardBackUrl(values.designCardBackUrl) });
  if (values.designArrivalEnabled !== undefined)
    updates.push({ key: "designArrivalEnabled", value: boolSetting(String(values.designArrivalEnabled), true) ? "true" : "false" });
  if (values.designArrivalCustomColors !== undefined)
    updates.push({ key: "designArrivalCustomColors", value: boolSetting(String(values.designArrivalCustomColors), false) ? "true" : "false" });
  const arrivalNumberFields: Array<[keyof AdminSettingInput, string, number, number, number]> = [
    ["designArrivalBannerMaxWidth", "designArrivalBannerMaxWidth", DESIGN_DEFAULTS.designArrivalBannerMaxWidth, 40, 100],
    ["designArrivalBannerRadius", "designArrivalBannerRadius", DESIGN_DEFAULTS.designArrivalBannerRadius, 0, 60],
    ["designArrivalPaddingY", "designArrivalPaddingY", DESIGN_DEFAULTS.designArrivalPaddingY, 0, 80],
    ["designArrivalTileWidth", "designArrivalTileWidth", DESIGN_DEFAULTS.designArrivalTileWidth, 80, 280],
    ["designArrivalTileHeight", "designArrivalTileHeight", DESIGN_DEFAULTS.designArrivalTileHeight, 50, 200],
    ["designArrivalTileRadius", "designArrivalTileRadius", DESIGN_DEFAULTS.designArrivalTileRadius, 0, 40],
    ["designArrivalTileGap", "designArrivalTileGap", DESIGN_DEFAULTS.designArrivalTileGap, 4, 40],
  ];
  for (const [inputKey, storageKey, fallback, min, max] of arrivalNumberFields) {
    const value = values[inputKey];
    if (value !== undefined) updates.push({ key: storageKey, value: String(intSetting(String(value), fallback, min, max)) });
  }
  const arrivalColorFields: Array<[keyof AdminSettingInput, string]> = [
    ["designArrivalBannerBg", "designArrivalBannerBg"],
    ["designArrivalBannerBorder", "designArrivalBannerBorder"],
    ["designArrivalTitleColor", "designArrivalTitleColor"],
    ["designArrivalSubtitleColor", "designArrivalSubtitleColor"],
    ["designArrivalTileBg", "designArrivalTileBg"],
    ["designArrivalTileBorder", "designArrivalTileBorder"],
    ["designArrivalNameColor", "designArrivalNameColor"],
  ];
  for (const [inputKey, storageKey] of arrivalColorFields) {
    const value = values[inputKey];
    if (value !== undefined) {
      const fallback = DESIGN_DEFAULTS[storageKey as keyof typeof DESIGN_DEFAULTS] as string;
      updates.push({ key: storageKey, value: cleanHexColor(value, fallback) });
    }
  }
  if (values.uiTextOverrides !== undefined)
    updates.push({ key: "uiTextOverrides", value: cleanUiTextOverrides(values.uiTextOverrides) });
  if (values.designBackgroundImageUrl !== undefined)
    updates.push({
      key: "designBackgroundImageUrl",
      value: cleanBackgroundImageUrl(values.designBackgroundImageUrl),
    });
  if (values.designBackgroundImageEnabled !== undefined)
    updates.push({
      key: "designBackgroundImageEnabled",
      value: boolSetting(String(values.designBackgroundImageEnabled), false)
        ? "true"
        : "false",
    });
  if (values.designBackgroundSize !== undefined)
    updates.push({
      key: "designBackgroundSize",
      value: ["cover", "contain", "auto"].includes(
        String(values.designBackgroundSize),
      )
        ? String(values.designBackgroundSize)
        : DESIGN_DEFAULTS.designBackgroundSize,
    });
  if (values.designBackgroundOverlay !== undefined)
    updates.push({
      key: "designBackgroundOverlay",
      value: String(
        intSetting(
          String(values.designBackgroundOverlay),
          DESIGN_DEFAULTS.designBackgroundOverlay,
          0,
          90,
        ),
      ),
    });

  if (values.securityAlertWebhookUrl !== undefined) {
    const raw = String(values.securityAlertWebhookUrl || "").trim();
    const url = normalizeSecurityWebhookUrl(raw);
    if (raw && !url)
      throw new Error(
        "رابط الـ Webhook غير صالح. استخدم رابط HTTPS عام مثل https://webhook.site/...",
      );
    updates.push({ key: WEBHOOK_URL_KEY, value: url ? encryptValue(url) : "" });
  }
  if (values.securityAlertWebhookToken !== undefined) {
    const token = String(values.securityAlertWebhookToken || "")
      .trim()
      .slice(0, 1000);
    updates.push({
      key: WEBHOOK_TOKEN_KEY,
      value: token ? encryptValue(token) : "",
    });
  }
  if (values.securityAlertEmailTo !== undefined) {
    const raw = String(values.securityAlertEmailTo || "").trim();
    const recipients = normalizeSecurityAlertEmails(raw);
    if (recipients === null)
      throw new Error(
        "اكتب بريدًا إلكترونيًا صحيحًا أو أكثر مفصولين بفاصلة، بحد أقصى 5 عناوين.",
      );
    updates.push({
      key: EMAIL_TO_KEY,
      value: recipients.length > 0 ? encryptValue(recipients.join(",")) : "",
    });
  }

  for (const item of updates) {
    await prisma.appSetting.upsert({
      where: { key: item.key },
      update: { value: item.value },
      create: item,
    });
  }
  return getAdminSettings();
}

export async function saveCardTemplateUrl(url: string) {
  const value = cleanCardTemplateUrl(url);
  await prisma.appSetting.upsert({
    where: { key: "cardTemplateUrl" },
    update: { value },
    create: { key: "cardTemplateUrl", value },
  });
  return getAdminSettings();
}
