const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const prisma = new PrismaClient();

function baseSecret() {
  return process.env.DATA_ENCRYPTION_SECRET || process.env.AUTH_SECRET || 'dev-secret-change-me';
}
function key() {
  return crypto.createHash('sha256').update(baseSecret()).digest();
}
function hashLookup(value) {
  return crypto.createHmac('sha256', key()).update(String(value).trim().toLowerCase()).digest('hex');
}
function encryptValue(value) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key(), iv);
  const encrypted = Buffer.concat([cipher.update(String(value), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString('base64url');
}

async function main() {
  const adminPassword = await bcrypt.hash('Admin@12345', 10);
  const userPassword = await bcrypt.hash('User@12345', 10);

  await prisma.admin.upsert({
    where: { username: 'admin' },
    update: { role: 'OWNER', permissions: 'ALL', isActive: true },
    create: {
      username: 'admin',
      name: 'RG Admin',
      passwordHash: adminPassword,
      role: 'OWNER',
      permissions: 'ALL',
      isActive: true
    }
  });


  await prisma.appSetting.upsert({ where: { key: 'whatsappNumber' }, update: {}, create: { key: 'whatsappNumber', value: '201000033494' } });
  await prisma.appSetting.upsert({ where: { key: 'cardQrX' }, update: {}, create: { key: 'cardQrX', value: '1196' } });
  await prisma.appSetting.upsert({ where: { key: 'cardQrY' }, update: {}, create: { key: 'cardQrY', value: '495' } });
  await prisma.appSetting.upsert({ where: { key: 'cardQrSize' }, update: {}, create: { key: 'cardQrSize', value: '296' } });
  await prisma.appSetting.upsert({ where: { key: 'sessionMinutes' }, update: {}, create: { key: 'sessionMinutes', value: '60' } });
  await prisma.appSetting.upsert({ where: { key: 'securityAlertEnabled' }, update: {}, create: { key: 'securityAlertEnabled', value: 'false' } });
  await prisma.appSetting.upsert({ where: { key: 'securityAlertCooldownMinutes' }, update: {}, create: { key: 'securityAlertCooldownMinutes', value: '5' } });

  await prisma.user.upsert({
    where: { idNumber: '3320568' },
    update: {
      idNumberHash: hashLookup('3320568'),
      cardNumberHash: hashLookup('3320568'),
      idNumberEnc: encryptValue('3320568'),
      cardNumberEnc: encryptValue('3320568'),
      mustChangePassword: false,
      isVip: false,
      membershipClass: 'Regular',
      validUntil: new Date('2027-12-31T23:59:59.000Z')
    },
    create: {
      fullName: 'مستخدم تجريبي',
      idNumber: '3320568',
      cardNumber: '3320568',
      idNumberHash: hashLookup('3320568'),
      cardNumberHash: hashLookup('3320568'),
      idNumberEnc: encryptValue('3320568'),
      cardNumberEnc: encryptValue('3320568'),
      passwordHash: userPassword,
      mustChangePassword: false,
      isVip: false,
      membershipClass: 'Regular',
      validUntil: new Date('2027-12-31T23:59:59.000Z')
    }
  });

  const categoryNames = [
    ['المطاعم و الكافيهات', 'restaurant'],
    ['الخدمات الطبية', 'medical_services'],
    ['الفنادق', 'hotel'],
    ['البواخر السياحية', 'directions_boat'],
    ['الملابس و الأحذية', 'checkroom'],
    ['الحلويات', 'cake'],
    ['مفروشات و أثاث و مستلزمات منزلية', 'chair'],
    ['الأثاث المكتبي', 'business_center'],
    ['سوبر ماركت', 'local_grocery_store'],
    ['الأجهزة الإلكترونية', 'devices'],
    ['خدمات السيارات', 'directions_car'],
    ['صالات الألعاب الرياضية', 'fitness_center'],
    ['خدمات ترفيهية', 'attractions']
  ];

  for (let i = 0; i < categoryNames.length; i++) {
    await prisma.category.upsert({
      where: { name: categoryNames[i][0] },
      update: { icon: categoryNames[i][1], sortOrder: i + 1 },
      create: { name: categoryNames[i][0], icon: categoryNames[i][1], sortOrder: i + 1 }
    });
  }

  const govs = ['القاهرة', 'الجيزة', 'الإسكندرية', 'الدقهلية', 'البحر الأحمر', 'البحيرة', 'الفيوم', 'الغربية', 'الإسماعيلية', 'المنوفية', 'المنيا', 'القليوبية', 'الوادي الجديد', 'السويس', 'أسوان', 'أسيوط', 'بني سويف', 'بورسعيد', 'دمياط', 'الشرقية', 'جنوب سيناء', 'كفر الشيخ', 'مطروح', 'الأقصر', 'قنا', 'شمال سيناء', 'سوهاج'];
  for (const name of govs) {
    await prisma.governorate.upsert({ where: { name }, update: {}, create: { name } });
  }

  const food = await prisma.category.findUnique({ where: { name: 'المطاعم و الكافيهات' } });
  const medical = await prisma.category.findUnique({ where: { name: 'الخدمات الطبية' } });
  const cairo = await prisma.governorate.findUnique({ where: { name: 'القاهرة' } });
  const alex = await prisma.governorate.findUnique({ where: { name: 'الإسكندرية' } });
  const giza = await prisma.governorate.findUnique({ where: { name: 'الجيزة' } });

  const demoPlaces = [
    {
      name: 'سي فود فاكتوري',
      description: 'خصومات على الوجبات والمأكولات البحرية لأعضاء RG-Card.',
      discount: 'خصم حتى 20%',
      logoUrl: '/logos/seafood.svg',
      isFeatured: true,
      exclusiveText: 'عرض حصري: خصم حتى 20% على المأكولات البحرية',
      categoryId: food.id,
      branches: [
        { name: 'فرع مدينة نصر', address: 'مدينة نصر - القاهرة', phone: '01000000001', governorateId: cairo.id },
        { name: 'فرع الإسكندرية', address: 'سموحة - الإسكندرية', phone: '01000000002', governorateId: alex.id }
      ]
    },
    {
      name: 'محلات ديافي الأحذية',
      description: 'عروض خاصة على الأحذية والشنط.',
      discount: 'خصم 15%',
      logoUrl: '/logos/dejavu.svg',
      isFeatured: true,
      exclusiveText: 'خصم خاص على الأحذية والشنط لأعضاء RG-Card',
      categoryId: (await prisma.category.findUnique({ where: { name: 'الملابس و الأحذية' } })).id,
      branches: [
        { name: 'فرع المهندسين', address: 'شارع جامعة الدول العربية', phone: '01000000003', governorateId: giza.id },
        { name: 'فرع مصر الجديدة', address: 'مصر الجديدة - القاهرة', phone: '01000000004', governorateId: cairo.id }
      ]
    },
    {
      name: 'مركز ابتسامة الطبي',
      description: 'خصومات على الكشف والخدمات الطبية المختارة.',
      discount: 'خصم 25%',
      logoUrl: '/logos/medical.svg',
      isFeatured: false,
      exclusiveText: null,
      categoryId: medical.id,
      branches: [
        { name: 'فرع القاهرة الجديدة', address: 'التجمع الخامس', phone: '01000000005', governorateId: cairo.id }
      ]
    }
  ];

  for (const placeData of demoPlaces) {
    const existing = await prisma.place.findFirst({ where: { name: placeData.name } });
    if (existing) continue;
    const { branches, ...place } = placeData;
    const created = await prisma.place.create({ data: place });
    for (const branch of branches) {
      await prisma.branch.create({ data: { ...branch, placeId: created.id } });
    }
    await prisma.offer.create({
      data: {
        placeId: created.id,
        title: `عرض ${created.name}`,
        discountText: created.discount,
        description: created.description,
        isFeatured: created.isFeatured,
        bannerText: created.exclusiveText
      }
    });
  }

  // Backfill protected lookup fields for any existing users created by older versions.
  const allUsers = await prisma.user.findMany();
  for (const user of allUsers) {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        idNumberHash: user.idNumberHash || hashLookup(user.idNumber),
        cardNumberHash: user.cardNumberHash || hashLookup(user.cardNumber),
        idNumberEnc: user.idNumberEnc || encryptValue(user.idNumber),
        cardNumberEnc: user.cardNumberEnc || encryptValue(user.cardNumber),
        membershipClass: user.membershipClass || (user.isVip ? 'VIP' : 'Regular')
      }
    }).catch(() => null);
  }

}

main()
  .then(async () => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
