import { Check } from 'lucide-react';
import { fmtDate } from '../lib/format';

interface Step {
  label: string;
  sub?: string;
  state: 'done' | 'current' | 'todo';
}

export default function StatusTimeline({
  complaintStatus,
  issueStatus,
  createdAt,
  assignedAt,
  resolvedAt,
  verifiedAt,
}: {
  complaintStatus?: string;
  issueStatus?: string;
  createdAt: string;
  assignedAt?: string | null;
  resolvedAt?: string | null;
  verifiedAt?: string | null;
}) {
  const order = ['open', 'triaged', 'assigned', 'in_progress', 'resolved', 'verified'];
  let idx = 0;
  if (complaintStatus === 'linked' || complaintStatus === 'triaged') idx = Math.max(idx, 1);
  if (issueStatus) {
    const i = order.indexOf(issueStatus);
    if (i >= 0) idx = Math.max(idx, i);
    if (issueStatus === 'reopened') idx = 2;
  }

  const steps: Step[] = [
    { label: 'Reported', sub: fmtDate(createdAt), state: 'done' },
    {
      label: complaintStatus === 'linked' ? 'AI linked to existing issue' : 'AI triaged & categorized',
      sub: idx >= 1 ? 'Duplicate scan complete' : 'Waiting for AI triage',
      state: idx > 1 ? 'done' : idx === 1 ? 'current' : 'todo',
    },
    {
      label: 'Assigned to officer',
      sub: assignedAt ? fmtDate(assignedAt) : 'Awaiting assignment',
      state: idx > 2 ? 'done' : idx === 2 ? 'current' : 'todo',
    },
    {
      label: 'Work in progress',
      sub: idx >= 3 ? 'Field work underway' : 'Not started',
      state: idx > 3 ? 'done' : idx === 3 ? 'current' : 'todo',
    },
    {
      label: 'Resolved with evidence',
      sub: resolvedAt ? fmtDate(resolvedAt) : 'Pending resolution',
      state: idx > 4 ? 'done' : idx === 4 ? 'current' : 'todo',
    },
    {
      label: 'Citizen verified',
      sub: (issueStatus === 'verified' || complaintStatus === 'verified' || verifiedAt)
        ? (verifiedAt ? fmtDate(verifiedAt) : 'Verified by citizen')
        : 'Awaiting citizen confirmation',
      state: (issueStatus === 'verified' || complaintStatus === 'verified' || verifiedAt || idx > 5)
        ? 'done'
        : idx === 5
          ? 'current'
          : 'todo',
    },
  ];

  return (
    <ol className="relative space-y-5 border-l-2 border-slate-200 pl-0">
      {steps.map((s, i) => (
        <li key={s.label} className="relative flex gap-3 pl-7">
          <span
            className={`absolute -left-[13px] flex h-6 w-6 items-center justify-center rounded-full ring-4 ring-white ${
              s.state === 'done'
                ? 'bg-emerald-500 text-white'
                : s.state === 'current'
                  ? 'animate-pulse bg-amber-400 text-amber-950'
                  : 'bg-slate-200 text-slate-400'
            }`}
          >
            {s.state === 'done' ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : <span className="text-[10px] font-extrabold">{i + 1}</span>}
          </span>
          <div>
            <p className={`text-sm font-bold ${s.state === 'todo' ? 'text-slate-400' : 'text-slate-800'}`}>{s.label}</p>
            {s.sub && <p className="text-xs text-slate-500">{s.sub}</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}
