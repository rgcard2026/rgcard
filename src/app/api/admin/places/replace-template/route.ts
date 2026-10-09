import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { badRequest, forbidden, json, requireApiSession, unauthorized } from '@/lib/api';
import { adminHasPermission } from '@/lib/admin-auth';
import { writeAuditLog } from '@/lib/audit';
import {
  RG_CARD_TEMPLATE_CATEGORIES,
  RG_CARD_TEMPLATE_PLACES
} from '@/lib/rg-card-template-data';

export const dynamic = 'force-dynamic';

type GovernorateRecord = { id: number; name: string };
type SourcePlace = (typeof RG_CARD_TEMPLATE_PLACES)[number];
type PreparedOffer = {
  sourceNo: number;
  title: string;
  discountText: string;
  description: string | null;
  bannerText: string | null;
};
type PreparedPlace = {
  sourceNos: number[];
  name: string;
  category: string;
  discount: string;
  notes: string;
  branchText: string;
  logoUrl: string | null;
  sortOrder: number;
  offers: PreparedOffer[];
};

type BranchDefinition = {
  governorateName: string;
  name: string;
  address: string;
  global?: boolean;
};

function normalizeArabic(value: string) {
  return String(value || '')
    .toLowerCase()
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/[\u064B-\u065F\u0670]/g, '')
    .replace(/ـ/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function uniqueText(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.map((value) => String(value || '').trim()).filter(Boolean)));
}

function containsPhrase(text: string, phrase: string) {
  const normalizedText = ` ${normalizeArabic(text)} `;
  const normalizedPhrase = ` ${normalizeArabic(phrase)} `;
  return normalizedText.includes(normalizedPhrase);
}

