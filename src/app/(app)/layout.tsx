import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import Nav from '@/components/Nav';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  // 쿠키는 유효한데 계정이 없으면(삭제됨) 쿠키부터 지워야 리다이렉트 루프가 안 생긴다
  if (!user) redirect('/api/auth/logout');

  return (
    <div className="min-h-screen">
      <Nav name={user.name} role={user.role} />
      <main className="mx-auto max-w-7xl px-4 py-4 pb-24 sm:pb-4">{children}</main>
      <footer className="mx-auto max-w-7xl px-4 pb-24 pt-2 text-center text-xs text-muted sm:pb-8">
        시세는 Yahoo Finance 제공(약 15분 지연). 실제 투자와 무관한 학습용 모의 거래입니다.
      </footer>
    </div>
  );
}
