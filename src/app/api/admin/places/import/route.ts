import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { badRequest, json, requireApiSession, unauthorized } from '@/lib/api';
import { writeAuditLog } from '@/lib/audit';
import { detectSuspiciousText, safePublicAssetUrl, safeString } from '@/lib/security';

export const dynamic = 'force-dynamic';

// Downloadable import template for places/offers. The governorate value must
// match an existing governorate name exactly; the importer upserts the category.
export async function GET(request: NextRequest) {
  const admin = await requireApiSession(request, 'admin');
  if (!admin) return unauthorized();
  const template = '﻿' + [
    'name,discount,category,description,branchName,governorate,address,phone,mapUrl,exclusiveText',
    'Sea Food Factory,خصم حتى 20%,المطاعم و الكافيهات,وصف اختياري,فرع مدينة نصر,القاهرة,مدينة نصر,01000000001,,عرض حصري',
    'Smile Medical Center,خصم 25%,الخدمات الطبية,,فرع التجمع,القاهرة,التجمع الخامس,01000000005,,'
  ].join('\r\n');
  return new NextResponse(template, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="rg-card-places-import-template.csv"',
      'Cache-Control': 'no-store'
    }
  });
}

type CsvRow = Record<string, string>;

function cleanInvisible(value: string) {
  return value
    .replace(/^\uFEFF/, '')
    .replace(/[\u200B-\u200F\u202A-\u202E\u2066-\u2069]/g, '')
    .trim();
}

function normalizeHeader(value: string) {
  return cleanInvisible(value)
    .toLowerCase()
    .replace(/[\s_-]+/g, ' ')
    .trim();
}

function normalizeLookup(value: string) {
  return cleanInvisible(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u064B-\u065F\u0670]/g, '')
    .replace(/\u0640/g, '')
    .replace(/[إأآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function delimiterCount(line: string, delimiter: string) {
  let quoted = false;
  let count = 0;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"' && quoted && line[index + 1] === '"') {
      index += 1;
      continue;
    }
    if (char === '"') quoted = !quoted;
    else if (!quoted && char === delimiter) count += 1;
  }
  return count;
}

function detectDelimiter(text: string) {
  const headerLine = text.replace(/^\uFEFF/, '').split(/\r?\n/).find((line) => line.trim()) || '';
  const delimiters = [',', ';', '\t'];
  return delimiters
    .map((delimiter) => ({ delimiter, count: delimiterCount(headerLine, delimiter) }))
    .sort((a, b) => b.count - a.count)[0]?.delimiter || ',';
}

function parseDelimitedRows(text: string, delimiter: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;

  const pushCell = () => {
    row.push(cleanInvisible(cell));
    cell = '';
  };
  const pushRow = () => {
    pushCell();
    if (row.some((value) => value.trim())) rows.push(row);
    row = [];
  };

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"' && quoted && next === '"') {
      cell += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (!quoted && char === delimiter) {
      pushCell();
    } else if (!quoted && (char === '\n' || char === '\r')) {
      if (char === '\r' && next === '\n') index += 1;
      pushRow();
    } else {
      cell += char;
    }
  }

  if (cell.length || row.length) pushRow();
  return rows;
}

function parseCsv(text: string) {
  const matrix = parseDelimitedRows(text.replace(/^\uFEFF/, ''), detectDelimiter(text));
  if (matrix.length < 2) return [] as CsvRow[];

  const headers = matrix[0].map(normalizeHeader);
  return matrix.slice(1).map((cells) => {
    const row: CsvRow = {};
    headers.forEach((header, index) => {
      if (header) row[header] = cleanInvisible(cells[index] || '');
    });
    return row;
  });
}

function value(row: CsvRow, keys: string[]) {
  for (const key of keys) {
    const candidate = row[normalizeHeader(key)];
    if (candidate !== undefined && candidate.trim()) return candidate.trim();
  }
  return '';
}

