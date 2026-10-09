import { json } from '@/lib/api';
import { getPublicSettings } from '@/lib/settings';

export const dynamic = 'force-dynamic';

export async function GET() {
  return json({ ok: true, data: await getPublicSettings() });
}
