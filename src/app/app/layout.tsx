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
    <div className="min-h-screen bg-[linear-gradient(180deg,#11141b_0%,#0f1115_42%,#101319_100%)]">
      <div className="pointer-events-none fixed inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/40 to-transparent" />
      <div className="flex min-h-screen flex-col lg:flex-row">
        <Sidebar />
        <main className="min-w-0 w-full flex-1 px-3 pb-[calc(6.5rem+env(safe-area-inset-bottom))] pt-4 sm:px-5 sm:pt-5 lg:px-7 lg:pb-7 xl:px-8">
          <div className="mx-auto w-full max-w-[1280px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
