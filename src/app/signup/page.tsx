'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { post } from '@/lib/fetcher';
import { ErrorBox } from '@/components/ui';

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: '', email: '', password: '', inviteCode: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [k]: e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    setBusy(true);
    try {
      await post('/api/auth/signup', form);
      router.replace('/dashboard');
      router.refresh();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 py-10">
      <div className="text-center">
        <div className="text-3xl font-black tracking-tight">📈 모의투자</div>
        <div className="mt-1 text-sm text-muted">가입하면 시드머니가 지급됩니다</div>
      </div>

      <form onSubmit={submit} className="card w-full max-w-sm space-y-4">
        <h1 className="text-xl font-bold">회원가입</h1>
        <ErrorBox message={err} />

        <div>
          <label className="label">이름 (랭킹에 표시됨)</label>
          <input className="input" value={form.name} onChange={set('name')} maxLength={20} required />
        </div>
        <div>
          <label className="label">이메일</label>
          <input className="input" type="email" value={form.email} onChange={set('email')} required />
        </div>
        <div>
          <label className="label">비밀번호 (6자 이상)</label>
          <input
            className="input"
            type="password"
            value={form.password}
            onChange={set('password')}
            minLength={6}
            required
          />
        </div>
        <div>
          <label className="label">초대코드</label>
          <input
            className="input"
            value={form.inviteCode}
            onChange={set('inviteCode')}
            placeholder="관리자에게 받은 코드"
          />
        </div>

        <button className="btn-primary w-full" disabled={busy}>
          {busy ? '가입 중...' : '가입하고 시작하기'}
        </button>
        <p className="text-center text-sm text-muted">
          이미 계정이 있나요?{' '}
          <Link href="/login" className="font-semibold text-brand hover:underline">
            로그인
          </Link>
        </p>
      </form>
    </main>
  );
}
