import { Link } from 'react-router-dom';
import { Copy, MapPin, ExternalLink } from 'lucide-react';
import { timeAgo } from '../lib/format';
import { CategoryBadge, StatusBadge } from './Badges';
import { Skeleton } from './LoadingScreen';
import type { DuplicateCandidate } from '../types';

function scoreColor(s: number): string {
  if (s >= 0.7) return 'bg-red-600 text-white';
  if (s >= 0.5) return 'bg-orange-500 text-white';
  return 'bg-amber-400 text-amber-950';
}

export default function DuplicatePanel({
  candidates,
  loading = false,
  title = 'Possible duplicates',
}: {
  candidates: DuplicateCandidate[];
  loading?: boolean;
  title?: string;
}) {
  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="mt-3 h-16 w-full" />
        <Skeleton className="mt-2 h-16 w-full" />
      </div>
    );
  }

  if (!candidates || candidates.length === 0) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5">
        <p className="flex items-center gap-2 text-sm font-bold text-emerald-900">
          <Copy className="h-4 w-4" /> {title}
        </p>
        <p className="mt-1.5 text-sm text-emerald-800">
          No similar reports found. This looks like a fresh, unique issue — it will create a new Civic Issue.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4 sm:p-5">
      <p className="flex items-center gap-2 text-sm font-bold text-amber-900">
        <Copy className="h-4 w-4" /> {title}
        <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[11px] font-extrabold text-white">
          {candidates.length}
        </span>
      </p>
      <p className="mt-1 text-xs text-amber-800/80">
        Matched by text similarity + GPS proximity + category. Duplicates are never deleted — they link to one Civic Issue and raise its priority.
      </p>
      <div className="mt-3 space-y-2.5">
        {candidates.map((c) => (
          <div key={c.complaint.id} className="rounded-xl border border-amber-200/70 bg-white p-3.5 shadow-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-extrabold ${scoreColor(c.score)}`}>
                {Math.round(c.score * 100)}% match
              </span>
              <CategoryBadge category={c.complaint.category} size="sm" />
              <StatusBadge status={c.issue_status || c.complaint.status} size="sm" />
              {c.issue_id && (
                <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[11px] font-bold text-indigo-800">
                  Issue #{c.issue_id.slice(0, 8)}
                </span>
              )}
            </div>
            <p className="mt-2 text-sm font-semibold text-slate-800">{c.complaint.title}</p>
            <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-slate-500">{c.complaint.description}</p>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-400">
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {c.complaint.address?.slice(0, 60) || 'No address'}
                {c.distKm !== null && c.distKm !== undefined && ` · ${c.distKm < 1 ? Math.round(c.distKm * 1000) + 'm' : c.distKm.toFixed(2) + 'km'} away`}
              </span>
              <span>{timeAgo(c.complaint.created_at)}</span>
              <span>text {Math.round(c.text * 100)}% · geo {Math.round(c.geo * 100)}% · cat {c.cat ? '✓' : '–'}</span>
              <Link
                to={`/complaints/${c.complaint.id}`}
                className="ml-auto inline-flex items-center gap-1 font-bold text-sky-700 hover:text-sky-600"
              >
                View <ExternalLink className="h-3 w-3" />
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
