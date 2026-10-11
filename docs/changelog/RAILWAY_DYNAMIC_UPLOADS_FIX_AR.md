# RG-Card v3.9.38 — Railway dynamic uploads fix

## What this fixes
- Place logo upload can return `200` but the next image request returns `404`.
- New Arrival / Coming Soon banner logo uploads use the same persistent storage.
- Card template uploads use the same persistent storage.

## Root cause
Next.js production indexes `public/` at startup. Files created later in `public/uploads` can exist on disk but still resolve to `404`.

## Solution
- Files are written directly to `RG_CARD_UPLOADS_PATH` (`/data/uploads` on Railway).
- `/uploads/*` is now served by the dynamic route `src/app/uploads/[...asset]/route.ts`.
- The startup script no longer symlinks `/app/public/uploads` to the volume.

## Deployment
Unzip over the project, commit, push to `main`, then wait for Railway deployment success. Existing URLs such as `/uploads/places/...png` keep working.
