import { useCallback, useEffect, useState } from 'react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, LineChart, Line, Legend,
} from 'recharts';
import {
  LayoutGrid, FileText, Flame, CheckCircle2, Timer, Copy, Sparkles, Star, RefreshCw, MapPin,
} from 'lucide-react';
import { apiFetch } from '../lib/api';
import LoadingScreen from '../components/LoadingScreen';
import { ErrorState } from '../components/EmptyState';
import IssueMap, { type MapPoint } from '../components/IssueMap';
import type { AnalyticsData } from '../types';

const PIE_COLORS = ['#0EA5E9', '#8B5CF6', '#F59E0B', '#10B981', '#14B8A6', '#F97316', '#64748B', '#EC4899', '#84CC16'];
const PRI_COLORS: Record<string, string> = { CRITICAL: '#DC2626', HIGH: '#EA580C', MEDIUM: '#D97706', LOW: '#64748B' };

function Card({ title, sub, children, className = '' }: { title: string; sub?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-3xl border border-slate-200 bg-white p-5 shadow-sm ${className}`}>
      <h3 className="text-sm font-extrabold text-slate-900">{title}</h3>
      {sub && <p className="mt-0.5 text-xs text-slate-400">{sub}</p>}
      <div className="mt-4">{children}</div>
    </div>
  );
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    setErr('');
    try {
      const d = await apiFetch<AnalyticsData>('/api/analytics');
      setData(d);
    } catch (e: unknown) {
      setErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAnalytics(); }, [fetchAnalytics]);

  if (loading) return <LoadingScreen label="Crunching civic data…" />;
  if (err || !data) return <ErrorState message={err || 'Could not load analytics.'} onRetry={fetchAnalytics} />;

  const t = data.totals;
  const kpis = [
    { label: 'Civic issues', value: t.issues, icon: LayoutGrid, cls: 'bg-indigo-100 text-indigo-700' },
    { label: 'Citizen reports', value: t.complaints, icon: FileText, cls: 'bg-sky-100 text-sky-700' },
    { label: 'Open now', value: t.open, icon: Flame, cls: 'bg-red-100 text-red-700' },
    { label: 'Resolved', value: t.resolved, icon: CheckCircle2, cls: 'bg-emerald-100 text-emerald-700' },
    { label: 'Avg. resolution', value: t.avgResolutionHrs ? `${t.avgResolutionHrs}h` : '—', icon: Timer, cls: 'bg-amber-100 text-amber-700' },
    { label: 'SLA ≤72h', value: `${t.sla72}%`, icon: CheckCircle2, cls: 'bg-teal-100 text-teal-700' },
    { label: 'Duplicates linked', value: t.duplicateLinks, icon: Copy, cls: 'bg-violet-100 text-violet-700' },
    { label: 'Citizen rating', value: t.avgRating ? `${t.avgRating}★` : '—', icon: Star, cls: 'bg-yellow-100 text-yellow-700' },
  ];

  const hotspots: MapPoint[] = (data.hotspots || []).map((h) => ({
    id: h.id, lat: h.lat, lng: h.lng, title: h.title, category: h.category,
    priority_band: h.priority_band, status: h.status, complaint_count: h.complaint_count,
  }));

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-indigo-600">Officer portal</p>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">City Analytics</h1>
          <p className="mt-1 text-sm text-slate-500">Performance, accountability and hotspot intelligence across departments.</p>
        </div>
        <button onClick={fetchAnalytics} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50">
          <RefreshCw className="h-4 w-4" /> Refresh
        </button>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${k.cls}`}>
              <k.icon className="h-5 w-5" />
            </span>
            <span>
              <span className="block text-xl font-black leading-none text-slate-900">{k.value}</span>
              <span className="mt-1 block text-xs font-semibold text-slate-500">{k.label}</span>
            </span>
          </div>
        ))}
      </div>

      <div className="mt-5 rounded-3xl border border-violet-200 bg-gradient-to-r from-violet-50 to-indigo-50 p-4">
        <p className="flex flex-wrap items-center gap-2 text-sm font-bold text-violet-950">
          <Sparkles className="h-4 w-4" />
          AI triage coverage: {t.aiShare}% of reports classified by Gemini
          <span className="font-medium text-violet-800/70">(rest by deterministic fallback engine — zero downtime)</span>
        </p>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <Card title="Reported vs resolved (14 days)" sub="Daily citizen reports against closures">
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={data.trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis dataKey="day" fontSize={11} tick={{ fill: '#64748B' }} />
              <YAxis fontSize={11} tick={{ fill: '#64748B' }} allowDecimals={false} />
              <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="reported" stroke="#8B5CF6" strokeWidth={2.5} dot={false} name="Reported" />
              <Line type="monotone" dataKey="resolved" stroke="#10B981" strokeWidth={2.5} dot={false} name="Resolved" />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Issues by category" sub="Volume per civic category">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data.byCategory} layout="vertical" margin={{ left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" horizontal={false} />
              <XAxis type="number" fontSize={11} tick={{ fill: '#64748B' }} allowDecimals={false} />
              <YAxis type="category" dataKey="name" fontSize={11} width={92} tick={{ fill: '#334155', fontWeight: 700 }} />
              <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
              <Bar dataKey="value" radius={[0, 8, 8, 0]} name="Issues">
                {(data.byCategory || []).map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Status distribution" sub="Where every issue stands">
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={data.byStatus} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={95} label={{ fontSize: 11 }}>
                {(data.byStatus || []).map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Priority mix" sub="AI-scored urgency bands">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data.byPriority}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
              <XAxis dataKey="name" fontSize={11} tick={{ fill: '#334155', fontWeight: 700 }} />
              <YAxis fontSize={11} tick={{ fill: '#64748B' }} allowDecimals={false} />
              <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
              <Bar dataKey="value" radius={[8, 8, 0, 0]} name="Issues">
                {(data.byPriority || []).map((row) => (
                  <Cell key={row.name} fill={PRI_COLORS[row.name] || '#64748B'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <Card title="Department SLA scoreboard" sub="Resolution rate and average turnaround per department" className="mt-5">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="text-left text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                <th className="pb-2.5 pr-3">Department</th>
                <th className="pb-2.5 pr-3 text-right">Issues</th>
                <th className="pb-2.5 pr-3 text-right">Resolved</th>
                <th className="pb-2.5 pr-3">SLA rate</th>
                <th className="pb-2.5 text-right">Avg. turnaround</th>
              </tr>
            </thead>
            <tbody>
              {(data.departments || []).map((d) => (
                <tr key={d.full} className="border-t border-slate-100">
                  <td className="py-2.5 pr-3 font-semibold text-slate-800">{d.full}</td>
                  <td className="py-2.5 pr-3 text-right tabular-nums">{d.total}</td>
                  <td className="py-2.5 pr-3 text-right tabular-nums">{d.resolved}</td>
                  <td className="py-2.5 pr-3">
                    <span className="flex items-center gap-2">
                      <span className="h-2 w-32 overflow-hidden rounded-full bg-slate-100 sm:w-40">
                        <span
                          className={`block h-full rounded-full ${d.sla >= 70 ? 'bg-emerald-500' : d.sla >= 40 ? 'bg-amber-400' : 'bg-red-500'}`}
                          style={{ width: `${d.sla}%` }}
                        />
                      </span>
                      <span className="text-xs font-bold tabular-nums">{d.sla}%</span>
                    </span>
                  </td>
                  <td className="py-2.5 text-right tabular-nums text-slate-600">{d.avgHours !== null ? `${d.avgHours}h` : '—'}</td>
                </tr>
              ))}
              {(data.departments || []).length === 0 && (
                <tr><td colSpan={5} className="py-6 text-center text-sm text-slate-400">No department data yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <Card title="Top reporting areas" sub="Neighborhoods generating the most reports">
          <div className="space-y-2.5">
            {(data.topAreas || []).map((a, i) => (
              <div key={a.area} className="flex items-center gap-3">
                <span className="w-6 text-xs font-black text-slate-300">{String(i + 1).padStart(2, '0')}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold text-slate-800">{a.area}</span>
                  <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <span
                      className="block h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500"
                      style={{ width: `${Math.min(100, (a.total / Math.max(1, data.topAreas[0]?.total || 1)) * 100)}%` }}
                    />
                  </span>
                </span>
                <span className="text-xs font-bold tabular-nums text-slate-600">{a.total} <span className="font-medium text-slate-400">({a.open} open)</span></span>
              </div>
            ))}
            {(data.topAreas || []).length === 0 && <p className="text-sm text-slate-400">No area data yet.</p>}
          </div>
        </Card>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="flex items-center gap-2 text-sm font-extrabold text-slate-900">
            <MapPin className="h-4 w-4 text-red-500" /> Live hotspot map
          </h3>
          <p className="mt-0.5 text-xs text-slate-400">Open issues by location and priority</p>
          <div className="mt-4">
            <IssueMap points={hotspots} height={300} linkPrefix="/issues" />
          </div>
        </div>
      </div>
    </div>
  );
}
