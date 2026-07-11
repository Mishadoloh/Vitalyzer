import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import Sidebar from '@/components/Sidebar';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) redirect('/');

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { isGuest: true, subscriptionStatus: true } });
  const active = user?.isGuest || user?.subscriptionStatus === 'active' || user?.subscriptionStatus === 'trialing';
  if (!active) redirect('/billing');

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <Sidebar />
      <main className="w-full max-w-[1240px] flex-1 px-4 py-5 sm:px-8 sm:py-7 lg:px-10">{children}</main>
    </div>
  );
}
