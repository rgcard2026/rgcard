import { createCanvas, loadImage } from '@napi-rs/canvas';

/**
 * Trims a uniform (transparent or solid-colour) border around a logo so it
 * fills its frame when displayed with object-fit: contain. Returns a PNG buffer
 * when it trimmed something, or null to keep the original upload untouched
 * (nothing to trim, or the image could not be processed).
 */
export async function autoFitLogo(input: Buffer): Promise<Buffer | null> {
  try {
    const img = await loadImage(input);
    const W = img.width;
    const H = img.height;
    if (!W || !H || W > 4000 || H > 4000) return null;

    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, W, H);
    const { data } = ctx.getImageData(0, 0, W, H);

    // Background colour sampled from the four corners.
    const cornerIdx = [0, (W - 1) * 4, (H - 1) * W * 4, ((H - 1) * W + (W - 1)) * 4];
    let br = 0, bgc = 0, bb = 0, ba = 0;
    for (const c of cornerIdx) { br += data[c]; bgc += data[c + 1]; bb += data[c + 2]; ba += data[c + 3]; }
    br /= 4; bgc /= 4; bb /= 4; ba /= 4;
    const bgTransparent = ba < 25;
    const COLOR_T = 34;
    const ALPHA_T = 24;

    const isBackground = (i: number) => {
      const a = data[i + 3];
      if (a < ALPHA_T) return true;
      if (bgTransparent) return false;
      return Math.abs(data[i] - br) + Math.abs(data[i + 1] - bgc) + Math.abs(data[i + 2] - bb) < COLOR_T;
    };

    let minX = W, minY = H, maxX = -1, maxY = -1;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        if (!isBackground((y * W + x) * 4)) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }
    if (maxX < minX || maxY < minY) return null;

    // Only bother if there is a meaningful border to remove.
    const meaningful = minX > W * 0.03 || minY > H * 0.03 || maxX < W * 0.97 || maxY < H * 0.97;
    if (!meaningful) return null;

    const pad = Math.round(Math.max(maxX - minX, maxY - minY) * 0.06);
    const sx = Math.max(0, minX - pad);
    const sy = Math.max(0, minY - pad);
    const sw = Math.min(W - 1, maxX + pad) - sx + 1;
    const sh = Math.min(H - 1, maxY + pad) - sy + 1;
    if (sw <= 0 || sh <= 0) return null;

    const out = createCanvas(sw, sh);
    out.getContext('2d').drawImage(canvas, sx, sy, sw, sh, 0, 0, sw, sh);
    return out.encode('png');
  } catch {
    return null;
  }
}
