import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Search, RefreshCw, ShieldAlert, MapPin, Clock3, CheckCircle2,
  ArrowUpDown, Flame, Sparkles, Loader2, ChevronRight, Copy,
} from 'lucide-react';
import { apiFetch } from '../lib/api';
import { CATEGORIES, timeAgo } from '../lib/format';
import { useToast } from '../contexts/ToastContext';
import { CategoryBadge, PriorityBadge, StatusBadge } from '../components/Badges';
import { CardSkeleton } from '../components/LoadingScreen';
import EmptyState, { ErrorState } from '../components/EmptyState';
import type { CivicIssue } from '../types';

type SortKey = 'priority' | 'newest' | 'oldest';

export default function OfficerCommandCenter() {
  const [issues, setIssues] = useState<CivicIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [category, setCategory] = useState('');
  const [priority, setPriority] = useState('');
  const [sort, setSort] = useState<SortKey>('priority');
  const [reprioritizing, setReprioritizing] = useState(false);

  const { success, error: toastError } = useToast();

  const fetchIssues = useCallback(async () => {
    setLoading(true);
    setErr('');
    try {
      const params = new URLSearchParams({ sort, limit: '120' });
      if (q) params.set('q', q);
      if (status) params.set('status', status);
      if (category) params.set('category', category);
      if (priority) params.set('priority', priority);
      const data = await apiFetch<{ issues: CivicIssue[] }>(`/api/civic-issues?${params.toString()}`);
      let list = data.issues || [];

      // Merge local issues stored in localStorage
      try {
        const local = JSON.parse(localStorage.getItem('civicfix_local_issues') || '[]');
        if (Array.isArray(local) && local.length > 0) {
          const ids = new Set(list.map((i) => i.id));
          for (const li of local) {
            if (!ids.has(li.id)) {
              list.unshift(li);
              ids.add(li.id);
            }
          }
        }
      } catch { /* noop */ }

      setIssues(list);
    } catch (e: unknown) {
      try {
        const local = JSON.parse(localStorage.getItem('civicfix_local_issues') || '[]');
        if (Array.isArray(local) && local.length > 0) {
          setIssues(local);
        } else {
          setErr((e as Error).message);
        }
      } catch {
        setErr((e as Error).message);
      }
    } finally {
      setLoading(false);
    }
  }, [q, status, category, priority, sort]);

  useEffect(() => {
    const t = setTimeout(fetchIssues, q ? 400 : 0);
    return () => clearTimeout(t);
  }, [fetchIssues, q]);

  const reprioritize = async () => {
    setReprioritizing(true);
    try {
      const r = await apiFetch<{ updated: number }>('/api/triage-ai', { method: 'POST', body: JSON.stringify({ action: 'reprioritize' }) });
      success('Priorities recalculated', `${r.updated} open issues re-scored with fresh age + duplicate signals.`);
      fetchIssues();
    } catch (e: unknown) {
      toastError('Reprioritization failed', (e as Error).message);
    } finally {
      setReprioritizing(false);
    }
  };

  const kpis = useMemo(() => {
    const open = issues.filter((i) => !['resolved', 'verified', 'duplicate'].includes(i.status));
    return [
      { label: 'Open issues', value: open.length, icon: Flame, cls: 'bg-red-100 text-red-700' },
      { label: 'Critical + High', value: open.filter((i) => ['CRITICAL', 'HIGH'].includes(i.priority_band)).length, icon: ShieldAlert, cls: 'bg-orange-100 text-orange-700' },
      { label: 'Unassigned', value: open.filter((i) => !i.assigned_officer && ['open', 'triaged', 'reopened'].includes(i.status)).length, icon: Clock3, cls: 'bg-amber-100 text-amber-700' },
      { label: 'Resolved', value: issues.filter((i) => ['resolved', 'verified'].includes(i.status)).length, icon: CheckCircle2, cls: 'bg-emerald-100 text-emerald-700' },
    ];
  }, [issues]);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-indigo-600">Officer portal</p>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">Command Center</h1>
          <p className="mt-1 text-sm text-slate-500">AI-prioritized civic issues, deduplicated and ready for action.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchIssues} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50">
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
          <button onClick={reprioritize} disabled={reprioritizing} className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-700 px-4 py-2.5 text-sm font-bold text-white shadow transition hover:bg-indigo-600 disabled:opacity-60">
            {reprioritizing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Re-run AI priority
          </button>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${k.cls}`}>
              <k.icon className="h-5 w-5" />
            </span>
            <span>
              <span className="block text-2xl font-black leading-none text-slate-900">{loading ? '–' : k.value}</span>
              <span className="mt-1 block text-xs font-semibold text-slate-500">{k.label}</span>
            </span>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="mt-5 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-2.5 md:grid-cols-2 xl:grid-cols-[1.4fr_1fr_1fr_1fr_1fr]">
          <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 transition focus-within:border-indigo-400 focus-within:bg-white focus-within:ring-2 focus-within:ring-indigo-500">
            <Search className="h-4 w-4 shrink-0 text-slate-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search title, address…" className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400" />
          </label>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold text-slate-700 outline-none focus:border-indigo-400">
            <option value="">All statuses</option>
            {['open', 'triaged', 'assigned', 'in_progress', 'resolved', 'verified', 'reopened'].map((s) => (
              <option key={s} value={s}>{s.replace('_', ' ')}</option>
            ))}
          </select>
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold text-slate-700 outline-none focus:border-indigo-400">
            <option value="">All categories</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={priority} onChange={(e) => setPriority(e.target.value)} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold text-slate-700 outline-none focus:border-indigo-400">
            <option value="">All priorities</option>
            {['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          <button onClick={() => setSort(sort === 'priority' ? 'newest' : sort === 'newest' ? 'oldest' : 'priority')}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-100">
            <ArrowUpDown className="h-4 w-4" />
            {sort === 'priority' ? 'Top priority' : sort === 'newest' ? 'Newest' : 'Oldest'}
          </button>
        </div>
        {(q || status || category || priority) && (
          <button onClick={() => { setQ(''); setStatus(''); setCategory(''); setPriority(''); }} className="mt-2.5 text-xs font-bold text-indigo-700 hover:text-indigo-600">
            Clear all filters ✕
          </button>
        )}
      </div>

      {/* List */}
      <div className="mt-5">
        {loading && <div className="grid gap-3"><CardSkeleton /><CardSkeleton /><CardSkeleton /></div>}
        {!loading && err && <ErrorState message={err} onRetry={fetchIssues} />}
        {!loading && !err && issues.length === 0 && (
          <EmptyState title="No issues match" message="Try widening the filters — or wait for new citizen reports to arrive." actionLabel="Clear filters" onAction={() => { setQ(''); setStatus(''); setCategory(''); setPriority(''); }} />
        )}
        {!loading && !err && issues.length > 0 && (
          <div className="space-y-3">
            {issues.map((issue, idx) => (
              <Link
                key={issue.id}
                to={`/issues/${issue.id}`}
                className="group grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-indigo-300 hover:shadow-lg sm:grid-cols-[auto_1fr_auto] sm:items-center sm:gap-4 sm:p-5"
              >
                <div className="flex items-center gap-3 sm:flex-col sm:gap-1.5">
                  <span className="font-mono text-xs font-bold text-slate-300">#{String(idx + 1).padStart(2, '0')}</span>
                  <span className={`flex h-12 w-12 items-center justify-center rounded-2xl text-lg font-black text-white shadow ${
                    issue.priority_band === 'CRITICAL' ? 'bg-red-600' : issue.priority_band === 'HIGH' ? 'bg-orange-500' : issue.priority_band === 'MEDIUM' ? 'bg-amber-400 text-amber-950' : 'bg-slate-500'
                  }`}>
                    {issue.priority_score}
                  </span>
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <PriorityBadge band={issue.priority_band} size="sm" />
                    <StatusBadge status={issue.status} size="sm" />
                    <CategoryBadge category={issue.category} size="sm" />
                    {issue.safety_risk && <span className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-extrabold text-red-700">SAFETY</span>}
                    {issue.rating && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-extrabold text-amber-900 ring-1 ring-amber-200">★ {issue.rating}/5</span>}
                  </div>
                  <p className="mt-1.5 line-clamp-1 text-base font-bold text-slate-900 group-hover:text-indigo-800">{issue.title}</p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-500">
                    <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{issue.address?.slice(0, 70) || 'No address'}</span>
                    <span>{timeAgo(issue.created_at)}</span>
                    {issue.assigned_officer_name && <span className="font-semibold text-slate-600">→ {issue.assigned_officer_name}</span>}
                  </p>
                </div>
                <div className="flex items-center justify-between gap-3 sm:flex-col sm:items-end">
                  <span className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-50 px-3 py-1.5 text-xs font-extrabold text-indigo-800 ring-1 ring-indigo-100">
                    <Copy className="h-3.5 w-3.5" /> {issue.complaint_count} report{issue.complaint_count === 1 ? '' : 's'}
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-400 group-hover:text-indigo-700">
                    Manage <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
