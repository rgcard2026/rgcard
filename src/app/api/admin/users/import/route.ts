import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { json, requireApiSession, unauthorized } from '@/lib/api';
import { writeAuditLog } from '@/lib/audit';
import { encryptValue, hashLookup } from '@/lib/vault';
import { generateUniqueCardNumber } from '@/lib/card-number';
import { normalizeMembershipClass } from '@/lib/card-layout';

function splitCsvLine(line: string) {
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; continue; }
    if (ch === '"') { inQuotes = !inQuotes; continue; }
    if (ch === ',' && !inQuotes) { out.push(cur.trim()); cur = ''; continue; }
    cur += ch;
  }
  out.push(cur.trim());
  return out;
}

function normalizeHeader(h: string) {
  return h.trim().toLowerCase().replace(/\s+/g, '');
}

function parseCsv(text: string) {
  const lines = text.replace(/^\ufeff/, '').split(/\r?\n/).filter((l) => l.trim());
  if (!lines.length) return [];
  const header = splitCsvLine(lines[0]).map(normalizeHeader);
  return lines.slice(1).map((line) => {
    const cells = splitCsvLine(line);
    const row: Record<string, string> = {};
    header.forEach((h, i) => { row[h] = cells[i] || ''; });
    return row;
  });
}

function pick(row: Record<string, string>, keys: string[]) {
  for (const key of keys) {
    const value = row[normalizeHeader(key)];
    if (value) return value.trim();
  }
  return '';
}

function looksLikeUploadedFile(value: FormDataEntryValue | null): value is File {
  return Boolean(value && typeof value === 'object' && 'text' in value && typeof (value as File).text === 'function');
}

// Downloadable import template. The importer maps columns case-insensitively and
// also accepts the Arabic aliases shown in the second comment row below.
export async function GET(request: NextRequest) {
  const admin = await requireApiSession(request, 'admin');
  if (!admin) return unauthorized();
  const template = '﻿' + [
    'name,idNumber,password,membershipClass,vip',
    '# aliases: الاسم,الرقم التعريفي,كلمة المرور,الفئة,vip  | membershipClass = Regular | Dept 1..10 | VIP | vip = yes/no',
    'Ahmed Sample,1234567890,Temp@12345,Regular,no',
    'Mona Sample,5557779990,Welcome@123,VIP,yes'
  ].join('\r\n');
  return new NextResponse(template, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="rg-card-users-import-template.csv"',
      'Cache-Control': 'no-store'
    }
  });
}

export async function POST(request: NextRequest) {
  const admin = await requireApiSession(request, 'admin');
  if (!admin) return unauthorized();

  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const defaultValidUntil = String(formData.get('validUntil') || '2027-12-31');

    if (!looksLikeUploadedFile(file)) {
      return json({ ok: false, message: 'ارفع ملف CSV صحيح' }, 400);
    }

    const rows = parseCsv(await file.text());
    if (!rows.length) {
      return json({ ok: false, message: 'ملف CSV فاضي أو لا يحتوي على بيانات' }, 400);
    }

    const results = { created: 0, skipped: 0, errors: [] as string[] };

    for (let index = 0; index < rows.length; index++) {
      const row = rows[index];
      try {
        const fullName = pick(row, ['name', 'fullName', 'full name', 'اسم', 'الاسم']);
        if (fullName.startsWith('#')) { continue; } // skip template comment/hint rows
        const idNumber = pick(row, ['idNumber', 'id', 'id number', 'الرقم التعريفي']);
        const password = pick(row, ['password', 'pass', 'كلمة المرور']);
        const vip = pick(row, ['vip', 'isVip']);
        const membershipClassRaw = pick(row, ['membershipClass', 'class', 'category', 'dept', 'department', 'الفئة']);
        const membershipClass = normalizeMembershipClass(membershipClassRaw || vip, ['1', 'true', 'yes', 'vip', 'y', 'نعم'].includes(String(vip || '').toLowerCase()));

        if (!fullName || !idNumber || !password) {
          results.skipped++;
          results.errors.push(`Row ${index + 2}: missing name/idNumber/password`);
          continue;
        }

        const exists = await prisma.user.findFirst({
          where: { OR: [{ idNumber }, { idNumberHash: hashLookup(idNumber) }] }
        });
        if (exists) {
          results.skipped++;
          results.errors.push(`Row ${index + 2}: duplicated idNumber`);
          continue;
        }

        const cardNumber = await generateUniqueCardNumber();
        await prisma.user.create({
          data: {
            fullName: fullName.slice(0, 180),
            idNumber,
            cardNumber,
            idNumberHash: hashLookup(idNumber),
            cardNumberHash: hashLookup(cardNumber),
            idNumberEnc: encryptValue(idNumber),
            cardNumberEnc: encryptValue(cardNumber),
            passwordHash: await bcrypt.hash(password, 10),
            mustChangePassword: true,
            validUntil: defaultValidUntil ? new Date(defaultValidUntil) : null,
            isVip: membershipClass === 'VIP',
            membershipClass
          }
        });
        results.created++;
      } catch (e: any) {
        results.skipped++;
        results.errors.push(`Row ${index + 2}: ${e?.message || 'error'}`);
      }
    }

    await writeAuditLog(request, 'ADMIN_IMPORT_USERS_CSV', { adminId: admin.sub }, results);
    return json({ ok: true, data: results });
  } catch (e: any) {
    await writeAuditLog(request, 'ADMIN_IMPORT_USERS_CSV_FAILED', { adminId: admin.sub }, { error: e?.message || 'unknown error' }).catch(() => null);
    return json({ ok: false, message: `تعذر رفع CSV: ${e?.message || 'خطأ غير معروف'}` }, 500);
  }
}
