'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { post } from '@/lib/fetcher';
import { authErrorMessage } from '@/lib/authErrors';
import { ErrorBox } from '@/components/ui';
import GoogleButton from '@/components/GoogleButton';

export default function LoginForm({ googleEnabled }: { googleEnabled: boolean }) {
  const router = useRouter();
  const sp = useSearchParams();
  const next = sp.get('next') || '/dashboard';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState(authErrorMessage(sp.get('error')));
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    setBusy(true);
    try {
      await post('/api/auth/login', { email, password });
      router.replace(next);
      router.refresh();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card w-full max-w-sm space-y-4">
      <div>
        <h1 className="text-xl font-bold">로그인</h1>
        <p className="mt-1 text-sm text-muted">우리들의 주식 리그에 참가하세요</p>
      </div>

      <ErrorBox message={err} />

      {googleEnabled && (
        <>
          <GoogleButton />
          <div className="flex items-center gap-3 text-xs text-muted">
            <span className="h-px flex-1 bg-line" />
            또는 이메일로
            <span className="h-px flex-1 bg-line" />
          </div>
        </>
      )}

      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="label">이메일</label>
          <input
            className="input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@school.kr"
            required
          />
        </div>
        <div>
          <label className="label">비밀번호</label>
          <input
            className="input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <button className="btn-primary w-full" disabled={busy}>
          {busy ? '확인 중...' : '로그인'}
        </button>
      </form>

      <p className="text-center text-sm text-muted">
        계정이 없나요?{' '}
        <Link href="/signup" className="font-semibold text-brand hover:underline">
          회원가입
        </Link>
      </p>
    </div>
  );
}
