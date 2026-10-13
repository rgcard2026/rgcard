# RG-Card — تسليم الـRedesign للمطوّر (Developer Handoff)

> نسخة: فرع `redesign` — أكتوبر 2026
> المشروع: Next.js 14 (App Router) + MUI 5 + Prisma/SQLite + Railway (Dockerfile)

## 1. الملخص السريع

- **تصميم جديد بالكامل** لموقع الأعضاء ولوحة الأدمن (هوية "Onyx & Champagne": أسود فحمي + ذهبي شامبين، داكن افتراضيًا وفيه وضع فاتح).
- **مفيش أي تغيير في قاعدة البيانات** (`prisma/schema.prisma` زي ما هو) → النشر **مش هيلمس بيانات الأعضاء/الأماكن الموجودة على Railway**.
- **مفيش متغيرات بيئة (env) جديدة.**
- **مكتبات جديدة:** `three` و `framer-motion` (و `@types/three` للتطوير). اتشالت `@react-three/*`. كله متسجل في `package-lock.json`.
- `npm run build` بينجح من نسخة نضيفة (`npm ci` → `prisma generate` → `build`).

## 2. إيه اللي اتغير (بالترتيب في الـcommits)

| Commit | الوصف |
|---|---|
| `bc48d31` | تعديلات كانت موجودة محليًا قبل الـredesign ومش مرفوعة (login banner API، Design Studio، card generator، Dockerfile arg). **مش جزء من التصميم**، اتسجلت لوحدها. |
| `a6837e1` | Redesign صفحات الأعضاء (login, /valid, /offers, /places/[id], PDF). |
| `c2bbd0b` | تنظيف: حذف كود وملفات مش مستخدمة + تقليل `globals.css` (اتأكدنا بمقارنة صور قبل/بعد). |
| `0fb6f37` | شريط تحميل، صفحات 404/خطأ، عناوين الصفحات، PWA manifest. |
| `f0a1e4f` | ربط **كل إعدادات استوديو التصميم** بنظام التصميم الجديد + تحميل الخطوط المختارة فعليًا. |
| `dda4b8a` | Redesign لوحة الأدمن + حذف `globals.css` نهائيًا. |
| بعدها | ملاحظات العميل: الـwatermark، قلبة الكارت مع الـscroll + ضهر الكارت، شريط "وصل حديثًا"، ومسافات صفحة الكارت. |

`git log --oneline main..redesign` بيعرض القائمة كاملة.

## 3. الحصول على الكود

**الطريقة 1 — فولدر `source/`:** نسخة نضيفة من كل الملفات المسجّلة (من غير `node_modules` و`.env` والداتابيز المحلية).

**الطريقة 2 — ملف `rg-card-full-history.bundle` (فيه تاريخ Git كامل لفرعَي `main` و `redesign`):**

```bash
git clone rg-card-full-history.bundle -b redesign rg-card
cd rg-card
git remote set-url origin <رابط الـrepo بتاعكم>
```

## 4. التشغيل محليًا

```bash
cp .env.example .env          # وعدّل القيم السرية لو حابب
npm ci
npx prisma generate
npx prisma db push            # بينشئ prisma/dev.db
npm run db:seed               # بيانات تجريبية
npm run dev                   # http://localhost:3000
```

بيانات الدخول التجريبية (من `prisma/seed.js`):

- عضو: `http://localhost:3000/login` — رقم الكارت `3320568` / كلمة المرور `User@12345`
- أدمن: `http://localhost:3000/admin/login` — `admin` / `Admin@12345`

> ⚠️ هذه بيانات تطوير فقط. **ممنوع تشغيل `db:seed` على قاعدة بيانات الإنتاج.**

## 5. النشر على Railway (نفس الخدمة الحالية)

1. **خد backup من الـVolume** (`/data` — فيه `rg-card.db` و `uploads/`) قبل أي نشر.
2. اعمل merge لفرع `redesign` في الفرع اللي Railway بيبني منه (غالبًا `main`) و push.
3. Railway هيبني من الـ`Dockerfile` زي الأول. سكريبت التشغيل (`scripts/railway-start.sh`) بيعمل `prisma db push` (مفيش تغيير schema) ومش بيعمل seed لو الداتابيز موجودة.
4. متغيرات البيئة **زي ما هي**: `AUTH_SECRET`، `SESSION_SECRET`، `DATA_ENCRYPTION_SECRET` (**لازم يفضل نفس القيمة**)، `RG_CARD_PUBLIC_URL`.
5. `NEXT_PUBLIC_ENABLE_LOGIN_ENCRYPTION` بقى `true` افتراضيًا وقت الـbuild في الـDockerfile (يلزمه HTTPS — Railway domain تمام).

**الرجوع للنسخة القديمة لو احتجت:** أعد نشر الـcommit `1ac5845` (آخر `main` قبل الـredesign).

## 6. بعد النشر — مراجعة سريعة

- [ ] دخول عضو ← صفحة "بطاقتي": الكارت الـ3D بيتقلب مع الـscroll ويظهر الضهر ورقم العضو.
- [ ] صفحة العروض: البحث والفلاتر، شريط "وصل حديثًا" بيتحرك ويقف لما الماوس يقف عليه.
- [ ] تفاصيل مكان + الفروع.
- [ ] الأدمن: إضافة/تعديل مكان (ورفع لوجو)، إضافة/تعديل عضو، التصدير، الإعدادات.
- [ ] **استوديو التصميم:** لو العميل كان حافظ ألوان قديمة (Teal/Blue) هتفضل ظاهرة → اضغط **«إرجاع القيم الافتراضية»** ثم **حفظ** لتطبيق الألوان الجديدة. وراجع إعداد **«صورة الخلفية»**.
- [ ] الموبايل + الوضع الفاتح + English.

## 7. ملاحظات تقنية مهمة

- **الستايل:** `src/styles/ui.css` (نظام التصميم: tokens بادئة `--ui-*`) و `src/styles/admin.css` (لوحة الأدمن). ملف `globals.css` القديم اتحذف.
- **استوديو التصميم:** `src/components/DesignThemeRuntime.tsx` هو المكان الوحيد اللي بيحوّل الإعدادات المحفوظة لـ`--ui-*`. القيم الافتراضية في `src/lib/design-defaults.ts` (مشتركة بين السيرفر والاستوديو).
- **MUI:** الـtheme في `src/components/ui/muiTheme.ts` وبيستخدم متغيرات CSS. **لا تكتب `::placeholder` داخل styles الخاصة بـemotion/sx** (بيعمل crash بسبب اختلاف نسخ stylis) — حطه في CSS عادي.
- **3D:** three.js مباشرة (`src/components/ui/MemberCard3D.tsx` و `GoldDust.tsx`)، من غير React Three Fiber.
- **Reduced motion:** الأجهزة اللي قافلة "Animation effects" (Windows) بتشوف الحركات الأساسية بشكل أهدى مش مقفولة؛ الحركات الزخرفية بس هي اللي بتقف.
- **ضهر الكارت:** `public/card-back.png` اتولّد من صورة الوش بالسكريبت `scripts/build-card-back.cjs` (`node scripts/build-card-back.cjs .`). لو العميل عنده تصميم ضهر رسمي، استبدل الصورة بنفس المقاس (1573×1000).
- **ملاحظة قديمة (مش من الـredesign):** تاريخ الانتهاء على الكارت بيركب فوق كلمة "R.g card" — بيتظبط من إعدادات مكان التاريخ في صفحة إعدادات الكارت بالأدمن.