const governorateHints: Array<{ governorate: string; words: string[] }> = [
  { governorate: 'القاهرة', words: [
    'القاهرة', 'التجمع', 'القاهرة الجديدة', 'مدينة نصر', 'مدينه نصر', 'مصر الجديدة', 'الرحاب',
    'مدينتي', 'مڤيدا', 'العاصمة الإدارية', 'العاصمة الادارية', 'الزمالك', 'المعادي', 'المعادى',
    'المقطم', 'النزهة', 'الشروق', 'العباسية', 'القطامية', 'هليوبوليس', 'الكوربة', 'وسط البلد',
    'القصر العيني', 'المرج', 'حلوان', 'روكسي', 'عباس العقاد', 'مكرم عبيد', 'السيدة زينب',
    'عين شمس', 'حدائق القبة', 'الأميرية', 'الاميرية', 'سيتي ستارز', 'كايرو فستيفال',
    'ارض الجولف', 'أرض الجولف', 'احمد الزمر', 'أحمد الزمر', 'الحي العاشر', 'المرغني',
    'شارع التسعين', 'التسعين', 'جلاكسي مول', 'ريد بوينت', 'البنفسج', 'عبد الحميد السحار',
    'مدينة بدر', 'مساكن شيراتون', 'شيراتون', 'نادي الشمس', 'النادى الاهلى', 'النادي الاهلي',
    'الازهر', 'الأزهر', 'الحجاز', 'شارع الطاقة', 'الطاقة', 'شارع سوريا', 'جنينة مول',
    'فيوتشر مول', 'جسر السويس', 'طلعت حرب', 'تريومف', 'الخليفة المأمون', 'صالح سالم',
    'صنعاء', 'الف مسكن', 'ألف مسكن', 'الزيتون', 'السلام', 'ميدان السواح', 'الفجالة',
    'مول الأوبرا', 'مول الاوبرا', 'ميدان الأوبرا', 'ميدان الاوبرا', 'شارع شريف', 'قصر النيل',
    'سيتي سنتر الماظة', 'سيتي سنتر المعادي', 'الجامعة الأمريكية', 'الجامعة الامريكية'
  ] },
  { governorate: 'الجيزة', words: [
    'الجيزة', 'الشيخ زايد', 'زايد', '6 أكتوبر', '٦ أكتوبر', 'اكتوبر', 'أكتوبر', 'الدقي',
    'المهندسين', 'الهرم', 'هضبة الهرم', 'فيصل', 'الوراق', 'بولاق الدكرور', 'حدائق الاهرام',
    'حدائق الأهرام', 'ميدان لبنان', 'جامعة الدول', 'مول مصر', 'دريم بارك', 'سكي إيجيبت',
    'امبابة', 'إمبابة', 'شارع السودان', 'داندي مول', 'الحصري', 'طريق مصر اسكندرية الصحراوي'
  ] },
  { governorate: 'الإسكندرية', words: [
    'الإسكندرية', 'الأسكندرية', 'الاسكندرية', 'اسكندرية', 'الماكس', 'سموحة', 'العجمي',
    'المندرة', 'الانفوشي', 'الأنفوشي', 'برج العرب', 'باب شرقي', 'سان ستيفانو',
    'المنشية', 'سيدي جابر', 'ميامي', 'محطة الرمل', 'سيتي سنتر الأسكندرية',
    'سيتي سنتر الاسكندرية', 'محطة مصر', 'داون تاون'
  ] },
  { governorate: 'الدقهلية', words: ['الدقهلية', 'المنصورة', 'ميت غمر', 'دكرنس', 'طلخا', 'جزيرة الورد'] },
  { governorate: 'البحر الأحمر', words: ['البحر الأحمر', 'البحر الاحمر', 'الغردقة', 'الجونة', 'سهل حشيش', 'مرسى علم'] },
  { governorate: 'البحيرة', words: ['البحيرة', 'دمنهور', 'كفر الدوار', 'رشيد'] },
  { governorate: 'الفيوم', words: ['الفيوم'] },
  { governorate: 'الغربية', words: ['الغربية', 'طنطا', 'المحلة الكبرى', 'المحلة'] },
  { governorate: 'الإسماعيلية', words: ['الإسماعيلية', 'الاسماعيلية', 'فايد'] },
  { governorate: 'المنوفية', words: ['المنوفية', 'شبين الكوم', 'السادات'] },
  { governorate: 'المنيا', words: ['المنيا'] },
  { governorate: 'القليوبية', words: ['القليوبية', 'العبور', 'بنها', 'شبرا الخيمة', 'قليوب'] },
  { governorate: 'الوادي الجديد', words: ['الوادي الجديد', 'الخارجة', 'الداخلة'] },
  { governorate: 'السويس', words: ['السويس', 'السخنة', 'العين السخنة', 'بورتو السخنة'] },
  { governorate: 'أسوان', words: ['أسوان', 'اسوان'] },
  { governorate: 'أسيوط', words: ['أسيوط', 'اسيوط'] },
  { governorate: 'بني سويف', words: ['بني سويف'] },
  { governorate: 'بورسعيد', words: ['بورسعيد', 'بور سعيد'] },
  { governorate: 'دمياط', words: ['دمياط', 'راس البر', 'رأس البر'] },
  { governorate: 'الشرقية', words: ['الشرقية', 'الزقازيق', 'العاشر من رمضان'] },
  { governorate: 'جنوب سيناء', words: ['جنوب سيناء', 'شرم الشيخ', 'دهب', 'نويبع', 'طابا'] },
  { governorate: 'كفر الشيخ', words: ['كفر الشيخ', 'دسوق'] },
  { governorate: 'مطروح', words: [
    'مطروح', 'مرسى مطروح', 'الساحل الشمالي', 'العلمين', 'مارينا', 'مراسي',
    'سيدي عبد الرحمن', 'الضبعة', 'جولف بورتو الساحل'
  ] },
  { governorate: 'الأقصر', words: ['الأقصر', 'الاقصر'] },
  { governorate: 'قنا', words: ['قنا'] },
  { governorate: 'شمال سيناء', words: ['شمال سيناء', 'العريش'] },
  { governorate: 'سوهاج', words: ['سوهاج'] }
];

const nationwideHints = [
  'جميع الفروع', 'جميع فروع', 'كافة الفروع', 'كافه الفروع', 'كل الفروع',
  'جميع محافظات', 'جمهورية مصر العربية', 'على مستوى الجمهورية', 'علي مستوي الجمهوريه',
  'بكل الفروع على مستوى الجمهورية', 'بكل الفروع علي مستوي الجمهوريه', 'اون لاين فقط',
  'أون لاين فقط', 'اونلاين فقط', 'أونلاين فقط'
];

function isNationwide(text: string) {
  return nationwideHints.some((hint) => containsPhrase(text, hint));
}

