import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { getCardRenderSettings } from '@/lib/settings';
import { membershipLabel } from '@/lib/card-layout';
import MemberExperienceClient from '@/components/MemberExperienceClient';

export const metadata = { title: 'بطاقتي' };

export default async function ValidPage() {
  const session = await getSession('user');
  if (!session) redirect('/login');
  const user = await prisma.user.findUnique({ where: { id: session.sub }, select: { isVip: true, membershipClass: true, validUntil: true, mustChangePassword: true } });
  if (user?.mustChangePassword) redirect('/change-password');
  const layout = await getCardRenderSettings();
  return <MemberExperienceClient
    name={session.name || ''}
    cardNumber={session.cardNumber || ''}
    isVip={Boolean(user?.isVip)}
    membershipClass={user?.membershipClass || null}
    validUntil={user?.validUntil?.toISOString() || null}
    classLabel={membershipLabel(user?.membershipClass, Boolean(user?.isVip))}
    layout={layout}
  />;
}
