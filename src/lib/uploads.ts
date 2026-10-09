import path from 'path';

/**
 * Persistent upload directory for Railway. Locally it falls back to public/uploads.
 * Public file delivery is handled by /uploads/[...asset], not Next's startup-time
 * public folder manifest, so files uploaded after boot are immediately visible.
 */
export function uploadsRoot() {
  const configured = String(process.env.RG_CARD_UPLOADS_PATH || '').trim();
  return configured || path.join(process.cwd(), 'public', 'uploads');
}

export function uploadsPath(...parts: string[]) {
  return path.join(uploadsRoot(), ...parts);
}
