import path from 'path';
import { readFile } from 'fs/promises';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import QRCode from 'qrcode';
import { CARD_TEMPLATE, type CardRenderLayout, cardQrPayload, formatCardExpiry, membershipLabel } from './card-layout';

export async function generateCardQrBuffer(cardNumber: string, publicOrigin?: string): Promise<Buffer> {
  return QRCode.toBuffer(cardQrPayload(cardNumber, publicOrigin), {
    type: 'png',
    errorCorrectionLevel: 'H',
    margin: 0,
    width: 360,
    color: { dark: '#f2c15f', light: '#090b10' }
  });
}

function fitTextSize(font: any, text: string, maxWidth: number, preferredSize: number) {
  let size = preferredSize;
  while (size > 10 && font.widthOfTextAtSize(text, size) > maxWidth) size -= 1;
  return size;
}

function drawCenteredTextInBox(page: any, font: any, text: string, box: { x: number; y: number; width: number; height: number; fontSize: number; opacity?: number }, pageHeight: number, options?: { letterSpacing?: number }) {
  const fontSize = fitTextSize(font, text, box.width - 28, box.fontSize);
  const textWidth = font.widthOfTextAtSize(text, fontSize);
  const textHeight = font.heightAtSize(fontSize);
  const textX = box.x + (box.width - textWidth) / 2;
  const textY = pageHeight - box.y - ((box.height - textHeight) / 2) - textHeight + 4;
  page.drawText(text, { x: textX, y: textY, size: fontSize, font, color: rgb(0.96, 0.78, 0.42), characterSpacing: options?.letterSpacing || 0, opacity: box.opacity ?? 1 });
}

function drawLeftTextInBox(page: any, font: any, text: string, box: { x: number; y: number; width: number; height: number; fontSize: number; opacity?: number }, pageHeight: number) {
  const fontSize = fitTextSize(font, text, box.width, box.fontSize);
  const textHeight = font.heightAtSize(fontSize);
  const textY = pageHeight - box.y - ((box.height - textHeight) / 2) - textHeight + 4;
  page.drawText(text, { x: box.x, y: textY, size: fontSize, font, color: rgb(0.96, 0.78, 0.42), opacity: box.opacity ?? 1 });
}

export async function drawMemberCardPage(
  pdf: PDFDocument,
  cardNumber: string,
  options?: { isVip?: boolean; membershipClass?: string | null; validUntil?: string | Date | null; layout?: CardRenderLayout; publicOrigin?: string }
) {
  const tpl = options?.layout || CARD_TEMPLATE;
  const templateUrl = tpl.templateUrl || '/card-template.png';
  const safeTemplateUrl = templateUrl.startsWith('/') ? templateUrl.slice(1) : templateUrl;
  let templatePath = path.join(process.cwd(), 'public', safeTemplateUrl);
  let templateBytes: Buffer;
  try {
    templateBytes = await readFile(templatePath);
  } catch {
    templatePath = path.join(process.cwd(), 'public', 'card-template.png');
    templateBytes = await readFile(templatePath);
  }
  const qrBytes = await generateCardQrBuffer(cardNumber, options?.publicOrigin);

  const ext = path.extname(templatePath).toLowerCase();
  const image = ext === '.jpg' || ext === '.jpeg' ? await pdf.embedJpg(templateBytes) : await pdf.embedPng(templateBytes);
  const qr = await pdf.embedPng(qrBytes);
  const page = pdf.addPage([tpl.width, tpl.height]);

  page.drawImage(image, { x: 0, y: 0, width: tpl.width, height: tpl.height, opacity: tpl.templateOpacity ?? 1 });

  const qrY = tpl.height - tpl.qr.y - tpl.qr.size;
  page.drawImage(qr, { x: tpl.qr.x, y: qrY, width: tpl.qr.size, height: tpl.qr.size, opacity: tpl.qr.opacity ?? 1 });

  const font = await pdf.embedFont(StandardFonts.HelveticaBold);
  drawCenteredTextInBox(page, font, `ID NO.${cardNumber}`, tpl.id, tpl.height, { letterSpacing: 1.5 });

  const classText = membershipLabel(options?.membershipClass, options?.isVip);
  if (classText) drawLeftTextInBox(page, font, classText, tpl.membershipClass, tpl.height);

  const expiryText = formatCardExpiry(options?.validUntil);
  if (expiryText) drawLeftTextInBox(page, font, expiryText, tpl.expiry, tpl.height);
}

export async function createMemberCardPdfBuffer(cardNumber: string, options?: { isVip?: boolean; membershipClass?: string | null; validUntil?: string | Date | null; layout?: CardRenderLayout; publicOrigin?: string }): Promise<Buffer> {
  const pdf = await PDFDocument.create();
  await drawMemberCardPage(pdf, cardNumber, options);
  return Buffer.from(await pdf.save());
}

