import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, MapPin, Calendar, Building2, UserPlus, StickyNote, CheckCircle2, Star,
  Loader2, Camera, GitMerge, History, Users, Sparkles, Send, AlertTriangle, X,
} from 'lucide-react';
import { apiFetch, uploadEvidence, validateImageFile } from '../lib/api';
import { fmtDate, fmtINR, timeAgo } from '../lib/format';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import LoadingScreen from '../components/LoadingScreen';
import { ErrorState } from '../components/EmptyState';
import ConfirmDialog from '../components/ConfirmDialog';
import PriorityExplainer from '../components/PriorityExplainer';
import IssueMap from '../components/IssueMap';
import { AIBadge, CategoryBadge, PriorityBadge, SafetyBadge, SeverityDots, StatusBadge } from '../components/Badges';
import type { CivicIssue, Complaint, DuplicateCandidate, IssueDetail, OfficerOption } from '../types';

const NEXT_STATUS: Record<string, { to: string; label: string }[]> = {
  open: [{ to: 'triaged', label: 'Mark triaged' }, { to: 'in_progress', label: 'Start work' }],
  triaged: [{ to: 'assigned', label: 'Mark assigned' }, { to: 'in_progress', label: 'Start work' }],
  assigned: [{ to: 'in_progress', label: 'Start work' }],
  in_progress: [{ to: 'resolved', label: 'Resolve (add evidence below)' }],
  reopened: [{ to: 'assigned', label: 'Re-assign' }, { to: 'in_progress', label: 'Resume work' }],
  resolved: [{ to: 'verified', label: 'Verify closure' }, { to: 'reopened', label: 'Reopen' }],
};

const DEFAULT_DEMO_OFFICERS: OfficerOption[] = [
  { id: 'off_1', full_name: 'Officer Rajesh Kumar', department: 'Roads & Traffic Department', email: 'rajesh.k@jaipur.gov.in', role: 'officer', ward: 'Ward 4' },
  { id: 'off_2', full_name: 'Officer Sunita Sharma', department: 'Sanitation & Waste Management', email: 'sunita.s@jaipur.gov.in', role: 'officer', ward: 'Ward 2' },
  { id: 'off_3', full_name: 'Officer Amit Patel', department: 'Water Works Department', email: 'amit.p@jaipur.gov.in', role: 'officer', ward: 'Ward 7' },
  { id: 'off_4', full_name: 'Officer Vikram Singh', department: 'Electrical Department', email: 'vikram.s@jaipur.gov.in', role: 'officer', ward: 'Ward 1' },
  { id: 'off_5', full_name: 'Officer Priya Mehta', department: 'Parks & Horticulture Department', email: 'priya.m@jaipur.gov.in', role: 'officer', ward: 'Ward 5' },
  { id: 'off_6', full_name: 'Officer Suresh Verma', department: 'Drainage & Sewerage Board', email: 'suresh.v@jaipur.gov.in', role: 'officer', ward: 'Ward 3' },
  { id: 'off_7', full_name: 'Officer Ananya Sen', department: 'Health & Public Environment', email: 'ananya.s@jaipur.gov.in', role: 'officer', ward: 'Ward 8' },
  { id: 'off_8', full_name: 'Officer Deepak Chauhan', department: 'Building & Infrastructure Wing', email: 'deepak.c@jaipur.gov.in', role: 'officer', ward: 'Ward 6' },
  { id: 'off_9', full_name: 'Officer Kavita Rao', department: 'Street Lighting & Power Grid', email: 'kavita.r@jaipur.gov.in', role: 'officer', ward: 'Ward 9' },
  { id: 'off_10', full_name: 'Officer Manoj Joshi', department: 'Public Safety & Disaster Response', email: 'manoj.j@jaipur.gov.in', role: 'officer', ward: 'Ward 10' },
];

