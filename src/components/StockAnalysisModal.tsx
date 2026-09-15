'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/fetcher';
import { ErrorBox, Spinner } from '@/components/ui';
import type { StockAnalysis, Tone } from '@/lib/stockAnalysis';

const TONE: Record<Tone, string> = { up: 'text-up', down: 'text-down', neutral: 'text-slate-200' };
const DOT: Record<Tone, string> = { up: 'bg-up', down: 'bg-down', neutral: 'bg-muted' };

export default function StockAnalysisModal({
  symbol,
  open,
  onClose,
}: {
  symbol: string;
  open: boolean;
  onClose: () => void;
}) {
  const [data, setData] = useState<{ name: string; analysis: StockAnalysis } | null>(null);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    setLoading(true);
    setErr('');
    setData(null);
    api<{ name: string; analysis: StockAnalysis }>(`/api/ai/stock?symbol=${encodeURIComponent(symbol)}`)
      .then((r) => alive && setData(r))
      .catch((e) => alive && setErr(e.message))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [open, symbol]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  const a = data?.analysis;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[88vh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-line bg-panel p-4 pb-8 sm:rounded-3xl sm:pb-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <div className="min-w-0">
            <div className="text-xs font-bold text-brand">✨ AI 종목 분석</div>
            <div className="truncate text-base font-bold">{data?.name ?? symbol}</div>
          </div>
          <button onClick={onClose} className="btn-ghost !px-3 !py-1.5 !text-xs" aria-label="닫기">
            ✕ 닫기
          </button>
        </div>

        {loading && <Spinner label="1년치 차트를 계산하는 중..." />}
        {err && <ErrorBox message={err} />}

        {a && (
          <div className="space-y-3">
            <div className="rounded-2xl bg-brand/10 p-3">
              <div className="text-sm font-bold leading-snug">{a.headline}</div>
              <p className="mt-1 text-xs leading-relaxed text-slate-300">{a.summary}</p>
            </div>

            <div>
              <div className="mb-1 flex justify-between text-xs">
                <span className="text-muted">종목 온도</span>
                <span className="font-bold">
                  {a.temperature.score}° · {a.temperature.label}
                </span>
              </div>
              <div className="relative h-2 rounded-full bg-gradient-to-r from-down via-slate-500 to-up">
                <span
                  className="absolute -top-1 h-4 w-1 rounded bg-white shadow"
                  style={{ left: `calc(${a.temperature.score}% - 2px)` }}
                />
              </div>
              <div className="mt-1 flex justify-between text-[10px] text-muted">
                <span>차가움</span>
                <span>뜨거움</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
              {a.metrics.map((m) => (
                <div key={m.label} className="rounded-xl bg-panel2 px-2.5 py-2">
                  <div className="text-[10px] text-muted">{m.label}</div>
                  <div className={`text-sm font-bold tabular-nums ${TONE[m.tone]}`}>{m.value}</div>
                  <div className="text-[10px] leading-tight text-muted">{m.hint}</div>
                </div>
              ))}
            </div>

            <div className="space-y-1.5">
              {a.signals.map((s) => (
                <div key={s.title} className="flex gap-2 rounded-xl border border-line p-2.5">
                  <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${DOT[s.tone]}`} />
                  <div>
                    <div className={`text-xs font-bold ${TONE[s.tone]}`}>{s.title}</div>
                    <p className="text-xs leading-relaxed text-slate-300">{s.detail}</p>
                  </div>
                </div>
              ))}
            </div>

            <div>
              <div className="mb-1 text-xs font-bold">✅ 체크포인트</div>
              <ul className="space-y-1">
                {a.checkpoints.map((c) => (
                  <li key={c} className="flex gap-1.5 text-xs leading-relaxed text-slate-300">
                    <span className="text-muted">•</span>
                    {c}
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-xl border border-brand/30 p-2.5">
              <div className="text-xs font-bold text-brand">📚 {a.lesson.concept}</div>
              <p className="mt-0.5 text-xs leading-relaxed text-slate-300">{a.lesson.explanation}</p>
            </div>

            <p className="text-[10px] leading-relaxed text-muted">
              {a.basis}. 과거 가격으로 계산한 학습용 참고 자료이며, 사거나 팔라는 조언이 아니에요.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
