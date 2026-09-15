'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, post } from '@/lib/fetcher';
import { Spinner, ErrorBox } from '@/components/ui';
import DiagnosisReport from '@/components/DiagnosisReport';
import type { Diagnosis } from '@/lib/aiPrompt';

type Saved = { id: string; createdAt: string; model: string; result: Diagnosis };
type Quota = { used: number; remaining: number; cooldownUntil: string | null };
type Info = {
  mode: 'claude' | 'rule';
  latest: Saved | null;
  quota: Quota;
  limits: { perDay: number; cooldownMinutes: number };
};

const STEPS = [
  '계좌 정보를 정리하는 중...',
  '종목 비중을 살펴보는 중...',
  '매매 습관을 분석하는 중...',
  '리포트를 쓰는 중...',
];

export default function DiagnosisPage() {
  const [info, setInfo] = useState<Info | null>(null);
  const [running, setRunning] = useState(false);
  const [step, setStep] = useState(0);
  const [err, setErr] = useState('');

  const load = useCallback(
    () => api<Info>('/api/ai/diagnosis').then(setInfo).catch((e) => setErr(e.message)),
    []
  );

  useEffect(() => {
    load();
  }, [load]);

  // 대기 시간이 길어 진행 문구를 바꿔 보여준다
  useEffect(() => {
    if (!running) return;
    setStep(0);
    const t = setInterval(() => setStep((s) => Math.min(s + 1, STEPS.length - 1)), 7000);
    return () => clearInterval(t);
  }, [running]);

  // 쿨다운이 끝나면 버튼이 다시 살아나도록 그 시점에 재조회
  const cooldownUntil = info?.quota.cooldownUntil;
  useEffect(() => {
    if (!cooldownUntil) return;
    const ms = new Date(cooldownUntil).getTime() - Date.now();
    const t = setTimeout(load, Math.max(1000, ms + 500));
    return () => clearTimeout(t);
  }, [cooldownUntil, load]);

  async function run() {
    setErr('');
    setRunning(true);
    try {
      const r = await post<{ diagnosis: Saved; quota: Quota }>('/api/ai/diagnosis', {});
      setInfo((prev) => (prev ? { ...prev, latest: r.diagnosis, quota: r.quota } : prev));
    } catch (e: any) {
      setErr(e.message);
      load();
    } finally {
      setRunning(false);
    }
  }

  if (!info) return err ? <ErrorBox message={err} /> : <Spinner />;

  const isClaude = info.mode === 'claude';
  const blocked =
    running || (isClaude && (info.quota.remaining <= 0 || Boolean(info.quota.cooldownUntil)));
  const cooldownText = info.quota.cooldownUntil
    ? ` · ${new Date(info.quota.cooldownUntil).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })} 이후 가능`
    : '';

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div>
        <h1 className="text-xl font-bold">🤖 AI 투자 진단</h1>
        <p className="mt-0.5 text-xs text-muted">
          내 계좌와 매매 기록을 AI가 살펴보고 투자 습관을 진단해줘요
        </p>
      </div>

      <section className="card">
        <div className="flex flex-wrap items-center gap-3">
          <button onClick={run} disabled={blocked} className="btn-primary">
            {running ? '진단 중...' : info.latest ? '다시 진단받기' : 'AI 진단 받기'}
          </button>
          <span className="text-xs text-muted">
            {isClaude
              ? `Claude AI · 오늘 남은 횟수 ${info.quota.remaining}/${info.limits.perDay}${cooldownText}`
              : '규칙 기반 분석 · 횟수 제한 없음 · 바로 결과가 나와요'}
          </span>
        </div>

        {running && (
          <div className="mt-3 flex items-center gap-2 text-sm text-brand">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-line border-t-brand" />
            {STEPS[step]}
            {isClaude && <span className="text-xs text-muted">(20~40초 걸려요)</span>}
          </div>
        )}
        {err && (
          <div className="mt-3">
            <ErrorBox message={err} />
          </div>
        )}
      </section>

      {info.latest ? (
        <DiagnosisReport data={info.latest} />
      ) : (
        !running && (
          <div className="card py-10 text-center text-sm text-muted">
            아직 받은 진단이 없어요. 위 버튼을 눌러 첫 진단을 받아보세요.
          </div>
        )
      )}

      <p className="text-center text-[11px] leading-relaxed text-muted">
        AI 진단은 학습용 참고 자료예요. 특정 종목을 사거나 팔라는 조언이 아니며,
        실제 투자 판단에 쓰면 안 돼요.
      </p>
    </div>
  );
}
