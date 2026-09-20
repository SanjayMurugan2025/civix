export function timeAgo(iso: string | null | undefined): string {
  if (!iso) return '—';
  const t = new Date(iso).getTime();
  if (isNaN(t)) return '—';
  const s = Math.max(0, Math.floor((Date.now() - t) / 1000));
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  const mo = Math.floor(d / 30);
  if (mo < 12) return `${mo}mo ago`;
  return `${Math.floor(mo / 12)}y ago`;
}

export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function fmtINR(n: number | null | undefined): string {
  if (n === null || n === undefined) return '—';
  return '₹' + Number(n).toLocaleString('en-IN');
}

export const CATEGORIES = [
  'Roads',
  'Garbage',
  'Water',
  'Drainage',
  'Streetlight',
  'Public Safety',
  'Infrastructure',
  'Sanitation',
  'Other',
];

export const DEPARTMENTS = [
  'Roads & Transport Department',
  'Solid Waste Management',
  'Water Supply Board',
  'Stormwater & Drainage Dept',
  'Electrical & Streetlight Dept',
  'Public Safety Cell',
  'Public Works Department',
  'Health & Sanitation Dept',
  'Grievance Redressal Cell',
];

export const ISSUE_STATUSES = [
  'open',
  'triaged',
  'assigned',
  'in_progress',
  'resolved',
  'verified',
  'reopened',
] as const;

export const STATUS_META: Record<string, { label: string; classes: string; dot: string }> = {
  submitted: { label: 'Submitted', classes: 'bg-sky-100 text-sky-800 ring-sky-200', dot: 'bg-sky-500' },
  triaged: { label: 'Triaged', classes: 'bg-violet-100 text-violet-800 ring-violet-200', dot: 'bg-violet-500' },
  linked: { label: 'Linked', classes: 'bg-indigo-100 text-indigo-800 ring-indigo-200', dot: 'bg-indigo-500' },
  in_review: { label: 'In Review', classes: 'bg-amber-100 text-amber-800 ring-amber-200', dot: 'bg-amber-500' },
  withdrawn: { label: 'Withdrawn', classes: 'bg-slate-200 text-slate-700 ring-slate-300', dot: 'bg-slate-500' },
  open: { label: 'Open', classes: 'bg-sky-100 text-sky-800 ring-sky-200', dot: 'bg-sky-500' },
  assigned: { label: 'Assigned', classes: 'bg-blue-100 text-blue-800 ring-blue-200', dot: 'bg-blue-500' },
  in_progress: { label: 'In Progress', classes: 'bg-amber-100 text-amber-800 ring-amber-200', dot: 'bg-amber-500' },
  resolved: { label: 'Resolved', classes: 'bg-emerald-100 text-emerald-800 ring-emerald-200', dot: 'bg-emerald-500' },
  verified: { label: 'Verified', classes: 'bg-teal-100 text-teal-800 ring-teal-200', dot: 'bg-teal-600' },
  reopened: { label: 'Reopened', classes: 'bg-orange-100 text-orange-800 ring-orange-200', dot: 'bg-orange-500' },
  duplicate: { label: 'Duplicate', classes: 'bg-slate-200 text-slate-700 ring-slate-300', dot: 'bg-slate-500' },
};

export const PRIORITY_META: Record<string, { label: string; classes: string; pin: string }> = {
  CRITICAL: { label: 'Critical', classes: 'bg-red-600 text-white ring-red-700', pin: '#DC2626' },
  HIGH: { label: 'High', classes: 'bg-orange-500 text-white ring-orange-600', pin: '#EA580C' },
  MEDIUM: { label: 'Medium', classes: 'bg-amber-400 text-amber-950 ring-amber-500', pin: '#D97706' },
  LOW: { label: 'Low', classes: 'bg-slate-500 text-white ring-slate-600', pin: '#64748B' },
};

export const CATEGORY_META: Record<string, { classes: string; dot: string }> = {
  Roads: { classes: 'bg-stone-200 text-stone-800 ring-stone-300', dot: 'bg-stone-500' },
  Garbage: { classes: 'bg-lime-100 text-lime-900 ring-lime-200', dot: 'bg-lime-600' },
  Water: { classes: 'bg-cyan-100 text-cyan-900 ring-cyan-200', dot: 'bg-cyan-600' },
  Drainage: { classes: 'bg-teal-100 text-teal-900 ring-teal-200', dot: 'bg-teal-600' },
  Streetlight: { classes: 'bg-yellow-100 text-yellow-900 ring-yellow-200', dot: 'bg-yellow-500' },
  'Public Safety': { classes: 'bg-red-100 text-red-900 ring-red-200', dot: 'bg-red-600' },
  Infrastructure: { classes: 'bg-indigo-100 text-indigo-900 ring-indigo-200', dot: 'bg-indigo-600' },
  Sanitation: { classes: 'bg-emerald-100 text-emerald-900 ring-emerald-200', dot: 'bg-emerald-600' },
  Other: { classes: 'bg-slate-200 text-slate-800 ring-slate-300', dot: 'bg-slate-500' },
};

export function statusMeta(s: string | null | undefined) {
  return STATUS_META[s || ''] || { label: s || '—', classes: 'bg-slate-200 text-slate-700 ring-slate-300', dot: 'bg-slate-400' };
}

export function priorityMeta(b: string | null | undefined) {
  return PRIORITY_META[b || ''] || PRIORITY_META.LOW;
}

export function categoryMeta(c: string | null | undefined) {
  return CATEGORY_META[c || ''] || CATEGORY_META.Other;
}
