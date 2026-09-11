'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { post } from '@/lib/fetcher';

const LINKS = [
  { href: '/dashboard', label: '홈' },
  { href: '/trade', label: '거래' },
  { href: '/portfolio', label: '내 자산' },
  { href: '/history', label: '거래내역' },
  { href: '/ranking', label: '랭킹' },
];

export default function Nav({ name, role }: { name: string; role: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const links = role === 'ADMIN' ? [...LINKS, { href: '/admin', label: '관리' }] : LINKS;

  async function logout() {
    await post('/api/auth/logout', {});
    router.replace('/login');
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-bg/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-1 px-4">
        <Link href="/dashboard" className="mr-3 shrink-0 text-base font-black tracking-tight">
          📈 모의투자
        </Link>

        <nav className="hidden flex-1 items-center gap-1 sm:flex">
          {links.map((l) => {
            const active = pathname.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                  active ? 'bg-panel2 text-white' : 'text-muted hover:text-slate-200'
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <span className="hidden text-sm text-muted sm:inline">{name}님</span>
          <button onClick={logout} className="btn-ghost !px-3 !py-1.5 !text-xs">
            로그아웃
          </button>
          <button
            onClick={() => setOpen(!open)}
            className="btn-ghost !px-3 !py-1.5 !text-xs sm:hidden"
            aria-label="메뉴"
          >
            ☰
          </button>
        </div>
      </div>

      {open && (
        <nav className="grid grid-cols-3 gap-1 border-t border-line px-4 py-2 sm:hidden">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className={`rounded-lg px-3 py-2 text-center text-sm font-medium ${
                pathname.startsWith(l.href) ? 'bg-panel2 text-white' : 'text-muted'
              }`}
            >
              {l.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
