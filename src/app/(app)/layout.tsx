import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import Nav from '@/components/Nav';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  return (
    <div className="min-h-screen">
      <Nav name={user.name} role={user.role} />
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
      <footer className="mx-auto max-w-6xl px-4 pb-10 pt-4 text-center text-xs text-muted">
        시세는 Yahoo Finance 제공(약 15분 지연). 실제 투자와 무관한 학습용 모의 거래입니다.
      </footer>
    </div>
  );
}