export async function createBulkCardsPdfBuffer(users: { cardNumber: string; isVip?: boolean; membershipClass?: string | null; validUntil?: string | Date | null }[], layout?: CardRenderLayout, publicOrigin?: string): Promise<Buffer> {
  const tpl = layout || CARD_TEMPLATE;
  const pdf = await PDFDocument.create();

  // Embed the shared template image and font ONCE (not per page) so large
  // batches do not blow up memory with thousands of duplicate embeds.
  const templateUrl = tpl.templateUrl || '/card-template.png';
  const safeTemplateUrl = templateUrl.startsWith('/') ? templateUrl.slice(1) : templateUrl;
  let templateBytes: Buffer;
  let templatePath = path.join(process.cwd(), 'public', safeTemplateUrl);
  try {
    templateBytes = await readFile(templatePath);
  } catch {
    templatePath = path.join(process.cwd(), 'public', 'card-template.png');
    templateBytes = await readFile(templatePath);
  }
  const ext = path.extname(templatePath).toLowerCase();
  const image = ext === '.jpg' || ext === '.jpeg' ? await pdf.embedJpg(templateBytes) : await pdf.embedPng(templateBytes);
  const font = await pdf.embedFont(StandardFonts.HelveticaBold);

  for (const user of users) {
    const qr = await pdf.embedPng(await generateCardQrBuffer(user.cardNumber, publicOrigin));
    const page = pdf.addPage([tpl.width, tpl.height]);
    page.drawImage(image, { x: 0, y: 0, width: tpl.width, height: tpl.height, opacity: tpl.templateOpacity ?? 1 });
    const qrY = tpl.height - tpl.qr.y - tpl.qr.size;
    page.drawImage(qr, { x: tpl.qr.x, y: qrY, width: tpl.qr.size, height: tpl.qr.size, opacity: tpl.qr.opacity ?? 1 });
    drawCenteredTextInBox(page, font, `ID NO.${user.cardNumber}`, tpl.id, tpl.height, { letterSpacing: 1.5 });
    const classText = membershipLabel(user.membershipClass, user.isVip);
    if (classText) drawLeftTextInBox(page, font, classText, tpl.membershipClass, tpl.height);
    const expiryText = formatCardExpiry(user.validUntil);
    if (expiryText) drawLeftTextInBox(page, font, expiryText, tpl.expiry, tpl.height);
  }
  return Buffer.from(await pdf.save());
}

// --- Card back (NO.<cardNumber> drawn on the baked card-back.png) ---

const BACK_WIDTH = 1573;
const BACK_HEIGHT = 1000;
export type BackNumberConfig = { x: number; y: number; size: number; opacity: number };
const DEFAULT_BACK_NUMBER: BackNumberConfig = { x: 1292, y: 896, size: 34, opacity: 100 };

async function readCardBackBytes(backImageUrl?: string): Promise<Buffer> {
  const url = String(backImageUrl || '').trim();
  if (url.startsWith('/uploads/')) {
    try {
      const { uploadsRoot } = await import('./uploads');
      const relative = url.replace(/^\/uploads\//, '');
      return await readFile(path.join(uploadsRoot(), relative));
    } catch {
      // fall through to the bundled default
    }
  }
  return readFile(path.join(process.cwd(), 'public', 'card-back.png'));
}

export async function drawMemberCardBackPage(pdf: PDFDocument, cardNumber: string, backBytes: Buffer, num: BackNumberConfig = DEFAULT_BACK_NUMBER) {
  const image = await pdf.embedPng(backBytes);
  const page = pdf.addPage([BACK_WIDTH, BACK_HEIGHT]);
  page.drawImage(image, { x: 0, y: 0, width: BACK_WIDTH, height: BACK_HEIGHT });
  const font = await pdf.embedFont(StandardFonts.HelveticaBold);
  // Box centered on the configured number position.
  const box = { x: num.x - 250, y: num.y - (num.size + 20) / 2, width: 500, height: num.size + 20, fontSize: num.size, opacity: Math.max(0, Math.min(100, num.opacity)) / 100 };
  drawCenteredTextInBox(page, font, `NO.${cardNumber}`, box, BACK_HEIGHT, { letterSpacing: 2.4 });
}

export async function createMemberCardBackPdfBuffer(cardNumber: string, backImageUrl?: string, num?: BackNumberConfig): Promise<Buffer> {
  const pdf = await PDFDocument.create();
  await drawMemberCardBackPage(pdf, cardNumber, await readCardBackBytes(backImageUrl), num);
  return Buffer.from(await pdf.save());
}

export async function createBulkBackCardsPdfBuffer(users: { cardNumber: string }[], backImageUrl?: string, num: BackNumberConfig = DEFAULT_BACK_NUMBER): Promise<Buffer> {
  const pdf = await PDFDocument.create();
  const backBytes = await readCardBackBytes(backImageUrl);
  // Embed the back image + font ONCE and reuse across all pages.
  const image = await pdf.embedPng(backBytes);
  const font = await pdf.embedFont(StandardFonts.HelveticaBold);
  const box = { x: num.x - 250, y: num.y - (num.size + 20) / 2, width: 500, height: num.size + 20, fontSize: num.size, opacity: Math.max(0, Math.min(100, num.opacity)) / 100 };
  for (const user of users) {
    const page = pdf.addPage([BACK_WIDTH, BACK_HEIGHT]);
    page.drawImage(image, { x: 0, y: 0, width: BACK_WIDTH, height: BACK_HEIGHT });
    drawCenteredTextInBox(page, font, `NO.${user.cardNumber}`, box, BACK_HEIGHT, { letterSpacing: 2.4 });
  }
  return Buffer.from(await pdf.save());
}
