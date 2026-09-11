'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { post } from '@/lib/fetcher';
import { authErrorMessage } from '@/lib/authErrors';
import { ErrorBox } from '@/components/ui';
import GoogleButton from '@/components/GoogleButton';

export default function SignupForm({
  googleEnabled,
  inviteRequired,
}: {
  googleEnabled: boolean;
  inviteRequired: boolean;
}) {
  const router = useRouter();
  const sp = useSearchParams();

  const [form, setForm] = useState({ name: '', email: '', password: '', inviteCode: '' });
  const [err, setErr] = useState(authErrorMessage(sp.get('error')));
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
    <div className="card w-full max-w-sm space-y-4">
      <h1 className="text-xl font-bold">회원가입</h1>
      <ErrorBox message={err} />

      {inviteRequired && (
        <div>
          <label className="label">
            초대코드{googleEnabled && ' (구글 가입에도 필요합니다)'}
          </label>
          <input
            className="input"
            value={form.inviteCode}
            onChange={set('inviteCode')}
            placeholder="관리자에게 받은 코드"
          />
        </div>
      )}

      {googleEnabled && (
        <>
          <GoogleButton invite={form.inviteCode} />
          <div className="flex items-center gap-3 text-xs text-muted">
            <span className="h-px flex-1 bg-line" />
            또는 이메일로 가입
            <span className="h-px flex-1 bg-line" />
          </div>
        </>
      )}

      <form onSubmit={submit} className="space-y-4">
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
        <button className="btn-primary w-full" disabled={busy}>
          {busy ? '가입 중...' : '가입하고 시작하기'}
        </button>
      </form>

      <p className="text-center text-sm text-muted">
        이미 계정이 있나요?{' '}
        <Link href="/login" className="font-semibold text-brand hover:underline">
          로그인
        </Link>
      </p>
    </div>
  );
}
