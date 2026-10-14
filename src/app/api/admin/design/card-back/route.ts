import path from 'path';
import { mkdir, writeFile } from 'fs/promises';
import { NextRequest } from 'next/server';
import { uploadsPath } from '@/lib/uploads';
import { json, requireApiSession, unauthorized } from '@/lib/api';
import { getAdminSettings, saveAdminSettings } from '@/lib/settings';
import { writeAuditLog } from '@/lib/audit';
import { generateCardBackPng } from '@/lib/card-back-generator';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const admin = await requireApiSession(request, 'admin');
  if (!admin) return unauthorized();

  const body = await request.json().catch(() => ({}));
  // Persist any back settings sent from the studio first (text + layout + base).
  await saveAdminSettings(body || {});
  // Then read the sanitised, merged settings and render from them.
  const s = await getAdminSettings();

  try {
    const png = await generateCardBackPng({
      baseImageUrl: s.designCardBackImageUrl,
      line1: { text: s.designCardBackLine1, y: s.designCardBackLine1Y, size: s.designCardBackLine1Size, opacity: s.designCardBackLine1Opacity, color: s.designCardBackLine1Color },
      line2: { text: s.designCardBackLine2, y: s.designCardBackLine2Y, size: s.designCardBackLine2Size, opacity: s.designCardBackLine2Opacity, color: s.designCardBackLine2Color },
      brand: { text: s.designCardBackBrand, y: s.designCardBackBrandY, size: s.designCardBackBrandSize, opacity: s.designCardBackBrandOpacity, color: s.designCardBackBrandColor },
    });
    const directory = uploadsPath('design-card-back');
    await mkdir(directory, { recursive: true });
    const filename = `card-back-${Date.now()}.png`;
    await writeFile(path.join(directory, filename), png);
    const designCardBackUrl = `/uploads/design-card-back/${filename}`;
    const data = await saveAdminSettings({ designCardBackUrl });
    await writeAuditLog(request, 'ADMIN_REGENERATE_CARD_BACK', { adminId: admin.sub }, { designCardBackUrl });
    return json({ ok: true, data, message: 'تم تحديث ظهر الكارت بنجاح' });
  } catch (error) {
    console.error('Failed to regenerate card back', error);
    return json({ ok: false, message: 'تعذر توليد ظهر الكارت. حاول مرة أخرى.' }, 500);
  }
}
