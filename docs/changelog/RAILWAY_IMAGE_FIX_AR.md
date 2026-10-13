# RG-Card v3.9.37 — Railway Images Hotfix

## What this fixes

1. On the first Railway start, existing bundled images are copied into the persistent `/data/uploads` Volume before the app maps `/uploads/*` to it.
2. Adding a new place uploads its chosen logo as an actual PNG/JPG/WEBP file after the place is created. It no longer stores a large base64 image inside SQLite.
3. Existing-place and New Arrival logo uploads continue to use the persistent Volume.

## Apply this hotfix

Run from the root folder of the Git repository:

```bash
unzip -o ~/Downloads/RG-Card_v3.9.37_railway_images_hotfix.zip

git add Dockerfile scripts/railway-start.sh src/components/AdminPlacesClient.tsx RAILWAY_IMAGE_FIX_AR.md
git commit -m "Fix Railway persistent uploads"
git push
```

Railway deploys the new commit automatically. Wait until the deployment is `Success`.

## Restore the images already in your local project

The first Railway deployment created an empty persistent upload directory, so images that existed before Railway need to be copied to the Volume once.

Install/login to Railway CLI if necessary, then link your project and list the Volume:

```bash
npm install -g @railway/cli
railway login
railway link
railway volume list
```

Choose the Volume name shown by the command, then upload the folder that contains your original images:

```bash
railway volume files --volume YOUR_VOLUME_NAME upload public/uploads /uploads --overwrite
```

If your original images are in an older project folder, upload from that folder instead, for example:

```bash
railway volume files --volume YOUR_VOLUME_NAME upload "/root/Desktop/RG Card/new/rg_card_next_api_v3_9_33_backup/public/uploads" /uploads --overwrite
```

Restart the Railway service after the upload.

## Validate

- In Railway request logs, changing a place logo should show a successful request similar to:
  `POST /api/admin/places/<id>/logo 200`
- New place creation will create the place, then upload the selected logo automatically.
- Supported formats: PNG, JPG/JPEG, WEBP. Max file size: 2 MB.
