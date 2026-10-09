# RG-Card v3.9.44 — QR Public URL + Off-White Canvas

## QR code fix
QR codes now use a browser-safe public origin. Railway's internal container address (`0.0.0.0:8080`) is rejected and never embedded in a QR code.

For the current deployment, the default public URL is:

```text
https://rg-card-web-production-9ece.up.railway.app
```

For a future custom domain, add or update this Railway service variable, then redeploy:

```env
RG_CARD_PUBLIC_URL=https://your-domain.example
```

This applies to: member QR, admin QR, individual card PDF, and bulk cards PDF. A QR opens `/login?card=<card-number>` and still requires the user's password.

## Off-white background
The global public, admin, and login page canvas now uses a calmer off-white palette.
