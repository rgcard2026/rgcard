# RG-Card v3.9.48 — Security Alert Email Notifications

تمت إضافة قناة بريد إلكتروني لتنبيهات الأمان بجانب الـ Webhook الموجود.

## ما يتم تنبيهه
- الطلبات المشبوهة التي تم حظرها.
- تكرار محاولات الدخول الفاشلة ومحاولات الـ Brute Force.
- فشل قراءة بيانات دخول مشفرة.
- الجلسات التي تم حظرها نتيجة نشاط مشبوه.

لا يتم إرسال كلمات المرور أو أرقام البطاقات أو محتوى الطلبات بالكامل عبر البريد.

## الإعداد
1. أنشئ API Key في Resend.
2. أضف في Railway → Service → Variables:

```text
RESEND_API_KEY=re_xxxxxxxxx
SECURITY_ALERT_EMAIL_FROM=RG-Card Security <alerts@your-verified-domain.com>
```

3. من Dashboard → التنبيهات الأمنية، اكتب بريد المستلم أو أكثر من بريد مفصول بفاصلة، ثم اضغط حفظ.
4. فعّل التنبيهات واضغط "إرسال رسالة اختبار".

بدلًا من إدخال بريد المستلم من الداشبورد، يمكن ضبطه مباشرة في Railway بهذا المتغير:

```text
SECURITY_ALERT_EMAIL_TO=security@example.com,owner@example.com
```

قيمة Railway لها أولوية على القيمة المحفوظة في لوحة الإدارة.
