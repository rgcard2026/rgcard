# رفع RG-Card على Railway

اتبع الملف: `docs/v3.9.36-railway-ready.md`.

الإعداد الأساسي:

- Volume mount path: `/data`
- SQLite: `file:/data/rg-card.db`
- Uploads: `/data/uploads`
- Health check: `/login`

لا ترفع `.env` أو `prisma/dev.db` إلى GitHub. استخدم Railway Volume Files لنقل قاعدة بياناتك والـ uploads بعد أول Deploy.