function detectGovernorateNames(text: string, availableNames: Set<string>) {
  const names = new Set<string>();
  for (const hint of governorateHints) {
    if (!availableNames.has(normalizeArabic(hint.governorate))) continue;
    if (hint.words.some((word) => containsPhrase(text, word))) names.add(hint.governorate);
  }
  return Array.from(names);
}

function prepareCatalogue(): PreparedPlace[] {
  const offerOnlyParents = new Map<number, string>([
    [126, 'ماجيك بلانت'],
    [127, 'سكي إيجيبت مدينة الثلج']
  ]);
  const grouped = new Map<string, { source: SourcePlace[]; prepared: PreparedPlace }>();

  for (const source of RG_CARD_TEMPLATE_PLACES) {
    if (offerOnlyParents.has(source.sourceNo)) continue;
    const key = `${normalizeArabic(source.category)}::${normalizeArabic(source.name)}`;
    const existing = grouped.get(key);
    const sourceNotes = source.sourceNo === 121 ? '' : String(source.notes || '').trim();
    const offerKey = `${String(source.discount || '').trim()}::${sourceNotes}`;

    if (!existing) {
      grouped.set(key, {
        source: [source],
        prepared: {
          sourceNos: [source.sourceNo],
          name: String(source.name || '').trim(),
          category: String(source.category || '').trim(),
          discount: String(source.discount || '').trim() || 'اسأل عن العرض',
          notes: sourceNotes,
          branchText: String(source.branches || '').trim(),
          logoUrl: source.logoUrl,
          sortOrder: source.sortOrder,
          offers: [{
            sourceNo: source.sourceNo,
            title: `عرض ${String(source.name || '').trim()}`,
            discountText: String(source.discount || '').trim() || 'اسأل عن العرض',
            description: sourceNotes || null,
            bannerText: sourceNotes || null
          }]
        }
      });
      continue;
    }

    existing.source.push(source);
    existing.prepared.sourceNos.push(source.sourceNo);
    existing.prepared.branchText = uniqueText([existing.prepared.branchText, source.branches]).join('\n');
    existing.prepared.notes = uniqueText([existing.prepared.notes, sourceNotes]).join('\n');
    existing.prepared.sortOrder = Math.min(existing.prepared.sortOrder, source.sortOrder);
    if (!existing.prepared.logoUrl && source.logoUrl) existing.prepared.logoUrl = source.logoUrl;
    const alreadyHasOffer = existing.prepared.offers.some((offer) => `${offer.discountText.trim()}::${String(offer.description || '').trim()}` === offerKey);
    if (!alreadyHasOffer) {
      existing.prepared.offers.push({
        sourceNo: source.sourceNo,
        title: `عرض ${String(source.name || '').trim()}`,
        discountText: String(source.discount || '').trim() || 'اسأل عن العرض',
        description: sourceNotes || null,
        bannerText: sourceNotes || null
      });
    }
  }

  for (const source of RG_CARD_TEMPLATE_PLACES) {
    const parentName = offerOnlyParents.get(source.sourceNo);
    if (!parentName) continue;
    const parent = Array.from(grouped.values()).find((entry) => normalizeArabic(entry.prepared.name) === normalizeArabic(parentName));
    if (!parent) continue;
    parent.prepared.offers.push({
      sourceNo: source.sourceNo,
      title: String(source.name || '').trim(),
      discountText: String(source.discount || '').trim() || 'اسأل عن العرض',
      description: String(source.notes || '').trim() || null,
      bannerText: String(source.notes || '').trim() || null
    });
  }

  return Array.from(grouped.values()).map((entry) => entry.prepared).sort((a, b) => a.sortOrder - b.sortOrder);
}

function locationSourceFor(place: PreparedPlace) {
  const sources = [place.branchText];
  if (place.sourceNos.includes(121)) sources.push(String(RG_CARD_TEMPLATE_PLACES.find((item) => item.sourceNo === 121)?.notes || ''));
  return uniqueText(sources).join('\n');
}

