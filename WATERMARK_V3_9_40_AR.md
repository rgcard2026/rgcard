# RG-Card v3.9.40 — Single Diagonal Watermark Fix

تم استبدال نظام الـ watermark القديم بالكامل.

- رقم الكارت يظهر مرة واحدة فقط في كل صفحة مستخدم محمية.
- عنصر الـ watermark يستخدم CSS classes جديدة: `rg-single-watermark-v40`.
- تم تعطيل أي style قديم من `.rg-page-watermark` لمنع التكرار.
- الرقم مائل Diagonal وفي منتصف الشاشة، فوق المحتوى وتحت شريط التنقل.

## ملفات التعديل
- `src/components/ClientProtection.tsx`
- `src/app/globals.css`
