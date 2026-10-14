import path from 'path';
import { mkdir, writeFile } from 'fs/promises';
import { NextRequest } from 'next/server';
import { uploadsPath } from '@/lib/uploads';
import { json, requireApiSession, unauthorized } from '@/lib/api';
import { saveAdminSettings } from '@/lib/settings';
import { writeAuditLog } from '@/lib/audit';
import { generateCardBackPng, CARD_BACK_DEFAULTS } from '@/lib/card-back-generator';
import { safeString } from '@/lib/security';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const admin = await requireApiSession(request, 'admin');
  if (!admin) return unauthorized();

  const body = await request.json().catch(() => ({}));
  const line1 = safeString(body?.line1 ?? CARD_BACK_DEFAULTS.line1, 120);
  const line2 = safeString(body?.line2 ?? CARD_BACK_DEFAULTS.line2, 120);
  const brand = safeString(body?.brand ?? CARD_BACK_DEFAULTS.brand, 40);

  try {
    const png = await generateCardBackPng({ line1, line2, brand });
    const directory = uploadsPath('design-card-back');
    await mkdir(directory, { recursive: true });
    const filename = `card-back-${Date.now()}.png`;
    await writeFile(path.join(directory, filename), png);
    const designCardBackUrl = `/uploads/design-card-back/${filename}`;
    const data = await saveAdminSettings({
      designCardBackLine1: line1,
      designCardBackLine2: line2,
      designCardBackBrand: brand,
      designCardBackUrl,
    });
    await writeAuditLog(request, 'ADMIN_REGENERATE_CARD_BACK', { adminId: admin.sub }, { designCardBackUrl });
    return json({ ok: true, data, message: 'تم تحديث نص ظهر الكارت بنجاح' });
  } catch (error) {
    console.error('Failed to regenerate card back', error);
    return json({ ok: false, message: 'تعذر توليد ظهر الكارت. حاول مرة أخرى.' }, 500);
  }
}