function decodeCsv(bytes: Uint8Array) {
  const utf8 = new TextDecoder('utf-8').decode(bytes);
  const replacementCharacters = (utf8.match(/\uFFFD/g) || []).length;
  if (!replacementCharacters) return { text: utf8, encoding: 'UTF-8' };

  try {
    const windows1256 = new TextDecoder('windows-1256').decode(bytes);
    const fallbackReplacementCharacters = (windows1256.match(/\uFFFD/g) || []).length;
    if (fallbackReplacementCharacters < replacementCharacters) {
      return { text: windows1256, encoding: 'Windows-1256' };
    }
  } catch {
    // The runtime may not expose this legacy decoder; UTF-8 validation below
    // still prevents silently assigning a random/default governorate.
  }

  return { text: utf8, encoding: 'UTF-8 (with invalid bytes)' };
}

export async function POST(request: NextRequest) {
  const admin = await requireApiSession(request, 'admin');
  if (!admin) return unauthorized();

  const form = await request.formData();
  const file = form.get('file');
  if (!file || typeof file === 'string' || typeof file.arrayBuffer !== 'function') return badRequest('CSV file مطلوب');
  if (!file.name.toLowerCase().endsWith('.csv')) return badRequest('ارفع ملف CSV فقط');

  const decoded = decodeCsv(new Uint8Array(await file.arrayBuffer()));
  const rows = parseCsv(decoded.text);
  if (!rows.length) return badRequest('ملف CSV فاضي أو الهيدر غير صحيح');

  const governorates = await prisma.governorate.findMany({ orderBy: { name: 'asc' } }) as Array<{ id: number; name: string }>;
  if (!governorates.length) return badRequest('لا توجد محافظات في قاعدة البيانات');
  const governorateByName = new Map<string, { id: number; name: string }>(governorates.map((governorate) => [normalizeLookup(governorate.name), governorate]));

  let createdPlaces = 0;
  let updatedPlaces = 0;
  let createdBranches = 0;
  let updatedBranches = 0;
  let linkedGovernorates = 0;
  let skipped = 0;
  let skippedBranches = 0;
  let invalidGovernorates = 0;
  const validationErrors: Array<{ row: number; governorate?: string; message: string }> = [];

  for (let rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex];
    const sourceRow = rowIndex + 2;
    const name = value(row, ['placeName', 'name', 'place', 'اسم المكان', 'المكان']);
    const discount = value(row, ['discount', 'discountText', 'نص الخصم', 'الخصم']);
    if (!name || !discount) {
      skipped += 1;
      validationErrors.push({ row: sourceRow, message: 'اسم المكان أو الخصم غير موجود' });
      continue;
    }

    const description = value(row, ['description', 'desc', 'الوصف']);
    const categoryName = value(row, ['category', 'categoryName', 'الفئة', 'التصنيف']) || 'عام';
    const branchName = value(row, ['branchName', 'branch', 'اسم الفرع', 'الفرع']);
    const govName = value(row, ['governorate', 'governorateName', 'gov', 'المحافظة']);
    const address = value(row, ['address', 'العنوان']);
    const phone = value(row, ['phone', 'mobile', 'whatsapp', 'رقم الهاتف', 'التواصل']);
    const mapUrl = value(row, ['mapUrl', 'map', 'location', 'رابط الخريطة']);
    const logoUrl = value(row, ['logoUrl', 'logo', 'رابط اللوجو']);
    const exclusiveText = value(row, ['exclusiveText', 'bannerText', 'notes', 'note', 'الملاحظات', 'ملاحظات', 'ملاحظة', 'نص البانر']);

    const suspicious = detectSuspiciousText({ name, discount, description, categoryName, branchName, govName, address, phone, mapUrl, exclusiveText, logoUrl: undefined });
    if (suspicious) {
      skipped += 1;
      validationErrors.push({ row: sourceRow, message: 'تم رفض الصف لاحتوائه على مدخلات غير آمنة' });
      continue;
    }

    const category = await prisma.category.upsert({
      where: { name: safeString(categoryName, 120) },
      update: {},
      create: { name: safeString(categoryName, 120), icon: 'local_offer' }
    });

    const existing = await prisma.place.findFirst({ where: { name: safeString(name, 180) } });
    let placeId: number;
    if (existing) {
      const data: any = {
        discount: safeString(discount, 80),
        description: description ? safeString(description, 800) : existing.description,
        categoryId: category.id,
        exclusiveText: exclusiveText ? safeString(exclusiveText, 180) : existing.exclusiveText
      };
      const safeLogo = safePublicAssetUrl(logoUrl);
      if (safeLogo) data.logoUrl = safeLogo;
      await prisma.place.update({ where: { id: existing.id }, data });
      await prisma.offer.updateMany({
        where: { placeId: existing.id },
        data: {
          discountText: safeString(discount, 80),
          description: description ? safeString(description, 800) : undefined,
          bannerText: exclusiveText ? safeString(exclusiveText, 180) : undefined
        }
      });
      placeId = existing.id;
      updatedPlaces += 1;
    } else {
      const safeLogo = safePublicAssetUrl(logoUrl);
      const created = await prisma.place.create({
        data: {
          name: safeString(name, 180),
          discount: safeString(discount, 80),
          description: description ? safeString(description, 800) : null,
          logoUrl: safeLogo,
          categoryId: category.id,
          isActive: true,
          isFeatured: false,
          sortOrder: 0,
          exclusiveText: exclusiveText ? safeString(exclusiveText, 180) : null,
          offers: {
            create: {
              title: `عرض ${safeString(name, 160)}`,
              discountText: safeString(discount, 80),
              description: description ? safeString(description, 800) : null,
              isFeatured: false,
              bannerText: exclusiveText ? safeString(exclusiveText, 180) : null
            }
          }
        }
      });
      placeId = created.id;
      createdPlaces += 1;
    }

    const governorate = govName ? governorateByName.get(normalizeLookup(govName)) : undefined;
    if (govName && !governorate) {
      invalidGovernorates += 1;
      if (branchName) skippedBranches += 1;
      validationErrors.push({ row: sourceRow, governorate: govName, message: 'اسم المحافظة غير مطابق لأي محافظة مسجلة' });
      continue;
    }

    if (governorate) {
      await prisma.place.update({
        where: { id: placeId },
        data: { governoratesConfigured: true }
      });
      await prisma.placeGovernorate.upsert({
        where: { placeId_governorateId: { placeId, governorateId: governorate.id } },
        update: {},
        create: { placeId, governorateId: governorate.id }
      });
      linkedGovernorates += 1;
    }

    if (branchName) {
      if (!governorate) {
        skippedBranches += 1;
        validationErrors.push({ row: sourceRow, message: 'تم تجاهل الفرع لأن المحافظة غير موجودة في الصف' });
        continue;
      }
      const safeBranchName = safeString(branchName, 180);
      const existingBranch = await prisma.branch.findFirst({
        where: { placeId, name: safeBranchName },
        orderBy: { id: 'asc' }
      });
      const branchData = {
        governorateId: governorate.id,
        address: address ? safeString(address, 500) : existingBranch?.address || null,
        phone: phone ? safeString(phone, 60) : existingBranch?.phone || null,
        mapUrl: mapUrl ? safeString(mapUrl, 800) : existingBranch?.mapUrl || null
      };
      if (existingBranch) {
        await prisma.branch.update({
          where: { id: existingBranch.id },
          data: branchData
        });
        updatedBranches += 1;
      } else {
        await prisma.branch.create({
          data: {
            placeId,
            name: safeBranchName,
            ...branchData
          }
        });
        createdBranches += 1;
      }
    }
  }

  const result = {
    createdPlaces,
    updatedPlaces,
    createdBranches,
    updatedBranches,
    linkedGovernorates,
    skipped,
    skippedBranches,
    invalidGovernorates,
    total: rows.length,
    encoding: decoded.encoding,
    validationErrors: validationErrors.slice(0, 25)
  };
  await writeAuditLog(request, 'ADMIN_IMPORT_PLACES_CSV', { adminId: admin.sub }, result);

  const warning = invalidGovernorates
    ? ` يوجد ${invalidGovernorates} صف بمحافظة غير مطابقة؛ لم يتم استخدام محافظة افتراضية.`
    : '';
  return json({
    ok: true,
    data: result,
    message: `تم استيراد ${createdPlaces} مكان جديد، تحديث ${updatedPlaces} مكان، إضافة ${createdBranches} فرع، وتحديث ${updatedBranches} فرع.${warning}`
  });
}
