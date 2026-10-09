import { readFile, stat } from 'fs/promises';
import path from 'path';
import { uploadsRoot } from '@/lib/uploads';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MIME_TYPES: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml'
};

function safeAssetPath(segments: string[]) {
  if (!segments.length) return null;
  if (segments.some((part) => !part || part === '.' || part === '..' || part.includes('\\') || part.includes('\0'))) return null;

  const root = path.resolve(uploadsRoot());
  const diskPath = path.resolve(root, ...segments);
  if (diskPath !== root && !diskPath.startsWith(`${root}${path.sep}`)) return null;
  return diskPath;
}

export async function GET(_request: Request, { params }: { params: { asset: string[] } }) {
  const diskPath = safeAssetPath(params.asset || []);
  if (!diskPath) return new Response('Not found', { status: 404 });

  try {
    const info = await stat(diskPath);
    if (!info.isFile()) return new Response('Not found', { status: 404 });

    const body = await readFile(diskPath);
    const ext = path.extname(diskPath).toLowerCase();
    return new Response(body, {
      headers: {
        'Content-Type': MIME_TYPES[ext] || 'application/octet-stream',
        'Content-Length': String(body.length),
        'Cache-Control': 'public, max-age=31536000, immutable',
        'X-Content-Type-Options': 'nosniff'
      }
    });
  } catch {
    return new Response('Not found', { status: 404 });
  }
}
