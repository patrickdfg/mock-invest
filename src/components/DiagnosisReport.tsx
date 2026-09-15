'use client';

import type { Diagnosis } from '@/lib/aiPrompt';

const GRADE_STYLE: Record<Diagnosis['grade'], string> = {
  S: 'border-yellow-300/60 text-yellow-300',
  A: 'border-emerald-400/60 text-emerald-400',
  B: 'border-brand/60 text-brand',
  C: 'border-orange-400/60 text-orange-400',
  D: 'border-up/60 text-up',
};

const LEVEL_STYLE: Record<Diagnosis['risks'][number]['level'], string> = {
  낮음: 'bg-emerald-500/15 text-emerald-400',
  보통: 'bg-orange-500/15 text-orange-400',
  높음: 'bg-up/15 text-up',
};

export default function DiagnosisReport({
  data,
}: {
  data: { createdAt: string; model: string; result: Diagnosis };
}) {
  const r = data.result;

  return (
    <div className="space-y-4">
      <section className="card">
        <div className="flex items-center gap-4">
          <div
            className={`flex h-20 w-20 shrink-0 flex-col items-center justify-center rounded-2xl border-2 ${GRADE_STYLE[r.grade]}`}
          >
            <span className="text-3xl font-black leading-none">{r.grade}</span>
            <span className="mt-1 text-xs tabular-nums">{r.score}점</span>
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-bold leading-snug">{r.headline}</h2>
            <p className="mt-1 text-sm leading-relaxed text-slate-300">{r.summary}</p>
          </div>
        </div>
        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-panel2">
          <div className="h-full bg-brand" style={{ width: `${r.score}%` }} />
        </div>
        <p className="mt-2 text-right text-[11px] text-muted">
          {new Date(data.createdAt).toLocaleString('ko-KR')} 진단 ·{' '}
          {data.model === 'rule-engine' ? '규칙 기반 분석' : 'Claude AI 분석'}
        </p>
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        <ListCard title="👍 잘하고 있는 점" items={r.strengths} />
        <ListCard title="🔁 매매 습관" items={r.habits} />
      </div>

      <section className="card">
        <h3 className="mb-2 font-semibold">⚠️ 주의할 점</h3>
        <ul className="space-y-2">
          {r.risks.map((x, i) => (
            <li key={i} className="rounded-xl bg-panel2 p-3">
              <div className="flex items-center gap-2">
                <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold ${LEVEL_STYLE[x.level]}`}>
                  위험 {x.level}
                </span>
                <span className="text-sm font-semibold">{x.title}</span>
              </div>
              <p className="mt-1 text-sm leading-relaxed text-slate-300">{x.detail}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="card">
        <h3 className="mb-2 font-semibold">📚 오늘의 투자 공부</h3>
        <div className="grid gap-2 md:grid-cols-2">
          {r.lessons.map((l, i) => (
            <div key={i} className="rounded-xl border border-line p-3">
              <div className="text-sm font-bold text-brand">{l.concept}</div>
              <p className="mt-1 text-sm leading-relaxed text-slate-300">{l.explanation}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="card">
        <h3 className="mb-2 font-semibold">✅ 다음에 해볼 것</h3>
        <ol className="space-y-1.5">
          {r.nextSteps.map((s, i) => (
            <li key={i} className="flex gap-2 text-sm leading-relaxed">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand/20 text-[11px] font-bold text-brand">
                {i + 1}
              </span>
              <span className="text-slate-300">{s}</span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}

function ListCard({ title, items }: { title: string; items: string[] }) {
  return (
    <section className="card">
      <h3 className="mb-2 font-semibold">{title}</h3>
      <ul className="space-y-1.5">
        {items.map((t, i) => (
          <li key={i} className="flex gap-2 text-sm leading-relaxed text-slate-300">
            <span className="text-muted">•</span>
            <span>{t}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
