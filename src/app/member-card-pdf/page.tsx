import { redirect } from 'next/navigation';
import PublicShell from '@/components/PublicShell';
import PdfPreview from '@/components/PdfPreview';
import { getSession } from '@/lib/session';

export const metadata = { title: 'نسخة PDF' };

export default async function MemberCardPdfPage() {
  const session = await getSession('user');
  if (!session) redirect('/login');
  return (
    <PublicShell watermarkText={session.cardNumber} page="member-card-pdf">
      <main className="ui-main">
        <div className="ui-container"><PdfPreview /></div>
      </main>
    </PublicShell>
  );
}
