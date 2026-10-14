import path from 'path';
import { readFile } from 'fs/promises';
import { createCanvas, loadImage, GlobalFonts } from '@napi-rs/canvas';

export type CardBackText = { line1?: string; line2?: string; brand?: string };

export const CARD_BACK_DEFAULTS = {
  line1: 'بطاقة عضوية شخصية — لا يجوز التنازل عنها',
  line2: 'تُعرض عند الطلب للاستفادة من خصومات أعضاء',
  brand: 'RG-Card',
};

const W = 1573;
const H = 1000;
let fontsRegistered = false;

function registerFonts() {
  if (fontsRegistered) return;
  try {
    const dir = path.join(process.cwd(), 'public', 'fonts');
    GlobalFonts.registerFromPath(path.join(dir, 'Amiri-Regular.ttf'), 'Amiri');
    GlobalFonts.registerFromPath(path.join(dir, 'Amiri-Bold.ttf'), 'AmiriBold');
  } catch {
    // If registration fails the canvas falls back to a default font.
  }
  fontsRegistered = true;
}

/**
 * Draws the editable membership text onto the text-free card back base and
 * returns a PNG buffer. Arabic is rendered with the bundled Amiri font so it
 * shapes correctly on any platform (including the Linux production container).
 */
export async function generateCardBackPng(text: CardBackText): Promise<Buffer> {
  registerFonts();
  const basePath = path.join(process.cwd(), 'public', 'card-back-base.png');
  const base = await loadImage(await readFile(basePath));
  const canvas = createCanvas(W, H);
  const x = canvas.getContext('2d');
  x.drawImage(base, 0, 0, W, H);

  const line1 = (text.line1 ?? CARD_BACK_DEFAULTS.line1).trim();
  const line2 = (text.line2 ?? CARD_BACK_DEFAULTS.line2).trim();
  const brand = (text.brand ?? CARD_BACK_DEFAULTS.brand).trim();

  x.textAlign = 'center';
  x.textBaseline = 'middle';

  if (line1) {
    x.direction = 'rtl';
    x.fillStyle = 'rgba(243, 219, 164, .82)';
    x.font = '700 30px AmiriBold, Amiri, "Segoe UI", Tahoma, sans-serif';
    x.fillText(line1, W / 2, 532);
  }
  if (line2) {
    x.direction = 'rtl';
    x.fillStyle = 'rgba(243, 219, 164, .6)';
    x.font = '400 26px Amiri, "Segoe UI", Tahoma, sans-serif';
    x.fillText(line2, W / 2, 578);
  }
  if (brand) {
    x.direction = 'ltr';
    x.fillStyle = 'rgba(243, 219, 164, .72)';
    x.font = '700 26px AmiriBold, Amiri, "Segoe UI", Tahoma, sans-serif';
    x.fillText(brand, W / 2, 616);
  }

  return canvas.encode('png');
}
