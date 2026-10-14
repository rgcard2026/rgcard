import path from 'path';
import { readFile } from 'fs/promises';
import { createCanvas, loadImage, GlobalFonts } from '@napi-rs/canvas';
import { uploadsRoot } from './uploads';

export type CardBackLine = { text: string; y: number; size: number; opacity: number; color: string };
export type CardBackOptions = {
  baseImageUrl?: string; // uploaded back template (/uploads/design-card-back/... ) else bundled base
  line1: CardBackLine;
  line2: CardBackLine;
  brand: CardBackLine;
};

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
    // falls back to a default font if registration fails
  }
  fontsRegistered = true;
}

function hexToRgba(hex: string, opacity: number) {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || '').trim());
  const int = m ? parseInt(m[1], 16) : 0xf3dba4;
  const r = (int >> 16) & 255, g = (int >> 8) & 255, b = int & 255;
  const a = Math.max(0, Math.min(100, Number(opacity))) / 100;
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

async function loadBaseImage(baseImageUrl?: string) {
  const url = String(baseImageUrl || '').trim();
  if (url.startsWith('/uploads/')) {
    try {
      return await loadImage(await readFile(path.join(uploadsRoot(), url.replace(/^\/uploads\//, ''))));
    } catch {
      // fall through to the bundled base
    }
  }
  return loadImage(await readFile(path.join(process.cwd(), 'public', 'card-back-base.png')));
}

/**
 * Draws the editable membership text onto the back base image and returns a PNG
 * buffer. Arabic renders with the bundled Amiri font so it shapes correctly on
 * any platform.
 */
export async function generateCardBackPng(options: CardBackOptions): Promise<Buffer> {
  registerFonts();
  const base = await loadBaseImage(options.baseImageUrl);
  const canvas = createCanvas(W, H);
  const x = canvas.getContext('2d');
  x.drawImage(base, 0, 0, W, H);
  x.textAlign = 'center';
  x.textBaseline = 'middle';

  const draw = (line: CardBackLine, rtl: boolean, bold: boolean) => {
    const text = (line.text ?? '').trim();
    if (!text) return;
    x.direction = rtl ? 'rtl' : 'ltr';
    x.fillStyle = hexToRgba(line.color, line.opacity);
    x.font = `${bold ? '700' : '400'} ${Math.max(8, Math.round(line.size))}px ${bold ? 'AmiriBold, Amiri' : 'Amiri'}, "Segoe UI", Tahoma, sans-serif`;
    x.fillText(text, W / 2, Math.round(line.y));
  };

  draw(options.line1, true, true);
  draw(options.line2, true, false);
  draw(options.brand, false, true);

  return canvas.encode('png');
}
