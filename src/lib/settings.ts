import { prisma } from "./prisma";
import { CARD_TEMPLATE } from "./card-layout";
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

const DESIGN_DEFAULTS = {
  designPrimaryColor: "#1E9A96",
  designSecondaryColor: "#2E52F2",
  designAccentColor: "#53A69A",
  designBackgroundColor: "#FFFFFF",
  designSurfaceColor: "#FFFFFF",
  designTextColor: "#101319",
  designMutedTextColor: "#5F6875",
  designButtonTextColor: "#FFFFFF",
  designInputBackgroundColor: "#FFFFFF",
  designSuccessColor: "#16864A",
  designDangerColor: "#D93939",
  designFontFamily: "IBM Plex Sans Arabic",
  designHeadingFontFamily: "IBM Plex Sans Arabic",
  designButtonFontFamily: "IBM Plex Sans Arabic",
  designFontWeight: 700,
  designHeadingWeight: 900,
  designButtonWeight: 800,
  designFontStyle: "normal",
  designHeadingStyle: "normal",
  designButtonStyle: "normal",
  designBodyFontSize: 16,
  designH1FontSize: 38,
  designH2FontSize: 30,
  designH3FontSize: 24,
  designCardTitleFontSize: 19,
  designButtonFontSize: 15,
  designInputFontSize: 15,
  designNavFontSize: 15,
  designCaptionFontSize: 12,
  designLineHeightPercent: 170,
  designLetterSpacing: 0,
  designButtonRadius: 14,
  designCardRadius: 24,
  designInputRadius: 14,
  designButtonShadow: 14,
  designButtonPaddingX: 18,
  designPlaceLogoScale: 100,
  designBackgroundImageUrl: "",
  designBackgroundImageEnabled: false,
  designBackgroundSize: "cover",
  designBackgroundOverlay: 12,
};

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
      if (count >= 200) break;
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
    templateUrl: cleanCardTemplateUrl(map.cardTemplateUrl),
    qr: {
      x: intSetting(map.cardQrX, CARD_TEMPLATE.qr.x, 900, 1350),
      y: intSetting(map.cardQrY, CARD_TEMPLATE.qr.y, 330, 670),
      size: intSetting(map.cardQrSize, CARD_TEMPLATE.qr.size, 120, 330),
    },
    expiry: {
      ...CARD_TEMPLATE.expiry,
      x: intSetting(map.cardExpiryX, CARD_TEMPLATE.expiry.x, 20, 520),
      y: intSetting(map.cardExpiryY, CARD_TEMPLATE.expiry.y, 770, 930),
      fontSize: intSetting(
        map.cardExpiryFontSize,
        CARD_TEMPLATE.expiry.fontSize,
        12,
        42,
      ),
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
    cardTemplateUrl: cardLayout.templateUrl,
    cardQrX: cardLayout.qr.x,
    cardQrY: cardLayout.qr.y,
    cardQrSize: cardLayout.qr.size,
    cardExpiryX: cardLayout.expiry.x,
    cardExpiryY: cardLayout.expiry.y,
    cardExpiryFontSize: cardLayout.expiry.fontSize,
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
  cardQrX?: unknown;
  cardQrY?: unknown;
  cardQrSize?: unknown;
  cardExpiryX?: unknown;
  cardExpiryY?: unknown;
  cardExpiryFontSize?: unknown;
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
  uiTextOverrides?: unknown;
  designBackgroundImageUrl?: unknown;
  designBackgroundImageEnabled?: unknown;
  designBackgroundSize?: unknown;
  designBackgroundOverlay?: unknown;
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
  if (values.cardQrX !== undefined)
    updates.push({
      key: "cardQrX",
      value: String(
        intSetting(String(values.cardQrX), CARD_TEMPLATE.qr.x, 900, 1350),
      ),
    });
  if (values.cardQrY !== undefined)
    updates.push({
      key: "cardQrY",
      value: String(
        intSetting(String(values.cardQrY), CARD_TEMPLATE.qr.y, 330, 670),
      ),
    });
  if (values.cardQrSize !== undefined)
    updates.push({
      key: "cardQrSize",
      value: String(
        intSetting(String(values.cardQrSize), CARD_TEMPLATE.qr.size, 120, 330),
      ),
    });
  if (values.cardExpiryX !== undefined)
    updates.push({
      key: "cardExpiryX",
      value: String(
        intSetting(String(values.cardExpiryX), CARD_TEMPLATE.expiry.x, 20, 520),
      ),
    });
  if (values.cardExpiryY !== undefined)
    updates.push({
      key: "cardExpiryY",
      value: String(
        intSetting(
          String(values.cardExpiryY),
          CARD_TEMPLATE.expiry.y,
          770,
          930,
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
          12,
          42,
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
