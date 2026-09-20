import { categoryMeta, priorityMeta, statusMeta } from '../lib/format';
import { ShieldAlert, Sparkles, Cpu } from 'lucide-react';

export function StatusBadge({ status, size = 'md' }: { status: string; size?: 'sm' | 'md' }) {
  const m = statusMeta(status);
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-semibold ring-1 ${
        size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs'
      } ${m.classes}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${m.dot}`} />
      {m.label}
    </span>
  );
}

export function PriorityBadge({ band, score, size = 'md' }: { band: string; score?: number; size?: 'sm' | 'md' }) {
  const m = priorityMeta(band);
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-bold ring-1 ${
        size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs'
      } ${m.classes}`}
    >
      {m.label}
      {score !== undefined && <span className="opacity-80">· {score}</span>}
    </span>
  );
}

export function CategoryBadge({ category, size = 'md' }: { category: string; size?: 'sm' | 'md' }) {
  const m = categoryMeta(category);
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-semibold ring-1 ${
        size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs'
      } ${m.classes}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${m.dot}`} />
      {category}
    </span>
  );
}

export function SeverityDots({ level }: { level: number }) {
  return (
    <span className="inline-flex items-center gap-1" title={`Severity ${level}/5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          className={`h-2 w-2 rounded-full ${i <= level ? (level >= 4 ? 'bg-red-500' : level === 3 ? 'bg-orange-500' : 'bg-amber-400') : 'bg-slate-200'}`}
        />
      ))}
    </span>
  );
}

export function AIBadge({ provider, confidence }: { provider?: string | null; confidence?: number | null }) {
  const isGemini = provider === 'gemini';
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${
        isGemini ? 'bg-violet-100 text-violet-800 ring-violet-200' : 'bg-slate-100 text-slate-700 ring-slate-200'
      }`}
      title={isGemini ? 'Classified by Gemini AI' : 'Classified by deterministic fallback engine'}
    >
      {isGemini ? <Sparkles className="h-3.5 w-3.5" /> : <Cpu className="h-3.5 w-3.5" />}
      {isGemini ? 'Gemini AI' : 'Rule Engine'}
      {confidence !== null && confidence !== undefined && (
        <span className="opacity-70">{Math.round(confidence * 100)}%</span>
      )}
    </span>
  );
}

export function SafetyBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-1 text-xs font-bold text-red-700 ring-1 ring-red-200">
      <ShieldAlert className="h-3.5 w-3.5" /> Safety Risk
    </span>
  );
}
