'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { post } from '@/lib/fetcher';
import { ErrorBox } from '@/components/ui';

function LoginForm() {
  const router = useRouter();
  const next = useSearchParams().get('next') || '/dashboard';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
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
    <form onSubmit={submit} className="card w-full max-w-sm space-y-4">
      <div>
        <h1 className="text-xl font-bold">로그인</h1>
        <p className="mt-1 text-sm text-muted">우리들의 주식 리그에 참가하세요</p>
      </div>
      <ErrorBox message={err} />
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
      <p className="text-center text-sm text-muted">
        계정이 없나요?{' '}
        <Link href="/signup" className="font-semibold text-brand hover:underline">
          회원가입
        </Link>
      </p>
    </form>
  );
}

export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-4">
      <div className="text-center">
        <div className="text-3xl font-black tracking-tight">📈 모의투자</div>
        <div className="mt-1 text-sm text-muted">실전처럼 연습하는 주식 투자</div>
      </div>
      <Suspense>
        <LoginForm />
      </Suspense>
    </main>
  );
}
