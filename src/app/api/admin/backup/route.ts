import archiver from 'archiver';
import { createReadStream, createWriteStream } from 'node:fs';
import { access, mkdtemp, rm, stat } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import { NextRequest, NextResponse } from 'next/server';
import { forbidden, requireApiSession, unauthorized } from '@/lib/api';
import { adminHasPermission } from '@/lib/admin-auth';
import { writeAuditLog } from '@/lib/audit';
import { uploadsRoot } from '@/lib/uploads';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function getDatabasePath() {
  const configuredPath = String(process.env.RG_CARD_DB_PATH || '').trim();
  if (configuredPath) return path.resolve(configuredPath);

  const databaseUrl = String(process.env.DATABASE_URL || '');
  if (!databaseUrl.startsWith('file:')) {
    throw new Error('SQLite database path is not configured');
  }

  const relativeOrAbsolutePath = decodeURIComponent(databaseUrl.slice(5).split('?')[0]);
  if (!relativeOrAbsolutePath) throw new Error('SQLite database path is not configured');
  return path.resolve(relativeOrAbsolutePath);
}

export async function GET(request: NextRequest) {
  const admin = await requireApiSession(request, 'admin');
  if (!admin) return unauthorized();
  if (!(await adminHasPermission(admin, 'EXPORTS'))) {
    return forbidden('ليست لديك صلاحية إنشاء نسخة احتياطية');
  }

  let temporaryDirectory: string | null = null;
  try {
    const databasePath = getDatabasePath();
    const uploadDirectory = uploadsRoot();
    const publicDirectory = path.join(process.cwd(), 'public');
    const publicAssets = [
      { source: path.join(publicDirectory, 'logos'), archivePath: 'public/logos', directory: true },
      { source: path.join(publicDirectory, 'rg-card-template-logos'), archivePath: 'public/rg-card-template-logos', directory: true },
      { source: path.join(publicDirectory, 'card-template.jpg'), archivePath: 'public/card-template.jpg', directory: false },
      { source: path.join(publicDirectory, 'card-template.png'), archivePath: 'public/card-template.png', directory: false },
      { source: path.join(publicDirectory, 'sample-card.pdf'), archivePath: 'public/sample-card.pdf', directory: false },
    ];
    const [uploadDirectoryStat] = await Promise.all([stat(uploadDirectory), access(databasePath)]);
    if (!uploadDirectoryStat.isDirectory()) throw new Error('The uploads path is not a directory');
    await Promise.all(publicAssets.map(({ source }) => access(source)));

    temporaryDirectory = await mkdtemp(path.join(os.tmpdir(), 'rg-card-backup-'));
    const databaseSnapshotPath = path.join(temporaryDirectory, 'rg-card.db');
    const archivePath = path.join(temporaryDirectory, 'rg-card-backup.zip');

    const escapedSnapshotPath = databaseSnapshotPath.replace(/'/g, "''");
    await prisma.$executeRawUnsafe(`VACUUM INTO '${escapedSnapshotPath}'`);

    const archive = archiver('zip', { zlib: { level: 6 } });
    archive.file(databaseSnapshotPath, { name: 'database/rg-card.db' });
    archive.directory(uploadDirectory, 'uploads');
    for (const asset of publicAssets) {
      if (asset.directory) archive.directory(asset.source, asset.archivePath);
      else archive.file(asset.source, { name: asset.archivePath });
    }
    archive.append(JSON.stringify({
      formatVersion: 1,
      createdAt: new Date().toISOString(),
      database: 'database/rg-card.db',
      uploads: 'uploads/',
      publicAssets: publicAssets.map(({ archivePath }) => archivePath),
    }, null, 2), { name: 'manifest.json' });

    const archiveWrite = pipeline(archive, createWriteStream(archivePath));
    await Promise.all([archive.finalize(), archiveWrite]);

    await writeAuditLog(request, 'ADMIN_DOWNLOAD_FULL_BACKUP', { adminId: admin.sub }, {
      includesDatabase: true,
      includesUploads: true,
      includesPublicAssets: true,
    });

    const fileStream = createReadStream(archivePath);
    const cleanup = () => {
      if (temporaryDirectory) void rm(temporaryDirectory, { recursive: true, force: true });
    };
    fileStream.once('close', cleanup);
    fileStream.once('error', cleanup);
    const fileIterator = fileStream[Symbol.asyncIterator]();
    const responseStream = new ReadableStream<Uint8Array>({
      async pull(controller) {
        try {
          const { done, value } = await fileIterator.next();
          if (done) controller.close();
          else controller.enqueue(value);
        } catch (error) {
          controller.error(error);
        }
      },
      cancel() {
        fileStream.destroy();
      },
    });

    const filename = `rg-card-backup-${new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')}.zip`;
    return new NextResponse(responseStream, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'private, no-store, no-cache, must-revalidate',
        Pragma: 'no-cache',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    console.error('Failed to create the admin backup archive', error);
    if (temporaryDirectory) await rm(temporaryDirectory, { recursive: true, force: true });
    return NextResponse.json(
      { ok: false, message: 'تعذر إنشاء النسخة الاحتياطية. حاول مرة أخرى أو راجع سجل الخادم.' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
