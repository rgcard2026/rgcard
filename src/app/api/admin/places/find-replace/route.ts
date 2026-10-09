import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { badRequest, forbidden, json, requireApiSession, unauthorized } from '@/lib/api';
import { adminHasPermission } from '@/lib/admin-auth';
import { writeAuditLog } from '@/lib/audit';

type Scope = 'places' | 'offers' | 'both';
type FieldScope = 'descriptions' | 'notes' | 'both';

type Replacement = {
  id: number;
  data: { description?: string; exclusiveText?: string; bannerText?: string };
  occurrences: number;
  descriptionOccurrences: number;
  noteOccurrences: number;
};

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function replaceOccurrences(value: string | null, find: string, replacement: string, caseSensitive: boolean) {
  if (!value) return { nextValue: value, occurrences: 0 };
  const expression = new RegExp(escapeRegExp(find), caseSensitive ? 'g' : 'gi');
  let occurrences = 0;
  const nextValue = value.replace(expression, () => {
    occurrences += 1;
    return replacement;
  });
  return { nextValue, occurrences };
}

function isUnsafeInput(value: string) {
  return /<\s*script|javascript:|on(?:error|load|click|focus)\s*=/i.test(value);
}

export async function POST(request: NextRequest) {
  const admin = await requireApiSession(request, 'admin');
  if (!admin) return unauthorized();
  if (!(await adminHasPermission(admin, 'PLACES'))) return forbidden('ليس لديك صلاحية تعديل الأماكن والعروض');

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return badRequest('بيانات الطلب غير صحيحة');
  }

  const find = String(body.find ?? '').trim();
  const replacement = String(body.replace ?? '').slice(0, 800);
  const scope = body.scope === 'places' || body.scope === 'offers' || body.scope === 'both' ? body.scope as Scope : 'both';
  const fields = body.fields === 'descriptions' || body.fields === 'notes' || body.fields === 'both' ? body.fields as FieldScope : 'both';
  const caseSensitive = Boolean(body.caseSensitive);
  const dryRun = Boolean(body.dryRun);

  if (!find) return badRequest('أدخل النص المطلوب البحث عنه');
  if (find.length > 200) return badRequest('نص البحث طويل جدًا');
  if (isUnsafeInput(find) || isUnsafeInput(replacement)) {
    return forbidden('تم رفض النص لاحتوائه على محتوى غير آمن');
  }

  const placeChanges: Replacement[] = [];
  const offerChanges: Replacement[] = [];

  if (scope === 'places' || scope === 'both') {
    const places = await prisma.place.findMany({ select: { id: true, description: true, exclusiveText: true } });
    for (const place of places) {
      const descriptionResult = fields === 'notes'
        ? { nextValue: place.description, occurrences: 0 }
        : replaceOccurrences(place.description, find, replacement, caseSensitive);
      const noteResult = fields === 'descriptions'
        ? { nextValue: place.exclusiveText, occurrences: 0 }
        : replaceOccurrences(place.exclusiveText, find, replacement, caseSensitive);

      const occurrences = descriptionResult.occurrences + noteResult.occurrences;
      if (!occurrences) continue;

      const data: Replacement['data'] = {};
      if (descriptionResult.occurrences > 0 && descriptionResult.nextValue !== null) data.description = descriptionResult.nextValue.slice(0, 800);
      if (noteResult.occurrences > 0 && noteResult.nextValue !== null) data.exclusiveText = noteResult.nextValue.slice(0, 180);
      placeChanges.push({
        id: place.id,
        data,
        occurrences,
        descriptionOccurrences: descriptionResult.occurrences,
        noteOccurrences: noteResult.occurrences
      });
    }
  }

  if (scope === 'offers' || scope === 'both') {
    const offers = await prisma.offer.findMany({ select: { id: true, description: true, bannerText: true } });
    for (const offer of offers) {
      const descriptionResult = fields === 'notes'
        ? { nextValue: offer.description, occurrences: 0 }
        : replaceOccurrences(offer.description, find, replacement, caseSensitive);
      const noteResult = fields === 'descriptions'
        ? { nextValue: offer.bannerText, occurrences: 0 }
        : replaceOccurrences(offer.bannerText, find, replacement, caseSensitive);

      const occurrences = descriptionResult.occurrences + noteResult.occurrences;
      if (!occurrences) continue;

      const data: Replacement['data'] = {};
      if (descriptionResult.occurrences > 0 && descriptionResult.nextValue !== null) data.description = descriptionResult.nextValue.slice(0, 800);
      if (noteResult.occurrences > 0 && noteResult.nextValue !== null) data.bannerText = noteResult.nextValue.slice(0, 180);
      offerChanges.push({
        id: offer.id,
        data,
        occurrences,
        descriptionOccurrences: descriptionResult.occurrences,
        noteOccurrences: noteResult.occurrences
      });
    }
  }

  const summarize = (changes: Replacement[]) => ({
    records: changes.length,
    occurrences: changes.reduce((total, item) => total + item.occurrences, 0),
    descriptions: changes.reduce((total, item) => total + item.descriptionOccurrences, 0),
    notes: changes.reduce((total, item) => total + item.noteOccurrences, 0)
  });
  const summary = {
    places: summarize(placeChanges),
    offers: summarize(offerChanges)
  };
  const totalRecords = summary.places.records + summary.offers.records;
  const totalOccurrences = summary.places.occurrences + summary.offers.occurrences;
  const fieldOccurrences = {
    descriptions: summary.places.descriptions + summary.offers.descriptions,
    notes: summary.places.notes + summary.offers.notes
  };

  if (dryRun) {
    return json({ ok: true, data: { ...summary, totalRecords, totalOccurrences, fieldOccurrences } });
  }

  if (body.confirmation !== 'REPLACE_CONTENT' && body.confirmation !== 'REPLACE_DESCRIPTIONS') {
    return badRequest('يلزم تأكيد الاستبدال قبل تطبيق التغييرات');
  }

  if (totalRecords) {
    await prisma.$transaction([
      ...placeChanges.map((item) => prisma.place.update({ where: { id: item.id }, data: item.data as any })),
      ...offerChanges.map((item) => prisma.offer.update({ where: { id: item.id }, data: item.data as any }))
    ]);
  }

  await writeAuditLog(request, 'ADMIN_FIND_REPLACE_CONTENT', { adminId: admin.sub }, {
    scope,
    fields,
    caseSensitive,
    placeRecords: summary.places.records,
    offerRecords: summary.offers.records,
    descriptionOccurrences: fieldOccurrences.descriptions,
    noteOccurrences: fieldOccurrences.notes,
    totalOccurrences
  });

  return json({
    ok: true,
    message: 'تم تطبيق الاستبدال بنجاح',
    data: { ...summary, totalRecords, totalOccurrences, fieldOccurrences }
  });
}