function buildLocationData(place: PreparedPlace, governorates: GovernorateRecord[]) {
  const byNormalizedName = new Map(governorates.map((governorate) => [normalizeArabic(governorate.name), governorate]));
  const availableNames = new Set(byNormalizedName.keys());
  const sourceText = locationSourceFor(place);

  if (isNationwide(`${sourceText}\n${place.notes}`)) {
    const first = governorates[0];
    return {
      governorateIds: governorates.map((governorate) => governorate.id),
      branches: first ? [{
        governorateName: first.name,
        name: 'جميع الفروع',
        address: sourceText || 'متاح بجميع المحافظات',
        global: true
      } satisfies BranchDefinition] : [],
      unresolvedLines: [] as string[]
    };
  }

  const manualGovernorates = new Set<string>();
  if (normalizeArabic(place.name) === normalizeArabic('دريم بارك')) manualGovernorates.add('الجيزة');
  if (normalizeArabic(place.name) === normalizeArabic('سكي إيجيبت مدينة الثلج')) manualGovernorates.add('الجيزة');

  const groups = new Map<string, string[]>();
  const unresolvedLines: string[] = [];
  let currentGovernorates: string[] = [];
  let sectionGovernorates: string[] = [];
  let pending: string[] = [];

  const lines = sourceText.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  for (const line of lines) {
    const isSectionHeader = /^فروع\s+/i.test(normalizeArabic(line));
    const detected = detectGovernorateNames(line, availableNames);

    if (isSectionHeader && detected.length) {
      sectionGovernorates = detected;
      currentGovernorates = detected;
      continue;
    }

    const assigned = sectionGovernorates.length ? sectionGovernorates : detected.length ? detected : currentGovernorates;
    if (!assigned.length) {
      pending.push(line);
      continue;
    }

    const textToAdd = pending.length ? [...pending, line] : [line];
    pending = [];
    for (const governorateName of assigned) {
      const list = groups.get(governorateName) || [];
      for (const value of textToAdd) if (!list.includes(value)) list.push(value);
      groups.set(governorateName, list);
    }
    if (detected.length && !sectionGovernorates.length) currentGovernorates = detected;
  }

  if (pending.length) {
    if (currentGovernorates.length) {
      for (const governorateName of currentGovernorates) {
        const list = groups.get(governorateName) || [];
        for (const value of pending) if (!list.includes(value)) list.push(value);
        groups.set(governorateName, list);
      }
    } else {
      unresolvedLines.push(...pending);
    }
  }

  for (const governorateName of Array.from(manualGovernorates)) {
    if (byNormalizedName.has(normalizeArabic(governorateName)) && !groups.has(governorateName)) groups.set(governorateName, []);
  }

  const governorateIds: number[] = [];
  const branches: BranchDefinition[] = [];
  for (const [governorateName, addressLines] of Array.from(groups.entries())) {
    const governorate = byNormalizedName.get(normalizeArabic(governorateName));
    if (!governorate) continue;
    governorateIds.push(governorate.id);
    if (addressLines.length) {
      branches.push({
        governorateName: governorate.name,
        name: `فروع ${governorate.name}`,
        address: addressLines.join('\n')
      });
    }
  }

  return { governorateIds: Array.from(new Set(governorateIds)), branches, unresolvedLines };
}

