# RG-Card v4

> **Redesign (October 2026):** new member site and admin console. Deployment and
> handoff notes: [docs/REDESIGN_HANDOFF.md](./docs/REDESIGN_HANDOFF.md).

Next.js + API + Prisma SQLite demo for RG-Card membership, offers, admin dashboard, cards, QR, CSV import/export, and admin permissions.

## New in v4

- Show/hide password button on user and admin login.
- QR and ID are generated dynamically and positioned inside the card template.
- VIP users print `VIP` on card preview and PDF.
- Admin can export all user cards as one PDF.
- Admin can export users CSV and import users from CSV.
- CSV import accepts: `name,idNumber,password,vip` and generates random 6-digit card number automatically.
- Admin can add other admins and assign permissions.
- Admin can change his own password.
- Admin can edit user name, ID, card number, active state, VIP, expiry date, and password.
- Expired cards are blocked on login. Admin can renew for one year.
- Place logo can be uploaded as an image instead of URL.
- Admin can edit offers/places and featured banner text.
- Admin pages include search and page-size controls.
- User offers can filter by category and governorate.
- Watermark appears in front of page content.
- WhatsApp support number default: `20100000000`.

## Local setup

```bash
cd rg_card_next_api
cp .env.example .env
npm install
npx prisma generate
npm run db:push
npm run db:seed
npm run dev
```

Open:

```text
http://127.0.0.1:3000/login
http://127.0.0.1:3000/admin/login
```

Demo credentials:

```text
Admin:
admin
Admin@12345

User:
3320568
User@12345
```

## CSV import format

```csv
name,idNumber,password,vip
Ahmed Test,1234567890,Temp@12345,yes
Mona Test,555777999,Welcome@123,no
```

The system creates a unique random 6-digit card number for every row.

## Deploy to Railway

The repository includes a Railway configuration and Dockerfile. Railway builds the
Dockerfile and starts the app with the persistent-storage startup script.

1. Push this repository to GitHub and create a Railway project using **Deploy from
   GitHub Repo**.
2. In the app service, add a Railway Volume mounted at `/data`. The app stores its
   SQLite database at `/data/rg-card.db` and uploaded files at `/data/uploads`.
   Keep this Volume attached to the service across deployments.
3. Add these variables in **Service → Variables**. Use new, independently
   generated secrets; do not copy values from `.env.example` or commit `.env`.

   ```env
   AUTH_SECRET=<unique-long-random-secret>
   SESSION_SECRET=<different-unique-long-random-secret>
   DATA_ENCRYPTION_SECRET=<unique-random-secret-at-least-32-characters>
   ```

   Keep `DATA_ENCRYPTION_SECRET` unchanged after the app has stored encrypted
   data. The Docker image configures the database and upload paths for `/data`.
4. Deploy, then use **Settings → Networking → Generate Domain** to create a public
   URL. Set `RG_CARD_PUBLIC_URL` to that complete HTTPS URL in **Service → Variables**.
   This is used in QR codes and generated card PDFs; do not use Railway's internal
   container address.
5. Wait for the deployment health check to pass, then open `<your-domain>/login`
   (admin login: `<your-domain>/admin/login`). Change the seeded admin password
   immediately if using the default seed data.

The startup script initializes the database on first launch and runs Prisma schema
updates on later launches. Do not run the seed command against an existing
production database. Back up the Railway Volume regularly; it contains the
database and uploaded files.

For instructions on transferring an existing local database and uploads, see
[the Railway deployment guide](./docs/v3.9.36-railway-ready.md).


## v16 QR alignment note
The member-card QR is now centered inside the full visible golden QR frame using the shared `CARD_TEMPLATE.qr` constants. The same constants are used by the browser preview and generated PDF output.


## v3.9.25 update

See `docs/v3.9.25-banner-logo-fit.md` for the New Arrival / Coming Soon banner, logo-sizing, and admin-control update.

## v3.9.28 notes

- The New Arrival / Coming Soon carousel uses two identical oversized marquee groups for a continuous, gap-free loop even with only one or two selected places.
- The New Arrival admin list has dedicated stable rows for easier adding on desktop and mobile.

## v3.9.27 notes

- Manage the public logo-only New Arrival / Coming Soon carousel from **Admin → New Arrival / Coming Soon**.
- Optional WhatsApp security alert delivery is configured through `SECURITY_ALERT_WEBHOOK_URL`; see `docs/v3.9.27-mobile-new-arrivals-security-alerts.md`.

## v3.9.29 notes

`New Arrival / Coming Soon` is now a standalone banner feature. It is configured from `/admin/new-arrivals` and is no longer tied to a Place or Offer. Run `npx prisma generate` and `npm run db:push` after upgrading.

The security alert webhook can be configured from `/admin/security-alerts`; the dashboard stores the URL/token encrypted using `DATA_ENCRYPTION_SECRET`. Environment variables are still supported and take priority.

## v3.9.36 Railway deployment

The production database is `/data/rg-card.db` and uploads are `/data/uploads`.
See [Deploy to Railway](#deploy-to-railway) and
[the Railway deployment guide](./docs/v3.9.36-railway-ready.md).
