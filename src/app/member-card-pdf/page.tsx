import { redirect } from 'next/navigation';
import { Container, Typography } from '@mui/material';
import PublicShell from '@/components/PublicShell';
import PdfPreview from '@/components/PdfPreview';
import { getSession } from '@/lib/session';

export default async function MemberCardPdfPage() {
  const session = await getSession('user');
  if (!session) redirect('/login');
  return (
    <PublicShell watermarkText={session.cardNumber} page="member-card-pdf">
      <Container maxWidth="md" className="rg-valid-card" sx={{ pb: 8 }}>
        <Typography variant="h4" fontWeight={900} mb={3}>معاينة الكارت PDF</Typography>
        <PdfPreview />
      </Container>
    </PublicShell>
  );
}
