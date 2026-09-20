import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, MapPin, Calendar, Link2, ArrowRight, FlagOff, Star, RotateCcw, Loader2, Camera } from 'lucide-react';
import { apiFetch } from '../lib/api';
import { fmtDate } from '../lib/format';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import LoadingScreen from '../components/LoadingScreen';
import { ErrorState } from '../components/EmptyState';
import ConfirmDialog from '../components/ConfirmDialog';
import StatusTimeline from '../components/StatusTimeline';
import { AIBadge, CategoryBadge, PriorityBadge, SafetyBadge, SeverityDots, StatusBadge } from '../components/Badges';
import type { Complaint } from '../types';

interface FullComplaint extends Complaint {
  links?: { id: string; complaint_id: string; issue_id: string; link_type: string; similarity_score: number | null; linked_by: string | null; created_at: string; civic_issues?: import('../types').CivicIssue }[];
}

export default function ComplaintDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const [complaint, setComplaint] = useState<FullComplaint | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [confirmWithdraw, setConfirmWithdraw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [rating, setRating] = useState(5);
  const [feedback, setFeedback] = useState('');
  const [verifying, setVerifying] = useState(false);

  const { success, error: toastError } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();

  const fetchOne = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setErr('');
    try {
      const data = await apiFetch<FullComplaint>(`/api/complaints?id=${id}`);
      if (data && data.id) {
        setComplaint(data);
        return;
      }
      throw new Error('Complaint not found.');
    } catch (e: unknown) {
      try {
        const local = JSON.parse(localStorage.getItem('civicfix_local_complaints') || '[]');
        const found = local.find((c: Complaint) => c.id === id);
        if (found) {
          const storedIssues = JSON.parse(localStorage.getItem('civicfix_local_issues') || '[]');
          const matchingIssue = storedIssues.find((i: { id: string; title: string }) => i.id === found.id || i.title === found.title);
          if (matchingIssue) {
            found.status = matchingIssue.status || found.status;
            (found as FullComplaint).links = [{
              id: 'link_0',
              issue_id: matchingIssue.id,
              complaint_id: found.id,
              link_type: 'primary',
              similarity_score: 1.0,
              linked_by: 'system',
              created_at: matchingIssue.created_at,
              civic_issues: matchingIssue,
            }];
          }
          setComplaint(found);
          return;
        }
      } catch { /* noop */ }
      setErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchOne(); }, [fetchOne]);

  const withdraw = async () => {
    if (!complaint) return;
    setBusy(true);
    try {
      await apiFetch('/api/complaints', { method: 'PUT', body: JSON.stringify({ id: complaint.id, status: 'withdrawn' }) });
      success('Complaint withdrawn', 'Officers will no longer act on this report.');
      setConfirmWithdraw(false);
      fetchOne();
    } catch (e: unknown) {
      toastError('Could not withdraw', (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const verifyResolution = async () => {
    const issue = complaint?.links?.[0]?.civic_issues;
    if (!issue) return;
    setVerifying(true);
    try {
      await apiFetch('/api/resolutions', { method: 'POST', body: JSON.stringify({ action: 'verify', issue_id: issue.id, rating, feedback }) });
      success('Thank you!', 'You verified the resolution. Your rating helps hold departments accountable.');
      fetchOne();
    } catch (e: unknown) {
      toastError('Verification failed', (e as Error).message);
    } finally {
      setVerifying(false);
    }
  };

  const reopen = async () => {
    const issue = complaint?.links?.[0]?.civic_issues;
    if (!issue) return;
    setBusy(true);
    try {
      await apiFetch('/api/civic-issues', { method: 'PUT', body: JSON.stringify({ id: issue.id, status: 'reopened' }) });
      success('Issue reopened', 'Officers have been notified that the problem persists.');
      fetchOne();
    } catch (e: unknown) {
      toastError('Could not reopen', (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <LoadingScreen label="Loading complaint…" />;
  if (err || !complaint) return <ErrorState message={err || 'Complaint not found.'} onRetry={fetchOne} />;

  const issue = complaint.links?.[0]?.civic_issues || null;
  const linkType = complaint.links?.[0]?.link_type;
  const isOwner = user?.id === complaint.user_id;

  return (
    <div className="mx-auto max-w-5xl">
      <button onClick={() => navigate(-1)} className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 transition hover:text-slate-800">
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Main */}
        <div className="space-y-5 lg:col-span-2">
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            {complaint.image_url ? (
              <img src={complaint.image_url} alt="Complaint evidence" className="h-64 w-full object-cover sm:h-80" />
            ) : (
              <div className="flex h-36 items-center justify-center bg-slate-100 text-sm font-semibold text-slate-400">
                <Camera className="mr-2 h-4 w-4" /> No photo attached
              </div>
            )}
            <div className="p-5 sm:p-6">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={complaint.status} />
                <CategoryBadge category={complaint.category} />
                <PriorityBadge band={complaint.priority_band} score={complaint.priority_score} />
                {complaint.safety_risk && <SafetyBadge />}
              </div>
              <h1 className="mt-3 text-xl font-black tracking-tight text-slate-900 sm:text-2xl">{complaint.title}</h1>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{complaint.description}</p>
              <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-500">
                <span className="inline-flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />{complaint.address || 'No address'}</span>
                <span className="inline-flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" />{fmtDate(complaint.created_at)}</span>
                <span className="font-mono font-bold">#{complaint.id.slice(0, 8).toUpperCase()}</span>
              </div>

              {/* AI box */}
              <div className="mt-5 rounded-2xl border border-violet-200 bg-violet-50/60 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-extrabold uppercase tracking-widest text-violet-800">AI analysis</p>
                  <AIBadge provider={complaint.ai_provider} confidence={complaint.ai_confidence} />
                </div>
                <p className="mt-2 text-sm italic leading-relaxed text-slate-700">“{complaint.ai_summary || complaint.description.slice(0, 180)}”</p>
                <div className="mt-3 grid grid-cols-2 gap-2.5 text-xs sm:grid-cols-4">
                  <div className="rounded-xl bg-white p-2.5 ring-1 ring-violet-100">
                    <p className="font-bold text-slate-400">Severity</p>
                    <p className="mt-1"><SeverityDots level={complaint.severity} /></p>
                  </div>
                  <div className="rounded-xl bg-white p-2.5 ring-1 ring-violet-100">
                    <p className="font-bold text-slate-400">Department</p>
                    <p className="mt-1 font-semibold leading-snug text-slate-700">{complaint.ai_department}</p>
                  </div>
                  <div className="rounded-xl bg-white p-2.5 ring-1 ring-violet-100">
                    <p className="font-bold text-slate-400">Affected</p>
                    <p className="mt-1 font-bold text-slate-800">~{complaint.affected_estimate}</p>
                  </div>
                  <div className="rounded-xl bg-white p-2.5 ring-1 ring-violet-100">
                    <p className="font-bold text-slate-400">Location</p>
                    <p className="mt-1 font-bold capitalize text-slate-800">{complaint.location_sensitivity}</p>
                  </div>
                </div>
              </div>

              {isOwner && !['withdrawn'].includes(complaint.status) && (
                <div className="mt-5 flex flex-wrap gap-2.5">
                  {['submitted', 'triaged'].includes(complaint.status) && (
                    <button onClick={() => setConfirmWithdraw(true)} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700">
                      <FlagOff className="h-4 w-4" /> Withdraw report
                    </button>
                  )}
                  {issue?.status === 'resolved' && (
                    <button onClick={reopen} disabled={busy} className="inline-flex items-center gap-1.5 rounded-xl border border-orange-200 bg-orange-50 px-4 py-2.5 text-sm font-bold text-orange-700 transition hover:bg-orange-100 disabled:opacity-50">
                      <RotateCcw className="h-4 w-4" /> Problem persists? Reopen
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Linked issue card */}
          {issue && (
            <div className="rounded-3xl border border-indigo-200 bg-gradient-to-br from-indigo-50 to-white p-5 sm:p-6">
              <p className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-widest text-indigo-800">
                <Link2 className="h-4 w-4" />
                {linkType === 'duplicate' ? 'Linked as duplicate to' : 'Triaged into'} civic issue
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <StatusBadge status={issue.status} />
                <PriorityBadge band={issue.priority_band} score={issue.priority_score} />
              </div>
              <p className="mt-2 text-base font-bold text-slate-900">{issue.title}</p>
              <p className="mt-1 text-sm text-slate-600">{issue.description}</p>
              <p className="mt-2 text-xs font-semibold text-slate-500">
                {issue.complaint_count} linked report{issue.complaint_count === 1 ? '' : 's'} · {issue.department}
                {issue.assigned_officer_name && ` · Officer: ${issue.assigned_officer_name}`}
              </p>
              <Link to={`/issues/${issue.id}`} className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-indigo-700 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-indigo-600">
                Open civic issue <ArrowRight className="h-4 w-4" />
              </Link>

              {isOwner && issue.status === 'resolved' && (
                <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4">
                  <p className="text-sm font-extrabold text-emerald-900">Was this fixed properly?</p>
                  <p className="mt-0.5 text-xs text-emerald-800/80">Your verification closes the accountability loop.</p>
                  <div className="mt-3 flex items-center gap-1.5">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <button key={s} onClick={() => setRating(s)} aria-label={`Rate ${s}`} className="transition hover:scale-110">
                        <Star className={`h-7 w-7 ${s <= rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`} />
                      </button>
                    ))}
                  </div>
                  <textarea value={feedback} onChange={(e) => setFeedback(e.target.value)} rows={2} maxLength={500}
                    placeholder="Optional feedback for the department…"
                    className="mt-3 w-full rounded-xl border border-emerald-200 bg-white px-3 py-2.5 text-sm outline-none placeholder:text-slate-400 focus:border-emerald-400" />
                  <button onClick={verifyResolution} disabled={verifying} className="mt-2.5 inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-600 disabled:opacity-50">
                    {verifying && <Loader2 className="h-4 w-4 animate-spin" />} Confirm fix · {rating}★
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Side */}
        <div className="space-y-5">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6">
            <h3 className="text-sm font-extrabold uppercase tracking-widest text-slate-400">Progress</h3>
            <div className="mt-4">
              <StatusTimeline
                complaintStatus={complaint.status}
                issueStatus={issue?.status}
                createdAt={complaint.created_at}
                assignedAt={issue?.assigned_at}
                resolvedAt={issue?.resolved_at}
                verifiedAt={issue?.verified_at}
              />
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirmWithdraw}
        title="Withdraw this report?"
        message="Officers will stop acting on this complaint. This cannot be undone, but the record stays in the audit log."
        confirmLabel="Withdraw"
        danger
        busy={busy}
        onConfirm={withdraw}
        onClose={() => setConfirmWithdraw(false)}
      />
    </div>
  );
}
