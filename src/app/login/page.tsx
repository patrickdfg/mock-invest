import { Suspense } from 'react';
import LoginForm from '@/components/LoginForm';
import { isGoogleEnabled } from '@/lib/google';
import { Spinner } from '@/components/ui';

export const dynamic = 'force-dynamic';

export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 py-10">
      <div className="text-center">
        <div className="text-3xl font-black tracking-tight">📈 모의투자</div>
        <div className="mt-1 text-sm text-muted">실전처럼 연습하는 주식 투자</div>
      </div>
      <Suspense fallback={<Spinner />}>
        <LoginForm googleEnabled={isGoogleEnabled()} />
      </Suspense>
    </main>
  );
}