export async function POST(request: NextRequest) {
  const session = await requireApiSession(request, 'admin');
  if (!session) return unauthorized();

  if (!(await adminHasPermission(session, 'PLACES'))) {
    return forbidden('ليست لديك صلاحية إدارة الأماكن والعروض');
  }

  const actingAdmin = await prisma.admin.findUnique({
    where: { id: session.sub },
    select: { isActive: true, role: true }
  });
  if (!actingAdmin?.isActive || actingAdmin.role !== 'OWNER') {
    return forbidden('رفع بيانات العميل بالكامل متاح لحساب المالك فقط');
  }

  const body = await request.json().catch(() => ({}));
  if (body?.confirmation !== 'REPLACE_DEMO_DATA') {
    return badRequest('اكتب تأكيد الاستبدال قبل تنفيذ العملية');
  }

  const governorates = await prisma.governorate.findMany({
    select: { id: true, name: true },
    orderBy: { id: 'asc' }
  }) as GovernorateRecord[];
  if (!governorates.length) {
    return badRequest('لا توجد محافظات في قاعدة البيانات. شغّل تهيئة قاعدة البيانات أولًا.');
  }

  const preparedPlaces = prepareCatalogue();
  const unresolvedPlaces: Array<{ name: string; sourceNos: number[]; lines: string[] }> = [];
  let importedGovernorateLinks = 0;
  let importedBranches = 0;
  let importedOffers = 0;
  let restoredUserDiscounts = 0;

  try {
    await (prisma.$transaction as any)(async (tx: any) => {
      const previousUserDiscounts = await tx.userPlaceDiscount.findMany({
        include: { place: { select: { name: true } } }
      });
      const createdPlaceIds = new Map<string, number>();

      await tx.place.deleteMany();
      await tx.category.deleteMany();

      await tx.category.createMany({
        data: RG_CARD_TEMPLATE_CATEGORIES.map((name, index) => ({
          name,
          icon: 'local_offer',
          sortOrder: index + 1
        }))
      });

      const governorateByName = new Map<string, GovernorateRecord>(governorates.map((governorate: GovernorateRecord) => [normalizeArabic(governorate.name), governorate]));

      for (const place of preparedPlaces) {
        const location = buildLocationData(place, governorates);
        if (!location.governorateIds.length) {
          unresolvedPlaces.push({ name: place.name, sourceNos: place.sourceNos, lines: location.unresolvedLines });
        }
        importedGovernorateLinks += location.governorateIds.length;
        importedBranches += location.branches.length;
        importedOffers += place.offers.length;

        const branchCreates = location.branches.flatMap((branch) => {
          const governorate = governorateByName.get(normalizeArabic(branch.governorateName));
          if (!governorate) return [];
          return [{
            name: branch.name,
            address: branch.address || null,
            governorateId: governorate.id
          }];
        });

        const createdPlace = await tx.place.create({
          data: {
            name: place.name,
            description: place.notes || null,
            discount: place.discount,
            logoUrl: place.logoUrl,
            isActive: true,
            isFeatured: false,
            exclusiveText: place.notes || null,
            governoratesConfigured: location.governorateIds.length > 0,
            sortOrder: place.sortOrder,
            category: { connect: { name: place.category } },
            governorates: location.governorateIds.length ? {
              create: location.governorateIds.map((governorateId) => ({ governorateId }))
            } : undefined,
            offers: {
              create: place.offers.map((offer) => ({
                title: offer.title,
                description: offer.description,
                discountText: offer.discountText,
                isActive: true,
                isFeatured: false,
                bannerText: offer.bannerText
              }))
            },
            branches: branchCreates.length ? { create: branchCreates } : undefined
          }
        });
        createdPlaceIds.set(normalizeArabic(createdPlace.name), createdPlace.id);
      }

      for (const previousDiscount of previousUserDiscounts) {
        const placeId = createdPlaceIds.get(normalizeArabic(previousDiscount.place.name));
        if (!placeId) continue;
        await tx.userPlaceDiscount.create({
          data: {
            userId: previousDiscount.userId,
            placeId,
            discountText: previousDiscount.discountText
          }
        });
        restoredUserDiscounts += 1;
      }
    }, { maxWait: 10000, timeout: 120000 });
  } catch (error) {
    console.error('[RG-Card] Corrected client data import failed', error);
    return json({ ok: false, message: 'تعذر رفع بيانات العميل بالكامل. لم يتم حفظ أي تغيير.' }, 500);
  }

  const result = {
    importedPlaces: preparedPlaces.length,
    importedOffers,
    importedCategories: RG_CARD_TEMPLATE_CATEGORIES.length,
    importedLogos: preparedPlaces.filter((place) => Boolean(place.logoUrl)).length,
    importedBranches,
    importedGovernorateLinks,
    restoredUserDiscounts,
    unresolvedPlaces,
    mergedDuplicatePlaces: ['المصرية ماركت'],
    mergedOfferRows: ['عرض أسعار ماجيك بلانت', 'عرض أسعار سكي إيجيبت'],
    preservedNewArrivals: true
  };

  await writeAuditLog(request, 'ADMIN_IMPORT_CORRECTED_CLIENT_PLACES_WITH_LOGOS', { adminId: session.sub }, result);
  const warning = unresolvedPlaces.length
    ? ` توجد ${unresolvedPlaces.length} أماكن لا يحتوي ملف العميل على محافظة واضحة لها؛ تم رفعها بدون ربط محافظة بدل إسنادها خطأً للقاهرة.`
    : '';
  return json({
    ok: true,
    data: result,
    message: `تم رفع ${result.importedPlaces} مكان و${result.importedOffers} عرض و${result.importedLogos} لوجو وإنشاء ${result.importedBranches} مجموعة فروع حسب المحافظات.${warning}`
  });
}
