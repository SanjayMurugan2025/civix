import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PlusCircle, Search, LayoutGrid, Clock, CheckCircle2, Link2, Camera } from 'lucide-react';
import { apiFetch } from '../lib/api';
import { timeAgo } from '../lib/format';
import { CategoryBadge, PriorityBadge, StatusBadge } from '../components/Badges';
import { CardSkeleton } from '../components/LoadingScreen';
import EmptyState, { ErrorState } from '../components/EmptyState';
import type { Complaint } from '../types';

export default function CitizenDashboard() {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const fetchMine = useCallback(async () => {
    setLoading(true);
    setErr('');
    try {
      const data = await apiFetch<{ complaints: Complaint[] }>('/api/complaints?mine=1&limit=100');
      let list = data.complaints || [];

      // Merge local complaints stored in localStorage
      try {
        const local = JSON.parse(localStorage.getItem('civicfix_local_complaints') || '[]');
        if (Array.isArray(local) && local.length > 0) {
          const ids = new Set(list.map((c) => c.id));
          for (const lc of local) {
            if (!ids.has(lc.id)) {
              list.unshift(lc);
              ids.add(lc.id);
            }
          }
        }
      } catch { /* noop */ }

      // Sync with civicfix_local_issues statuses
      try {
        const storedIssues = JSON.parse(localStorage.getItem('civicfix_local_issues') || '[]');
        list = list.map((c) => {
          const match = storedIssues.find((i: { id: string; title: string; status: string }) => i.id === c.id || i.title === c.title);
          if (match && match.status) {
            return { ...c, status: match.status };
          }
          return c;
        });
      } catch { /* noop */ }

      setComplaints(list);
    } catch (e: unknown) {
      try {
        const local = JSON.parse(localStorage.getItem('civicfix_local_complaints') || '[]');
        const storedIssues = JSON.parse(localStorage.getItem('civicfix_local_issues') || '[]');
        if (Array.isArray(local) && local.length > 0) {
          const synced = local.map((c) => {
            const match = storedIssues.find((i: { id: string; title: string; status: string }) => i.id === c.id || i.title === c.title);
            return match && match.status ? { ...c, status: match.status } : c;
          });
          setComplaints(synced);
        } else {
          setErr((e as Error).message);
        }
      } catch {
        setErr((e as Error).message);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchMine(); }, [fetchMine]);

  const filtered = complaints.filter((c) => {
    if (statusFilter && c.status !== statusFilter) return false;
    if (q) {
      const s = `${c.title} ${c.description} ${c.address}`.toLowerCase();
      if (!s.includes(q.toLowerCase())) return false;
    }
    return true;
  });

  const stats = [
    { label: 'Total reports', value: complaints.length, icon: LayoutGrid, cls: 'bg-sky-100 text-sky-700' },
    { label: 'In progress', value: complaints.filter((c) => ['submitted', 'triaged', 'in_review'].includes(c.status)).length, icon: Clock, cls: 'bg-amber-100 text-amber-700' },
    { label: 'Linked (deduped)', value: complaints.filter((c) => c.status === 'linked').length, icon: Link2, cls: 'bg-indigo-100 text-indigo-700' },
    { label: 'With photo', value: complaints.filter((c) => c.image_url).length, icon: Camera, cls: 'bg-emerald-100 text-emerald-700' },
  ];

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">My reports</h1>
          <p className="mt-1 text-sm text-slate-500">Every complaint you file, triaged by AI and tracked to resolution.</p>
        </div>
        <Link to="/report" className="inline-flex items-center gap-2 rounded-2xl bg-emerald-700 px-5 py-3 text-sm font-extrabold text-white shadow-lg shadow-emerald-900/20 transition hover:bg-emerald-600">
          <PlusCircle className="h-4 w-4" /> Report new issue
        </Link>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${s.cls}`}>
              <s.icon className="h-5 w-5" />
            </span>
            <span>
              <span className="block text-2xl font-black leading-none text-slate-900">{loading ? '–' : s.value}</span>
              <span className="mt-1 block text-xs font-semibold text-slate-500">{s.label}</span>
            </span>
          </div>
        ))}
      </div>

      <div className="mt-6 flex flex-col gap-2.5 sm:flex-row">
        <label className="flex flex-1 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm transition focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-500">
          <Search className="h-4 w-4 shrink-0 text-slate-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by keyword, landmark, category…" className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400" />
        </label>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm outline-none focus:border-emerald-400">
          <option value="">All statuses</option>
          <option value="submitted">Submitted</option>
          <option value="triaged">Triaged</option>
          <option value="linked">Linked (duplicate)</option>
          <option value="in_review">In review</option>
          <option value="withdrawn">Withdrawn</option>
        </select>
      </div>

      <div className="mt-5">
        {loading && <div className="grid gap-3 md:grid-cols-2"><CardSkeleton /><CardSkeleton /><CardSkeleton /><CardSkeleton /></div>}
        {!loading && err && <ErrorState message={err} onRetry={fetchMine} />}
        {!loading && !err && filtered.length === 0 && (
          complaints.length === 0 ? (
            <EmptyState
              title="No reports yet"
              message="Found a pothole, pile of garbage or broken streetlight? File your first report and watch AI triage it in seconds."
              actionLabel="Report your first issue"
              actionTo="/report"
            />
          ) : (
            <EmptyState title="No matches" message="Try a different keyword or clear the status filter." actionLabel="Clear filters" onAction={() => { setQ(''); setStatusFilter(''); }} />
          )
        )}
        {!loading && !err && filtered.length > 0 && (
          <div className="grid gap-3 md:grid-cols-2">
            {filtered.map((c) => (
              <Link
                key={c.id}
                to={`/complaints/${c.id}`}
                className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:border-emerald-300 hover:shadow-lg"
              >
                <div className="flex gap-3.5 p-4">
                  {c.image_url ? (
                    <img src={c.image_url} alt="" className="h-20 w-20 shrink-0 rounded-xl object-cover ring-1 ring-slate-200" />
                  ) : (
                    <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-xs font-bold text-slate-400">
                      No photo
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <StatusBadge status={c.status} size="sm" />
                      <CategoryBadge category={c.category} size="sm" />
                    </div>
                    <p className="mt-1.5 line-clamp-1 text-sm font-bold text-slate-900 group-hover:text-emerald-800">{c.title}</p>
                    <p className="mt-0.5 line-clamp-1 text-xs text-slate-500">{c.address || 'No address'} · {timeAgo(c.created_at)}</p>
                    <div className="mt-1.5 flex items-center gap-2">
                      <PriorityBadge band={c.priority_band} score={c.priority_score} size="sm" />
                      {c.status === 'linked' && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-700">
                          <CheckCircle2 className="h-3 w-3" /> Deduped — boosting an issue
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
