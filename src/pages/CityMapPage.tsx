import { useCallback, useEffect, useState } from 'react';
import { Filter } from 'lucide-react';
import { apiFetch } from '../lib/api';
import { CATEGORIES } from '../lib/format';
import IssueMap, { type MapPoint } from '../components/IssueMap';
import LoadingScreen from '../components/LoadingScreen';
import { ErrorState } from '../components/EmptyState';
import type { CivicIssue } from '../types';

export default function CityMapPage({ officer = false }: { officer?: boolean }) {
  const [issues, setIssues] = useState<CivicIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [category, setCategory] = useState('');
  const [priority, setPriority] = useState('');
  const [status, setStatus] = useState('');
  const [showResolved, setShowResolved] = useState(false);

  const fetchMap = useCallback(async () => {
    setLoading(true);
    setErr('');
    try {
      const params = new URLSearchParams({ limit: '400', sort: 'priority' });
      if (!showResolved) params.set('open_only', '1');
      if (category) params.set('category', category);
      if (priority) params.set('priority', priority);
      if (status) params.set('status', status);
      const data = await apiFetch<{ issues: CivicIssue[] }>(`/api/civic-issues?${params.toString()}`);
      setIssues(data.issues || []);
    } catch (e: unknown) {
      setErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [category, priority, status, showResolved]);

  useEffect(() => { fetchMap(); }, [fetchMap]);

  const points: MapPoint[] = issues
    .filter((i) => i.lat !== null && i.lng !== null)
    .map((i) => ({
      id: i.id, lat: i.lat as number, lng: i.lng as number, title: i.title,
      category: i.category, priority_band: i.priority_band, priority_score: i.priority_score,
      status: i.status, complaint_count: i.complaint_count, address: i.address,
    }));

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-emerald-600">
            {officer ? 'Officer portal' : 'Public transparency'}
          </p>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
            {officer ? 'Operations Map' : 'City Issue Map'}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {points.length} issue{points.length === 1 ? '' : 's'} pinned · marker color = priority · number = linked reports
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 rounded-3xl border border-slate-200 bg-white p-3.5 shadow-sm">
        <span className="flex items-center gap-1.5 px-1 text-xs font-extrabold uppercase tracking-wider text-slate-400">
          <Filter className="h-3.5 w-3.5" /> Filters
        </span>
        <select value={category} onChange={(e) => setCategory(e.target.value)} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 outline-none focus:border-emerald-400">
          <option value="">All categories</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={priority} onChange={(e) => setPriority(e.target.value)} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 outline-none focus:border-emerald-400">
          <option value="">All priorities</option>
          {['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 outline-none focus:border-emerald-400">
          <option value="">All statuses</option>
          {['open', 'triaged', 'assigned', 'in_progress', 'resolved', 'verified', 'reopened'].map((s) => (
            <option key={s} value={s}>{s.replace('_', ' ')}</option>
          ))}
        </select>
        <label className="flex cursor-pointer items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-600 ring-1 ring-slate-200">
          <input type="checkbox" checked={showResolved} onChange={(e) => setShowResolved(e.target.checked)} className="h-4 w-4 accent-emerald-600" />
          Include resolved
        </label>
        <div className="ml-auto hidden items-center gap-2 text-[11px] font-bold text-slate-500 md:flex">
          <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-red-600" /> Critical</span>
          <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-orange-500" /> High</span>
          <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-amber-500" /> Medium</span>
          <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-slate-500" /> Low</span>
        </div>
      </div>

      <div className="mt-4">
        {loading && <LoadingScreen label="Loading map…" />}
        {!loading && err && <ErrorState message={err} onRetry={fetchMap} />}
        {!loading && !err && <IssueMap points={points} height={560} linkPrefix="/issues" />}
      </div>
    </div>
  );
}
