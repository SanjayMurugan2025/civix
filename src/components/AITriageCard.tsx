import { AIBadge, CategoryBadge, SafetyBadge, SeverityDots } from './Badges';
import PriorityExplainer from './PriorityExplainer';
import { Skeleton } from './LoadingScreen';
import { Building2, MapPin, Users, Sparkles } from 'lucide-react';
import type { TriageResult } from '../types';

export default function AITriageCard({
  result,
  loading = false,
}: {
  result: TriageResult | null;
  loading?: boolean;
}) {
  if (loading) {
    return (
      <div className="rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 to-white p-5">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 animate-pulse text-violet-500" />
          <p className="text-sm font-bold text-violet-900">AI is analyzing your complaint…</p>
        </div>
        <Skeleton className="mt-4 h-4 w-3/4" />
        <Skeleton className="mt-2 h-4 w-1/2" />
        <Skeleton className="mt-4 h-24 w-full" />
        <p className="mt-3 text-xs text-violet-600/80">
          Classifying category · assessing severity · scoring priority · scanning for duplicates
        </p>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
        <Sparkles className="mx-auto h-6 w-6 text-slate-300" />
        <p className="mt-2 text-sm font-medium text-slate-500">
          AI analysis will appear here after you describe the issue.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 via-white to-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-violet-100 bg-violet-50/60 px-4 py-3 sm:px-5">
        <p className="flex items-center gap-2 text-sm font-bold text-violet-950">
          <Sparkles className="h-4 w-4 text-violet-600" /> AI Triage Analysis
        </p>
        <AIBadge provider={result.ai_provider} confidence={result.confidence} />
      </div>

      <div className="space-y-4 p-4 sm:p-5">
        <p className="rounded-xl bg-slate-50 px-3.5 py-3 text-sm leading-relaxed text-slate-700 ring-1 ring-slate-100">
          “{result.summary}”
        </p>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-200 p-3">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Category</p>
            <div className="mt-1.5"><CategoryBadge category={result.category} /></div>
          </div>
          <div className="rounded-xl border border-slate-200 p-3">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Department</p>
            <p className="mt-1.5 flex items-start gap-1.5 text-xs font-semibold text-slate-700">
              <Building2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" /> {result.department}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 p-3">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Severity</p>
            <div className="mt-1.5 flex items-center gap-2">
              <SeverityDots level={result.severity} />
              <span className="text-xs font-bold text-slate-700">{result.severity}/5</span>
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 p-3">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Impact</p>
            <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-700">
              <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5 text-slate-400" /> ~{result.affected_estimate}</span>
              <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5 text-slate-400" /> {result.location_sensitivity}</span>
              {result.safety_risk && <SafetyBadge />}
            </div>
          </div>
        </div>

        {result.keywords?.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {result.keywords.map((k) => (
              <span key={k} className="rounded-full bg-violet-100/70 px-2.5 py-1 text-[11px] font-semibold text-violet-800">
                #{k}
              </span>
            ))}
          </div>
        )}

        {result.priority && (
          <PriorityExplainer score={result.priority.score} band={result.priority.band} factors={result.priority.factors} compact />
        )}

        {result.ai_provider === 'fallback' && (
          <p className="text-[11px] leading-relaxed text-slate-400">
            Classified by the on-device deterministic engine{result.gemini_error ? ` (Gemini unavailable: ${result.gemini_error})` : ' (Gemini key not configured)'}. Accuracy remains high for common civic categories.
          </p>
        )}
      </div>
    </div>
  );
}
