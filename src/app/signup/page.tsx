import { Suspense } from 'react';
import SignupForm from '@/components/SignupForm';
import { isGoogleEnabled } from '@/lib/google';
import { config } from '@/lib/config';
import { Spinner } from '@/components/ui';

export const dynamic = 'force-dynamic';

export default function SignupPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 py-10">
      <div className="text-center">
        <div className="text-3xl font-black tracking-tight">📈 모의투자</div>
        <div className="mt-1 text-sm text-muted">가입하면 시드머니가 지급됩니다</div>
      </div>
      <Suspense fallback={<Spinner />}>
        <SignupForm googleEnabled={isGoogleEnabled()} inviteRequired={Boolean(config.inviteCode)} />
      </Suspense>
    </main>
  );
}
