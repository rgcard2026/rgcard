# نشر RG-Card v3.9.43

هذا Patch مبني فوق آخر نسخة في GitHub بعد v3.9.42.

## التحديث

```bash
cd ~/Desktop
unzip -o RG-Card_v3.9.43_client_revisions_patch.zip

cd ~/Desktop/rg_card_next_api

git add \
  src/components/ClientProtection.tsx \
  src/app/globals.css \
  src/app/providers.tsx \
  src/app/login/page.tsx \
  src/components/AdminPlacesClient.tsx \
  src/components/AdminUsersClient.tsx \
  src/components/AdminNewArrivalsClient.tsx \
  src/lib/card-layout.ts \
  src/lib/card-generator.ts \
  src/app/api/member-card/qr/route.ts \
  src/app/api/member-card/pdf/route.ts \
  'src/app/api/admin/users/[id]/member-card/qr/route.ts' \
  'src/app/api/admin/users/[id]/member-card/pdf/route.ts' \
  src/app/api/admin/users/cards-pdf/route.ts \
  package.json package-lock.json \
  CLIENT_REVISIONS_V3_9_43_AR.md \
  DEPLOY_V3_9_43_AR.md

git commit -m "Client revisions: QR login, watermark, font, admin select"
git push origin main
```

Railway سيبدأ Deploy تلقائيًا. بعد أن تصبح الحالة `Success / Active`، اعمل `Ctrl + Shift + R` في المتصفح.

## اختبار سريع

1. امسح QR بالكاميرا: يجب أن يفتح صفحة الدخول مع رقم الكارت مكتوب تلقائيًا، ولا يبقى مطلوبًا سوى كلمة المرور.
2. من Users: اختر أكثر من مستخدم ثم اضغط `PDF الكروت المحددة`.
3. من Places وNew Arrival: اختر عناصر ثم جرّب التفعيل أو الإيقاف أو الحذف.
4. افتح صفحة العروض وتأكد أن الـ watermark أصبح متكررًا وأنيقًا وأمام محتوى الصفحة دون منع الضغط.
