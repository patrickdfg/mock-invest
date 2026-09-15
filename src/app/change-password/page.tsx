'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, post } from '@/lib/fetcher';
import { ErrorBox, Spinner } from '@/components/ui';

type Me = { name: string; mustChangePassword: boolean; hasPassword: boolean };

export default function ChangePasswordPage() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [err, setErr] = useState('');
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<Me>('/api/me')
      .then(setMe)
      .catch(() => router.replace('/login'));
  }, [router]);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [k]: e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    if (form.newPassword !== form.confirm) {
      setErr('새 비밀번호 확인이 일치하지 않아요.');
      return;
    }
    setBusy(true);
    try {
      await post('/api/auth/password', {
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });
      setDone(true);
      setTimeout(() => {
        router.replace('/dashboard');
        router.refresh();
      }, 900);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    await post('/api/auth/logout', {});
    router.replace('/login');
    router.refresh();
  }

  if (!me) return <Spinner />;
  const forced = me.mustChangePassword;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 py-10">
      <div className="text-center">
        <div className="text-3xl font-black tracking-tight">🔑 비밀번호 변경</div>
        <div className="mt-1 text-sm text-muted">{me.name}님</div>
      </div>

      <form onSubmit={submit} className="card w-full max-w-sm space-y-4">
        {forced && (
          <div className="rounded-xl border border-brand/40 bg-brand/10 px-3.5 py-2.5 text-sm leading-relaxed text-brand">
            관리자가 비밀번호를 <b>0000</b>으로 초기화했어요.
            <br />새 비밀번호로 바꿔야 앱을 계속 쓸 수 있어요.
          </div>
        )}
        <ErrorBox message={err} />
        {done && (
          <div className="rounded-xl border border-emerald-400/40 bg-emerald-400/10 px-3.5 py-2.5 text-sm text-emerald-400">
            비밀번호를 바꿨어요. 홈으로 이동합니다.
          </div>
        )}

        {me.hasPassword && (
          <div>
            <label className="label">현재 비밀번호{forced && ' (초기화된 경우 0000)'}</label>
            <input
              className="input"
              type="password"
              value={form.currentPassword}
              onChange={set('currentPassword')}
              autoComplete="current-password"
              required
            />
          </div>
        )}
        <div>
          <label className="label">새 비밀번호 (6자 이상)</label>
          <input
            className="input"
            type="password"
            value={form.newPassword}
            onChange={set('newPassword')}
            minLength={6}
            autoComplete="new-password"
            required
          />
        </div>
        <div>
          <label className="label">새 비밀번호 확인</label>
          <input
            className="input"
            type="password"
            value={form.confirm}
            onChange={set('confirm')}
            minLength={6}
            autoComplete="new-password"
            required
          />
        </div>

        <button className="btn-primary w-full" disabled={busy || done}>
          {busy ? '바꾸는 중...' : '비밀번호 바꾸기'}
        </button>

        <div className="flex justify-between text-sm">
          {forced ? (
            <span />
          ) : (
            <Link href="/dashboard" className="text-muted hover:text-slate-200">
              ← 돌아가기
            </Link>
          )}
          <button type="button" onClick={logout} className="text-muted hover:text-slate-200">
            로그아웃
          </button>
        </div>
      </form>
    </main>
  );
}