export default function IssueDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const [detail, setDetail] = useState<IssueDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  // assign
  const [officers, setOfficers] = useState<OfficerOption[]>(DEFAULT_DEMO_OFFICERS);
  const [showAssign, setShowAssign] = useState(false);
  const [assignOfficer, setAssignOfficer] = useState('');
  const [assignNote, setAssignNote] = useState('');
  const [assignDue, setAssignDue] = useState('');

  // notes
  const [note, setNote] = useState('');
  const [noteBusy, setNoteBusy] = useState(false);

  // resolution
  const [showResolve, setShowResolve] = useState(false);
  const [resSummary, setResSummary] = useState('');
  const [resAction, setResAction] = useState('');
  const [resCost, setResCost] = useState('');
  const [resContractor, setResContractor] = useState('');
  const [beforeFile, setBeforeFile] = useState<File | null>(null);
  const [afterFile, setAfterFile] = useState<File | null>(null);
  const [resolveBusy, setResolveBusy] = useState(false);
  const [resolveStep, setResolveStep] = useState('');

  // merge / dup scan
  const [dupScan, setDupScan] = useState<DuplicateCandidate[]>([]);
  const [dupBusy, setDupBusy] = useState(false);
  const [selectedMerge, setSelectedMerge] = useState<string[]>([]);
  const [confirmMerge, setConfirmMerge] = useState(false);

  const [confirmStatus, setConfirmStatus] = useState<{ to: string; label: string } | null>(null);

  const { success, error: toastError } = useToast();
  const { isOfficer } = useAuth();
  const navigate = useNavigate();

  const fetchDetail = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setErr('');
    try {
      const data = await apiFetch<IssueDetail>(`/api/civic-issues?id=${id}`);
      if (data && data.issue) {
        setDetail(data);
        return;
      }
      throw new Error('Issue not found.');
    } catch (e: unknown) {
      try {
        const storedIssues = JSON.parse(localStorage.getItem('civicfix_local_issues') || '[]');
        const foundIssue = storedIssues.find((i: CivicIssue) => i.id === id);
        if (foundIssue) {
          const storedComplaints = JSON.parse(localStorage.getItem('civicfix_local_complaints') || '[]');
          const matchingComplaints = storedComplaints.filter((c: { id: string; title: string }) => c.title === foundIssue.title || c.id === foundIssue.id);
          const links = matchingComplaints.map((c: unknown, idx: number) => ({
            id: `link_${idx}`,
            issue_id: foundIssue.id,
            complaint_id: (c as { id: string }).id,
            link_type: idx === 0 ? 'primary' : 'duplicate',
            similarity_score: 0.95,
            linked_by: 'system',
            created_at: foundIssue.created_at,
            complaints: c,
          }));
          setDetail({
            issue: foundIssue,
            links: links.length > 0 ? links : [{ id: 'link_0', issue_id: foundIssue.id, complaint_id: 'comp_demo', link_type: 'primary', similarity_score: 1.0, linked_by: 'system', created_at: foundIssue.created_at, complaints: { id: 'comp_demo', title: foundIssue.title, description: foundIssue.description, category: foundIssue.category, address: foundIssue.address, status: foundIssue.status, created_at: foundIssue.created_at } as unknown as Complaint }],
            assignments: [],
            notes: [],
            history: [{ id: 'hist_1', actor_id: 'system', entity_type: 'issue', entity_id: foundIssue.id, action: 'issue.created', created_at: foundIssue.created_at, details: { officer: 'System AI' } }],
            resolutions: [],
          });
          return;
        }

        const storedComplaints = JSON.parse(localStorage.getItem('civicfix_local_complaints') || '[]');
        const foundComp = storedComplaints.find((c: Complaint) => c.id === id);
        if (foundComp) {
          const syntheticIssue: CivicIssue = {
            id: id,
            title: foundComp.title,
            description: foundComp.description,
            category: foundComp.category,
            department: foundComp.ai_department || 'General Municipal Dept',
            address: foundComp.address,
            lat: foundComp.lat,
            lng: foundComp.lng,
            status: foundComp.status || 'open',
            severity: foundComp.severity || 3,
            safety_risk: foundComp.safety_risk || false,
            affected_estimate: foundComp.affected_estimate || 500,
            location_sensitivity: foundComp.location_sensitivity || 'medium',
            priority_score: foundComp.priority_score || 65,
            priority_band: foundComp.priority_band || 'HIGH',
            priority_factors: [
              { key: 'severity', label: 'AI Severity', points: 30, max: 40 },
              { key: 'safety', label: 'Safety Hazard', points: 25, max: 25 },
            ],
            complaint_count: 1,
            assigned_officer: null,
            assigned_officer_name: null,
            assigned_at: null,
            resolved_at: null,
            verified_at: null,
            created_by: foundComp.user_id || 'demo-citizen-id',
            created_at: foundComp.created_at || new Date().toISOString(),
          };
          setDetail({
            issue: syntheticIssue,
            links: [{ id: 'link_0', issue_id: id, complaint_id: foundComp.id, link_type: 'primary', similarity_score: 1.0, linked_by: 'system', created_at: foundComp.created_at, complaints: foundComp }],
            assignments: [],
            notes: [],
            history: [{ id: 'hist_1', actor_id: 'system', entity_type: 'issue', entity_id: id, action: 'issue.created', created_at: foundComp.created_at, details: { officer: 'System AI' } }],
            resolutions: [],
          });
          return;
        }
      } catch { /* noop */ }
      setErr((e as Error).message || 'Issue not found.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchDetail(); }, [fetchDetail]);

  useEffect(() => {
    if (showAssign) {
      apiFetch<unknown>('/api/auth-profile?list=officers')
        .then((res) => {
          if (Array.isArray(res) && res.length > 0) {
            setOfficers(res as OfficerOption[]);
          } else if (res && typeof res === 'object' && 'officers' in res && Array.isArray((res as { officers: unknown[] }).officers) && (res as { officers: unknown[] }).officers.length > 0) {
            setOfficers((res as { officers: OfficerOption[] }).officers);
          } else {
            setOfficers(DEFAULT_DEMO_OFFICERS);
          }
        })
        .catch(() => {
          setOfficers(DEFAULT_DEMO_OFFICERS);
        });
    }
  }, [showAssign]);

  const changeStatus = async (to: string) => {
    if (!detail) return;
    setBusy(true);
    try {
      await apiFetch('/api/civic-issues', { method: 'PUT', body: JSON.stringify({ id: detail.issue.id, status: to }) });
      success('Status updated', `Issue is now “${to.replace('_', ' ')}”.`);
      setConfirmStatus(null);
      fetchDetail();
    } catch (e: unknown) {
      toastError('Status change failed', (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const assign = async () => {
    if (!detail || !assignOfficer) { toastError('Select an officer', 'Pick who should own this issue.'); return; }
    const off = officers.find((o) => o.id === assignOfficer);
    setBusy(true);
    try {
      await apiFetch('/api/assignments', {
        method: 'POST',
        body: JSON.stringify({
          issue_id: detail.issue.id,
          officer_id: assignOfficer,
          officer_name: off?.full_name || 'Field Officer',
          department: off?.department || detail.issue.department,
          note: assignNote,
          due_date: assignDue || null,
        }),
      });
      success('Issue assigned', `${off?.full_name || 'Officer'} now owns this issue.`);
      setShowAssign(false);
      setAssignOfficer(''); setAssignNote(''); setAssignDue('');
      fetchDetail();
    } catch (e: unknown) {
      toastError('Assignment failed', (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const addNote = async () => {
    if (!detail || !note.trim()) return;
    setNoteBusy(true);
    try {
      await apiFetch('/api/civic-issues', { method: 'POST', body: JSON.stringify({ action: 'note', issue_id: detail.issue.id, note: note.trim() }) });
      success('Note added', 'Visible in the issue timeline.');
      setNote('');
      fetchDetail();
    } catch (e: unknown) {
      toastError('Could not add note', (e as Error).message);
    } finally {
      setNoteBusy(false);
    }
  };

  const resolve = async () => {
    if (!detail || !resSummary.trim()) { toastError('Summary required', 'Describe what was fixed.'); return; }
    setResolveBusy(true);
    try {
      let beforeUrl: string | null = null;
      let afterUrl: string | null = null;
      if (beforeFile) {
        const v = validateImageFile(beforeFile);
        if (v) throw new Error('Before photo: ' + v);
        setResolveStep('Uploading before photo…');
        beforeUrl = (await uploadEvidence(beforeFile, 'resolutions')).url;
      }
      if (afterFile) {
        const v = validateImageFile(afterFile);
        if (v) throw new Error('After photo: ' + v);
        setResolveStep('Uploading after photo…');
        afterUrl = (await uploadEvidence(afterFile, 'resolutions')).url;
      }
      setResolveStep('Recording resolution…');
      await apiFetch('/api/resolutions', {
        method: 'POST',
        body: JSON.stringify({
          issue_id: detail.issue.id,
          summary: resSummary.trim(),
          action_taken: resAction.trim(),
          before_image_url: beforeUrl,
          after_image_url: afterUrl,
          cost_inr: resCost ? Number(resCost) : null,
          contractor: resContractor || null,
        }),
      });
      success('Issue resolved', 'Citizens can now verify the fix with a rating.');
      setShowResolve(false);
      setResSummary(''); setResAction(''); setResCost(''); setResContractor('');
      setBeforeFile(null); setAfterFile(null);
      fetchDetail();
    } catch (e: unknown) {
      toastError('Resolution failed', (e as Error).message);
    } finally {
      setResolveBusy(false);
      setResolveStep('');
    }
  };

  const scanDuplicates = async () => {
    if (!detail) return;
    setDupBusy(true);
    try {
      const r = await apiFetch<{ candidates: DuplicateCandidate[] }>('/api/triage-ai', {
        method: 'POST',
        body: JSON.stringify({
          action: 'check-duplicates',
          title: detail.issue.title,
          description: detail.issue.description,
          address: detail.issue.address,
          lat: detail.issue.lat,
          lng: detail.issue.lng,
          category: detail.issue.category,
        }),
      });
      const others = (r.candidates || []).filter((c) => c.issue_id && c.issue_id !== detail.issue.id);
      setDupScan(others);
      if (others.length === 0) success('No merge candidates', 'No other issues look similar to this one.');
    } catch (e: unknown) {
      toastError('Duplicate scan failed', (e as Error).message);
    } finally {
      setDupBusy(false);
    }
  };

  const merge = async () => {
    if (!detail || selectedMerge.length === 0) return;
    setBusy(true);
    try {
      const r = await apiFetch<IssueDetail & { moved: number }>('/api/civic-issues', {
        method: 'POST',
        body: JSON.stringify({ action: 'merge', target_issue_id: detail.issue.id, source_issue_ids: selectedMerge }),
      });
      success('Issues merged', `${r.moved} report(s) moved into this issue. Priority re-scored.`);
      setConfirmMerge(false);
      setSelectedMerge([]);
      setDupScan([]);
      fetchDetail();
    } catch (e: unknown) {
      toastError('Merge failed', (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <LoadingScreen label="Loading civic issue…" />;
  if (err || !detail || !detail.issue) return <ErrorState message={err || 'Issue not found.'} onRetry={fetchDetail} />;

  const issue: CivicIssue = detail.issue;
  const nexts = NEXT_STATUS[issue.status] || [];

  return (
    <div className="mx-auto max-w-6xl">
      <button onClick={() => navigate(-1)} className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 transition hover:text-slate-800">
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      {/* Header */}
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={issue.status} />
          <CategoryBadge category={issue.category} />
          <PriorityBadge band={issue.priority_band} score={issue.priority_score} />
          {issue.safety_risk && <SafetyBadge />}
          <span className="ml-auto font-mono text-xs font-bold text-slate-400">#{issue.id.slice(0, 8).toUpperCase()}</span>
        </div>
        <h1 className="mt-3 text-xl font-black tracking-tight text-slate-900 sm:text-2xl">{issue.title}</h1>
        <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{issue.description}</p>
        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />{issue.address || 'No address'}</span>
          <span className="inline-flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" />{fmtDate(issue.created_at)} ({timeAgo(issue.created_at)})</span>
          <span className="inline-flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5" />{issue.department}</span>
          <span className="inline-flex items-center gap-1.5"><Users className="h-3.5 w-3.5" />~{issue.affected_estimate} affected</span>
          <span className="inline-flex items-center gap-1.5">Severity <SeverityDots level={issue.severity} /></span>
        </div>

        {isOfficer && nexts.length > 0 && (
          <div className="mt-5 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
            {nexts.filter((n) => !(n.to === 'resolved')).map((n) => (
              <button key={n.to} onClick={() => setConfirmStatus(n)} disabled={busy}
                className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-slate-700 disabled:opacity-50">
                {n.label} →
              </button>
            ))}
            {nexts.some((n) => n.to === 'resolved') && (
              <button onClick={() => setShowResolve(!showResolve)} className="rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white shadow transition hover:bg-emerald-600">
                <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4" /> Resolve with evidence</span>
              </button>
            )}
            <button onClick={() => setShowAssign(!showAssign)} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50">
              <UserPlus className="h-4 w-4" /> {issue.assigned_officer ? 'Re-assign' : 'Assign officer'}
            </button>
          </div>
        )}
        {issue.assigned_officer_name && (
          <p className="mt-3 rounded-xl bg-blue-50 px-3.5 py-2.5 text-xs font-semibold text-blue-900 ring-1 ring-blue-100">
            Assigned to <b>{issue.assigned_officer_name}</b>{issue.assigned_at ? ` · ${fmtDate(issue.assigned_at)}` : ''}
          </p>
        )}

        {(issue.rating || detail.resolutions.some((r) => r.citizen_rating)) && (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50/40 p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-amber-900">
                <Star className="h-4 w-4 fill-amber-400 text-amber-500" />
                Citizen Work Review & Rating
              </span>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star
                    key={s}
                    className={`h-4 w-4 ${s <= Number(issue.rating || detail.resolutions.find((r) => r.citizen_rating)?.citizen_rating || 0) ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`}
                  />
                ))}
                <span className="ml-1 text-xs font-extrabold text-amber-950">
                  {issue.rating || detail.resolutions.find((r) => r.citizen_rating)?.citizen_rating}/5
                </span>
              </div>
            </div>
            {(issue.feedback || detail.resolutions.find((r) => r.citizen_feedback)?.citizen_feedback) && (
              <p className="mt-2 text-xs italic leading-relaxed text-slate-700">
                “{issue.feedback || detail.resolutions.find((r) => r.citizen_feedback)?.citizen_feedback}”
              </p>
            )}
            {issue.verified_at && (
              <p className="mt-1.5 text-[11px] font-semibold text-amber-800/80">
                Verified on {fmtDate(issue.verified_at)}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Assign panel */}
      {isOfficer && showAssign && (
        <div className="mt-4 rounded-3xl border border-blue-200 bg-blue-50/50 p-5">
          <h3 className="flex items-center gap-2 text-sm font-extrabold text-blue-950"><UserPlus className="h-4 w-4" /> Assign to officer</h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <label className="block sm:col-span-1">
              <span className="mb-1.5 block text-xs font-bold text-slate-600">Officer</span>
              <select value={assignOfficer} onChange={(e) => setAssignOfficer(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-400">
                <option value="">Select officer…</option>
                {(Array.isArray(officers) ? officers : []).map((o) => <option key={o.id} value={o.id}>{o.full_name} · {o.department || o.role}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-bold text-slate-600">Due date</span>
              <input type="date" value={assignDue} onChange={(e) => setAssignDue(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-400" />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-bold text-slate-600">Instruction note</span>
              <input value={assignNote} onChange={(e) => setAssignNote(e.target.value)} placeholder="e.g. Inspect within 24h" maxLength={500} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none placeholder:text-slate-400 focus:border-blue-400" />
            </label>
          </div>
          <div className="mt-3 flex gap-2">
            <button onClick={assign} disabled={busy} className="rounded-xl bg-blue-700 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-blue-600 disabled:opacity-50">
              {busy ? 'Assigning…' : 'Confirm assignment'}
            </button>
            <button onClick={() => setShowAssign(false)} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-600">Cancel</button>
          </div>
        </div>
      )}

      {/* Resolve panel */}
      {isOfficer && showResolve && (
        <div className="mt-4 rounded-3xl border border-emerald-200 bg-emerald-50/50 p-5">
          <h3 className="flex items-center gap-2 text-sm font-extrabold text-emerald-950"><CheckCircle2 className="h-4 w-4" /> Record resolution with evidence</h3>
          <div className="mt-3 grid gap-3">
            <label className="block">
              <span className="mb-1.5 block text-xs font-bold text-slate-600">What was fixed? *</span>
              <textarea value={resSummary} onChange={(e) => setResSummary(e.target.value)} rows={2} maxLength={1000}
                placeholder="e.g. Pothole filled with hot-mix asphalt and compacted; road marking repainted."
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none placeholder:text-slate-400 focus:border-emerald-400" />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-bold text-slate-600">Action taken <span className="font-medium text-slate-400">(crew, method, materials)</span></span>
              <input value={resAction} onChange={(e) => setResAction(e.target.value)} maxLength={1000}
                placeholder="e.g. 4-member PWD crew, 2 tonnes hot-mix"
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none placeholder:text-slate-400 focus:border-emerald-400" />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block text-xs font-bold text-slate-600">Cost (₹, optional)</span>
                <input value={resCost} onChange={(e) => setResCost(e.target.value.replace(/\D/g, '').slice(0, 9))} placeholder="e.g. 15000" inputMode="numeric"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none placeholder:text-slate-400 focus:border-emerald-400" />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-bold text-slate-600">Contractor (optional)</span>
                <input value={resContractor} onChange={(e) => setResContractor(e.target.value)} maxLength={120} placeholder="e.g. Sharma Constructions"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none placeholder:text-slate-400 focus:border-emerald-400" />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-bold text-slate-600">Before photo</span>
                <span className="flex cursor-pointer items-center gap-2 rounded-xl border-2 border-dashed border-slate-300 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-500 hover:border-emerald-400">
                  <Camera className="h-4 w-4" /> {beforeFile ? beforeFile.name.slice(0, 28) : 'Choose file'}
                  <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => setBeforeFile(e.target.files?.[0] || null)} />
                </span>
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-bold text-slate-600">After photo</span>
                <span className="flex cursor-pointer items-center gap-2 rounded-xl border-2 border-dashed border-slate-300 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-500 hover:border-emerald-400">
                  <Camera className="h-4 w-4" /> {afterFile ? afterFile.name.slice(0, 28) : 'Choose file'}
                  <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => setAfterFile(e.target.files?.[0] || null)} />
                </span>
              </label>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button onClick={resolve} disabled={resolveBusy} className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-600 disabled:opacity-50">
              {resolveBusy && <Loader2 className="h-4 w-4 animate-spin" />} {resolveBusy ? resolveStep || 'Resolving…' : 'Mark resolved'}
            </button>
            <button onClick={() => setShowResolve(false)} disabled={resolveBusy} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-600">Cancel</button>
          </div>
        </div>
      )}

      <div className="mt-5 grid gap-5 lg:grid-cols-5">
        <div className="space-y-5 lg:col-span-3">
          {/* Priority */}
          <PriorityExplainer score={issue.priority_score} band={issue.priority_band} factors={issue.priority_factors || []} />

          {/* Linked complaints */}
          <div className="rounded-3xl border border-slate-200 bg-white p-5">
            <h3 className="flex items-center gap-2 text-sm font-extrabold text-slate-800">
              <Users className="h-4 w-4 text-indigo-600" />
              Linked citizen reports ({detail.links.length})
              <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[11px] font-bold text-indigo-800">duplicates preserved</span>
            </h3>
            <div className="mt-3 space-y-2.5">
              {detail.links.map((l) => (
                <div key={l.id} className="rounded-2xl border border-slate-200 bg-slate-50/50 p-3.5">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-extrabold ${l.link_type === 'primary' ? 'bg-emerald-600 text-white' : 'bg-indigo-600 text-white'}`}>
                      {l.link_type === 'primary' ? 'PRIMARY' : `DUPLICATE · ${Math.round((l.similarity_score || 0) * 100)}%`}
                    </span>
                    {l.complaints && <StatusBadge status={l.complaints.status} size="sm" />}
                    <span className="ml-auto text-[11px] text-slate-400">{l.complaints ? timeAgo(l.complaints.created_at) : ''}</span>
                  </div>
                  {l.complaints ? (
                    <>
                      <p className="mt-1.5 text-sm font-bold text-slate-800">{l.complaints.title}</p>
                      <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-slate-500">{l.complaints.description}</p>
                      <div className="mt-2 flex items-center gap-2">
                        {l.complaints.image_url && <img src={l.complaints.image_url} alt="" className="h-10 w-14 rounded-lg object-cover ring-1 ring-slate-200" />}
                        <Link to={`/complaints/${l.complaints.id}`} className="text-xs font-bold text-indigo-700 hover:text-indigo-600">Open complaint →</Link>
                      </div>
                    </>
                  ) : (
                    <p className="mt-1.5 text-xs text-slate-400">Complaint record unavailable.</p>
                  )}
                </div>
              ))}
              {detail.links.length === 0 && <p className="text-sm text-slate-400">No linked complaints (manually created issue).</p>}
            </div>
          </div>

          {/* Merge inspector */}
          {isOfficer && (
            <div className="rounded-3xl border border-amber-200 bg-amber-50/40 p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="flex items-center gap-2 text-sm font-extrabold text-amber-950">
                  <GitMerge className="h-4 w-4" /> Deduplication inspector
                </h3>
                <button onClick={scanDuplicates} disabled={dupBusy} className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-3.5 py-2 text-xs font-extrabold text-white transition hover:bg-amber-400 disabled:opacity-50">
                  {dupBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                  Scan for similar issues
                </button>
              </div>
              {dupScan.length > 0 && (
                <div className="mt-3 space-y-2">
                  {dupScan.map((c) => (
                    <label key={c.complaint.id} className={`flex cursor-pointer items-start gap-3 rounded-2xl border bg-white p-3.5 transition ${selectedMerge.includes(c.issue_id || '') ? 'border-amber-500 ring-2 ring-amber-200' : 'border-slate-200'}`}>
                      <input
                        type="checkbox"
                        className="mt-1 h-4 w-4 accent-amber-600"
                        checked={selectedMerge.includes(c.issue_id || '')}
                        onChange={(e) => {
                          if (!c.issue_id) return;
                          setSelectedMerge((prev) => e.target.checked ? [...prev, c.issue_id as string] : prev.filter((x) => x !== c.issue_id));
                        }}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-1.5">
                          <span className="rounded-full bg-red-600 px-2 py-0.5 text-[11px] font-extrabold text-white">{Math.round(c.score * 100)}% match</span>
                          <CategoryBadge category={c.complaint.category} size="sm" />
                          <StatusBadge status={c.issue_status || c.complaint.status} size="sm" />
                        </span>
                        <span className="mt-1 block truncate text-sm font-bold text-slate-800">{c.complaint.title}</span>
                        <span className="mt-0.5 block text-[11px] text-slate-500">Issue #{(c.issue_id || '').slice(0, 8)} · {c.complaint.address?.slice(0, 60)}{c.distKm !== null && c.distKm !== undefined ? ` · ${c.distKm < 1 ? Math.round(c.distKm * 1000) + 'm' : c.distKm.toFixed(2) + 'km'} away` : ''}</span>
                      </span>
                    </label>
                  ))}
                  <button onClick={() => setConfirmMerge(true)} disabled={selectedMerge.length === 0}
                    className="w-full rounded-xl bg-amber-600 py-2.5 text-sm font-extrabold text-white transition hover:bg-amber-500 disabled:opacity-40">
                    Merge {selectedMerge.length} selected into this issue
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Resolutions */}
          {detail.resolutions.length > 0 && (
            <div className="rounded-3xl border border-emerald-200 bg-white p-5">
              <h3 className="flex items-center gap-2 text-sm font-extrabold text-emerald-950">
                <CheckCircle2 className="h-4 w-4" /> Resolution evidence ({detail.resolutions.length})
              </h3>
              <div className="mt-3 space-y-4">
                {detail.resolutions.map((r) => (
                  <div key={r.id} className="rounded-2xl border border-slate-200 p-4">
                    <p className="text-sm font-bold text-slate-800">{r.summary}</p>
                    {r.action_taken && <p className="mt-1 text-xs text-slate-500">Action: {r.action_taken}</p>}
                    <p className="mt-1 text-[11px] text-slate-400">
                      By {r.resolver_name || 'Officer'} · {fmtDate(r.created_at)}
                      {r.cost_inr ? ` · ${fmtINR(r.cost_inr)}` : ''}{r.contractor ? ` · ${r.contractor}` : ''}
                      {r.citizen_rating ? ` · Citizen rated ${r.citizen_rating}/5` : ''}
                    </p>
                    {(r.before_image_url || r.after_image_url) && (
                      <div className="mt-3 grid grid-cols-2 gap-2.5">
                        <div>
                          <p className="mb-1 text-[11px] font-extrabold uppercase tracking-wider text-slate-400">Before</p>
                          {r.before_image_url ? <img src={r.before_image_url} alt="Before fix" className="h-36 w-full rounded-xl object-cover ring-1 ring-slate-200" /> : <p className="rounded-xl bg-slate-100 py-8 text-center text-xs text-slate-400">No photo</p>}
                        </div>
                        <div>
                          <p className="mb-1 text-[11px] font-extrabold uppercase tracking-wider text-emerald-600">After</p>
                          {r.after_image_url ? <img src={r.after_image_url} alt="After fix" className="h-36 w-full rounded-xl object-cover ring-1 ring-emerald-200" /> : <p className="rounded-xl bg-slate-100 py-8 text-center text-xs text-slate-400">No photo</p>}
                        </div>
                      </div>
                    )}
                    {r.citizen_feedback && <p className="mt-2 rounded-xl bg-amber-50 px-3 py-2 text-xs italic text-amber-900 ring-1 ring-amber-100">“{r.citizen_feedback}”</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Side column */}
        <div className="space-y-5 lg:col-span-2">
          {issue.lat !== null && issue.lng !== null && (
            <IssueMap
              height={260}
              autoFit={false}
              center={[issue.lat, issue.lng]}
              zoom={15}
              linkPrefix="/issues"
              points={[{ id: issue.id, lat: issue.lat, lng: issue.lng, title: issue.title, category: issue.category, priority_band: issue.priority_band, priority_score: issue.priority_score, status: issue.status, complaint_count: issue.complaint_count, address: issue.address }]}
            />
          )}

          {/* AI summary card */}
          <div className="rounded-3xl border border-violet-200 bg-violet-50/50 p-5">
            <p className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-widest text-violet-800">
              <Sparkles className="h-3.5 w-3.5" /> AI assessment
            </p>
            <div className="mt-3 flex items-center gap-2">
              <AIBadge provider={detail.links[0]?.complaints?.ai_provider} confidence={detail.links[0]?.complaints?.ai_confidence} />
            </div>
            <dl className="mt-3 space-y-2 text-xs">
              <div className="flex justify-between"><dt className="text-slate-500">Location sensitivity</dt><dd className="font-bold capitalize text-slate-800">{issue.location_sensitivity}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Est. people affected</dt><dd className="font-bold text-slate-800">~{issue.affected_estimate}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Safety risk</dt><dd className="font-bold text-slate-800">{issue.safety_risk ? 'Yes' : 'No'}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Linked reports</dt><dd className="font-bold text-slate-800">{issue.complaint_count}</dd></div>
            </dl>
          </div>

          {/* Notes */}
          <div className="rounded-3xl border border-slate-200 bg-white p-5">
            <h3 className="flex items-center gap-2 text-sm font-extrabold text-slate-800">
              <StickyNote className="h-4 w-4 text-amber-500" /> Officer notes ({detail.notes.length})
            </h3>
            {isOfficer && (
              <div className="mt-3 flex gap-2">
                <input value={note} onChange={(e) => setNote(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addNote()}
                  placeholder="Add a field note…" maxLength={1000}
                  className="flex-1 rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none placeholder:text-slate-400 focus:border-amber-400" />
                <button onClick={addNote} disabled={noteBusy || !note.trim()} className="rounded-xl bg-slate-900 px-3.5 py-2.5 text-white transition hover:bg-slate-700 disabled:opacity-40" aria-label="Add note">
                  {noteBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </button>
              </div>
            )}
            <div className="mt-3 max-h-64 space-y-2 overflow-y-auto">
              {detail.notes.map((n) => (
                <div key={n.id} className="rounded-xl bg-amber-50/70 px-3.5 py-2.5 ring-1 ring-amber-100">
                  <p className="text-xs leading-relaxed text-slate-700">{String(n.details?.note || '')}</p>
                  <p className="mt-1 text-[11px] font-semibold text-slate-400">{String(n.details?.author || 'Officer')} · {timeAgo(n.created_at)}</p>
                </div>
              ))}
              {detail.notes.length === 0 && <p className="text-xs text-slate-400">No notes yet.</p>}
            </div>
          </div>

          {/* History */}
          <div className="rounded-3xl border border-slate-200 bg-white p-5">
            <h3 className="flex items-center gap-2 text-sm font-extrabold text-slate-800">
              <History className="h-4 w-4 text-slate-400" /> Audit trail
            </h3>
            <div className="mt-3 max-h-72 space-y-2.5 overflow-y-auto">
              {detail.history.map((h) => (
                <div key={h.id} className="flex gap-2.5 text-xs">
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-slate-300" />
                  <span>
                    <span className="font-bold text-slate-700">{h.action.replace('issue.', '').replace(/_/g, ' ')}</span>
                    <span className="block text-slate-400">{timeAgo(h.created_at)}{h.details && (h.details as { officer?: string }).officer ? ` · ${(h.details as { officer?: string }).officer}` : ''}</span>
                  </span>
                </div>
              ))}
              {detail.history.length === 0 && <p className="text-xs text-slate-400">No history yet.</p>}
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={!!confirmStatus}
        title={`${confirmStatus?.label}?`}
        message={confirmStatus?.to === 'verified'
          ? 'This closes the issue permanently. Citizens will see it as verified.'
          : `The issue status will change to “${confirmStatus?.to.replace('_', ' ')}”. Citizens tracking it will be notified in their timeline.`}
        confirmLabel={confirmStatus?.label || 'Confirm'}
        danger={confirmStatus?.to === 'reopened'}
        busy={busy}
        onConfirm={() => confirmStatus && changeStatus(confirmStatus.to)}
        onClose={() => setConfirmStatus(null)}
      />
      <ConfirmDialog
        open={confirmMerge}
        title={`Merge ${selectedMerge.length} issue(s)?`}
        message="All citizen reports from the selected issues will move into this issue as duplicates. Nothing is deleted — the merged issues are marked as duplicates and priority is re-scored."
        confirmLabel="Merge issues"
        busy={busy}
        onConfirm={merge}
        onClose={() => setConfirmMerge(false)}
      />
      {(!isOfficer) && (
        <p className="mt-4 flex items-center gap-1.5 text-xs text-slate-400">
          <AlertTriangle className="h-3.5 w-3.5" /> Viewing as citizen — officer actions (assign, notes, resolve, merge) require an officer account. <Link to="/officer/login" className="font-bold text-indigo-700">Officer login →</Link>
        </p>
      )}
    </div>
  );
}
