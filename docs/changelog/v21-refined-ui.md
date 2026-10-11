# RG-Card v21 - v19 Refined UI

This build keeps v19 as the main design direction and adds small usability improvements only.

## Changes

- Kept the v19 royal/gold visual identity.
- Reduced the top banner height so it does not dominate the user page.
- Reworked the user offers page into shorter, clearer sections:
  - Compact summary header.
  - Inline New Arrival section instead of heavy app-style redesign.
  - Compact exclusive offers strip.
  - Cleaner search/filter panel.
  - Lighter offer cards with less vertical height.
- Preserved the existing admin/security/card features from v19.

## Local run

```bash
cp .env.example .env
npm install
npx prisma generate
npm run db:push
npm run db:seed
npm run dev
```

## Preserve old SQLite database

```bash
cp /old/path/rg_card_next_api/prisma/dev.db /tmp/rg-dev.db
cp /tmp/rg-dev.db ./prisma/dev.db
npx prisma generate
npm run db:push
npm run dev
```

Do not run `npm run db:seed` when preserving existing data.
