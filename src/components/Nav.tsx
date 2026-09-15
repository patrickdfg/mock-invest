'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { post } from '@/lib/fetcher';

const LINKS = [
  { href: '/dashboard', label: '홈', icon: '🏠' },
  { href: '/trade', label: '거래', icon: '📊' },
  { href: '/portfolio', label: '내 자산', icon: '💰' },
  { href: '/diagnosis', label: 'AI 진단', icon: '🤖' },
  { href: '/history', label: '내역', icon: '📜' },
  { href: '/ranking', label: '랭킹', icon: '🏆' },
];

export default function Nav({ name, role }: { name: string; role: string }) {
  const pathname = usePathname();
  const router = useRouter();

  const links = role === 'ADMIN' ? [...LINKS, { href: '/admin', label: '관리', icon: '⚙️' }] : LINKS;

  async function logout() {
    await post('/api/auth/logout', {});
    router.replace('/login');
    router.refresh();
  }

  return (
    <>
      {/* 상단 바 */}
      <header className="sticky top-0 z-30 border-b border-line bg-bg/90 backdrop-blur">
        <div className="mx-auto flex h-12 max-w-7xl items-center gap-1 px-4">
          <Link href="/dashboard" className="mr-3 shrink-0 text-base font-black tracking-tight">
            📈 모의투자
          </Link>

          {/* 데스크톱 메뉴 */}
          <nav className="hidden flex-1 items-center gap-1 sm:flex">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                  pathname.startsWith(l.href)
                    ? 'bg-panel2 text-white'
                    : 'text-muted hover:text-slate-200'
                }`}
              >
                {l.label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <span className="hidden text-sm text-muted sm:inline">{name}님</span>
            <button onClick={logout} className="btn-ghost !px-2.5 !py-1 !text-xs">
              로그아웃
            </button>
          </div>
        </div>
      </header>

      {/* 모바일 하단 탭바: 화면 어디서든 한 번에 닿는다 */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-bg/95 backdrop-blur sm:hidden">
        <ul className="mx-auto flex max-w-lg">
          {links.map((l) => {
            const active = pathname.startsWith(l.href);
            return (
              <li key={l.href} className="flex-1">
                <Link
                  href={l.href}
                  className={`flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition ${
                    active ? 'text-brand' : 'text-muted'
                  }`}
                >
                  <span className="text-base leading-none">{l.icon}</span>
                  {l.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
