import { useState } from 'react';
import { ChevronDown, Info } from 'lucide-react';
import type { PriorityFactor } from '../types';

const EXPLAIN: Record<string, string> = {
  severity: 'Base urgency from AI-assessed severity (1–5). Worth up to 30 points.',
  duplicates: 'Each additional linked report adds weight, capped at 8 reports (20 pts).',
  affected: 'Log-scaled estimate of citizens impacted (15 pts max).',
  safety: 'Flat 20 points when the AI detects injury, electrical, collapse or contamination risk.',
  location: 'High-sensitivity zones (schools, hospitals, stations, main roads) add up to 10 points.',
  age: 'Issues waiting longer than 72h earn up to 5 points so nothing is forgotten.',
};

export default function PriorityExplainer({
  score,
  band,
  factors,
  compact = false,
}: {
  score: number;
  band: string;
  factors: PriorityFactor[];
  compact?: boolean;
}) {
  const [open, setOpen] = useState(!compact);
  const pct = Math.min(100, Math.max(0, score));
  const color =
    band === 'CRITICAL' ? 'from-red-500 to-red-700' : band === 'HIGH' ? 'from-orange-500 to-red-500' : band === 'MEDIUM' ? 'from-amber-400 to-orange-500' : 'from-slate-400 to-slate-500';

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between gap-3 text-left"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2 text-sm font-bold text-slate-800">
          <Info className="h-4 w-4 text-sky-600" />
          Why this priority? <span className="font-black text-slate-900">{score}/100</span>
          <span
            className={`rounded-full px-2 py-0.5 text-[11px] font-extrabold uppercase tracking-wide ${
              band === 'CRITICAL'
                ? 'bg-red-600 text-white'
                : band === 'HIGH'
                  ? 'bg-orange-500 text-white'
                  : band === 'MEDIUM'
                    ? 'bg-amber-400 text-amber-950'
                    : 'bg-slate-500 text-white'
            }`}
          >
            {band}
          </span>
        </span>
        <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full bg-gradient-to-r transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>

      {open && (
        <div className="mt-4 space-y-3">
          {(factors || []).map((f) => (
            <div key={f.key}>
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700">{f.label}</span>
                <span className="font-bold tabular-nums text-slate-900">
                  {f.points}<span className="font-medium text-slate-400">/{f.max}</span>
                </span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
                <div
                  className={`h-full rounded-full bg-gradient-to-r ${color}`}
                  style={{ width: `${Math.min(100, (f.points / Math.max(1, f.max)) * 100)}%` }}
                />
              </div>
              {EXPLAIN[f.key] && <p className="mt-1 text-[11px] leading-relaxed text-slate-400">{EXPLAIN[f.key]}</p>}
            </div>
          ))}
          <p className="rounded-xl bg-sky-50 px-3 py-2.5 text-[11px] leading-relaxed text-sky-800 ring-1 ring-sky-100">
            Score = severity (30) + duplicates (20) + affected (15) + safety (20) + location (10) + age (5).
            Recalculated automatically whenever new duplicate reports link to the issue.
          </p>
        </div>
      )}
    </div>
  );
}
