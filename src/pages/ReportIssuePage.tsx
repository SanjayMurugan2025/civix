import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import {
  Camera, MapPin, Sparkles, ArrowLeft, ArrowRight, CheckCircle2, Loader2,
  ImagePlus, X, AlertTriangle, Building2, Link2, PartyPopper,
} from 'lucide-react';
import { apiFetch, uploadEvidence, validateImageFile } from '../lib/api';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import AITriageCard from '../components/AITriageCard';
import DuplicatePanel from '../components/DuplicatePanel';
import LocationPicker from '../components/LocationPicker';
import type { Complaint, CivicIssue, TriageResult } from '../types';

const DRAFT_KEY = 'civicfix-report-draft';

interface Draft {
  title: string;
  description: string;
  address: string;
  lat: number | null;
  lng: number | null;
  affected: string;
}

function loadDraft(): Draft {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const parsedLat = parsed.lat !== null && parsed.lat !== undefined ? Number(parsed.lat) : null;
      const parsedLng = parsed.lng !== null && parsed.lng !== undefined ? Number(parsed.lng) : null;
      const validLat = parsedLat !== null && !isNaN(parsedLat) && isFinite(parsedLat) ? parsedLat : null;
      const validLng = parsedLng !== null && !isNaN(parsedLng) && isFinite(parsedLng) ? parsedLng : null;

      return {
        title: String(parsed.title || ''),
        description: String(parsed.description || ''),
        address: String(parsed.address || ''),
        lat: validLat,
        lng: validLng,
        affected: String(parsed.affected || ''),
      };
    }
  } catch { /* noop */ }
  return { title: '', description: '', address: '', lat: null, lng: null, affected: '' };
}

export default function ReportIssuePage() {
  const draft = useRef(loadDraft()).current;
  const [step, setStep] = useState(1);
  const [title, setTitle] = useState(draft.title);
  const [description, setDescription] = useState(draft.description);
  const [address, setAddress] = useState(draft.address);
  const [lat, setLat] = useState<number | null>(draft.lat);
  const [lng, setLng] = useState<number | null>(draft.lng);
  const [affected, setAffected] = useState(draft.affected);
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState('');

  const [triage, setTriage] = useState<TriageResult | null>(null);
  const [triageLoading, setTriageLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploadPct, setUploadPct] = useState('');
  const [result, setResult] = useState<{ complaint: Complaint; issue: CivicIssue; linked: boolean } | null>(null);
  const [formError, setFormError] = useState('');

  const { user } = useAuth();
  const { success, error: toastError, info } = useToast();
  const navigate = useNavigate();
  const triageTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTriaged = useRef('');

  // Persist draft
  useEffect(() => {
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ title, description, address, lat, lng, affected }));
  }, [title, description, address, lat, lng, affected]);

  const runTriage = useCallback(async (desc: string, t: string, addr: string, la: number | null, ln: number | null) => {
    if (desc.trim().length < 20) return;
    const sig = `${desc}|${t}|${addr}`;
    if (sig === lastTriaged.current) return;
    lastTriaged.current = sig;
    setTriageLoading(true);
    try {
      const r = await apiFetch<TriageResult>('/api/triage-ai', {
        method: 'POST',
        body: JSON.stringify({ action: 'classify', title: t, description: desc, address: addr, lat: la, lng: ln }),
      });
      setTriage(r);
    } catch {
      // Silent: triage preview is best-effort; server re-triages on submit anyway.
    } finally {
      setTriageLoading(false);
    }
  }, []);

  // Debounced live triage while typing (step 1)
  useEffect(() => {
    if (step !== 1) return;
    if (triageTimer.current) clearTimeout(triageTimer.current);
    triageTimer.current = setTimeout(() => runTriage(description, title, address, lat, lng), 1400);
    return () => { if (triageTimer.current) clearTimeout(triageTimer.current); };
  }, [description, title, address, step, lat, lng, runTriage]);

  const pickPhoto = (f: File | null) => {
    setPhotoError('');
    if (!f) {
      setPhoto(null);
      setPhotoPreview(null);
      return;
    }
    const err = validateImageFile(f);
    if (err) { setPhotoError(err); return; }
    setPhoto(f);
    setPhotoPreview(URL.createObjectURL(f));
  };

  const validateStep = (s: number): boolean => {
    if (s === 1) {
      if (description.trim().length < 20) { setFormError('Please describe the issue in at least 20 characters so the AI can classify it accurately.'); return false; }
    }
    if (s === 2) {
      if (!address.trim() && (lat === null || lng === null)) { setFormError('Please add a location — either a landmark/address or a map pin.'); return false; }
    }
    setFormError('');
    return true;
  };

  const next = () => {
    if (!validateStep(step)) return;
    if (step === 2 && !triage && !triageLoading) {
      runTriage(description, title, address, lat, lng);
    }
    setStep((s) => Math.min(3, s + 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const submit = async () => {
    if (!user) { navigate('/login?next=/report'); return; }
    if (!validateStep(1) || !validateStep(2)) { setStep(1); return; }
    setSubmitting(true);
    setUploadPct('');
    try {
      let imageUrl: string | null = null;
      if (photo) {
        setUploadPct('Uploading photo evidence…');
        const up = await uploadEvidence(photo, 'complaints');
        imageUrl = up.url;
      }
      setUploadPct(triage ? 'Filing your report…' : 'AI is triaging your report…');
      const payload = await apiFetch<{ complaint: Complaint; issue: CivicIssue; linked_as_duplicate: boolean }>(
        '/api/complaints',
        {
          method: 'POST',
          body: JSON.stringify({
            title: title.trim() || undefined,
            description: description.trim(),
            address: address.trim(),
            lat, lng,
            image_url: imageUrl,
            affected_estimate: affected ? Number(affected) : undefined,
            ai_result: triage,
          }),
        }
      );
      localStorage.removeItem(DRAFT_KEY);
      setResult({ complaint: payload.complaint, issue: payload.issue, linked: payload.linked_as_duplicate });
      setStep(4);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      confetti({ particleCount: 130, spread: 75, origin: { y: 0.25 }, colors: ['#10B981', '#F59E0B', '#ffffff', '#14B8A6'] });
      if (payload.linked_as_duplicate) {
        info('Linked to an existing issue', `Your report matched Civic Issue #${payload.issue.id.slice(0, 8)} and boosted its priority.`);
      } else {
        success('Report filed successfully', `Civic Issue #${payload.issue.id.slice(0, 8)} created and routed to ${payload.issue.department}.`);
      }
    } catch (e: unknown) {
      toastError('Submission failed', (e as Error).message);
    } finally {
      setSubmitting(false);
      setUploadPct('');
    }
  };

  const steps = [
    { n: 1, label: 'Describe' },
    { n: 2, label: 'Locate' },
    { n: 3, label: 'Review & AI' },
    { n: 4, label: 'Done' },
  ];

  return (
    <div className="mx-auto max-w-4xl">
      <button onClick={() => navigate(-1)} className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 transition hover:text-slate-800">
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <div className="mb-6">
        <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">Report a civic issue</h1>
        <p className="mt-1 text-sm text-slate-500">Describe it once — AI handles category, priority, department and duplicates.</p>
      </div>

      {/* Stepper */}
      <div className="mb-7 flex items-center gap-1.5 sm:gap-2">
        {steps.map((s, i) => (
          <div key={s.n} className="flex flex-1 items-center gap-1.5 sm:gap-2">
            <button
              onClick={() => s.n < step && setStep(s.n)}
              disabled={s.n >= step && step !== 4}
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-extrabold transition ${
                step > s.n ? 'bg-emerald-600 text-white' : step === s.n ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-500'
              }`}
            >
              {step > s.n ? <CheckCircle2 className="h-4 w-4" /> : s.n}
            </button>
            <span className={`hidden text-xs font-bold sm:block ${step >= s.n ? 'text-slate-800' : 'text-slate-400'}`}>{s.label}</span>
            {i < steps.length - 1 && <span className={`mx-1 h-0.5 flex-1 rounded ${step > s.n ? 'bg-emerald-500' : 'bg-slate-200'}`} />}
          </div>
        ))}
      </div>

      {formError && (
        <div className="mb-5 flex items-start gap-2 rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 ring-1 ring-red-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {formError}
        </div>
      )}

      {/* STEP 1 */}
      {step === 1 && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="grid gap-5 lg:grid-cols-5">
          <div className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5 sm:p-6 lg:col-span-3">
            <label className="block">
              <span className="mb-1.5 block text-xs font-bold text-slate-600">Short title <span className="font-medium text-slate-400">(optional — AI will suggest one)</span></span>
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Huge pothole near City Market signal" maxLength={200}
                className="w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm outline-none placeholder:text-slate-400 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500" />
            </label>
            <label className="block">
              <span className="mb-1.5 flex items-center justify-between text-xs font-bold text-slate-600">
                Describe the problem <span className={description.trim().length >= 20 ? 'text-emerald-600' : 'text-slate-400'}>{description.trim().length}/20 min</span>
              </span>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={6} maxLength={4000}
                placeholder="What is wrong? Where exactly? How long has it been like this? Who is affected? Mention landmarks, schools, hospitals or safety hazards if any…"
                className="w-full resize-y rounded-xl border border-slate-200 px-3.5 py-3 text-sm leading-relaxed outline-none placeholder:text-slate-400 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500" />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block text-xs font-bold text-slate-600">People affected <span className="font-medium text-slate-400">(optional)</span></span>
                <input value={affected} onChange={(e) => setAffected(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="e.g. 200" inputMode="numeric"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm outline-none placeholder:text-slate-400 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500" />
              </label>
              <div>
                <span className="mb-1.5 block text-xs font-bold text-slate-600">Photo evidence <span className="font-medium text-slate-400">(recommended)</span></span>
                {!photoPreview ? (
                  <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-3.5 py-3 text-sm font-semibold text-slate-500 transition hover:border-emerald-400 hover:bg-emerald-50/50 hover:text-emerald-700">
                    <ImagePlus className="h-4 w-4" /> Add photo
                    <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => pickPhoto(e.target.files?.[0] || null)} />
                  </label>
                ) : (
                  <div className="relative overflow-hidden rounded-xl ring-1 ring-slate-200">
                    <img src={photoPreview} alt="Evidence preview" className="h-28 w-full object-cover" />
                    <button type="button" onClick={() => pickPhoto(null)} className="absolute right-2 top-2 rounded-lg bg-slate-900/80 p-1.5 text-white transition hover:bg-red-600" aria-label="Remove photo">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}
                {photoError && <p className="mt-1.5 text-xs font-semibold text-red-600">{photoError}</p>}
                <p className="mt-1 text-[11px] text-slate-400">JPG / PNG / WebP · max 5 MB</p>
              </div>
            </div>
            <div className="flex justify-end">
              <button onClick={next} className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-6 py-3 text-sm font-bold text-white shadow transition hover:bg-slate-700">
                Continue <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="lg:col-span-2">
            <div className="lg:sticky lg:top-24">
              <AITriageCard result={triage} loading={triageLoading && !triage} />
              {!triage && !triageLoading && (
                <p className="mt-2 flex items-start gap-1.5 text-[11px] leading-relaxed text-slate-400">
                  <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  Keep typing — live AI classification starts after ~20 characters.
                </p>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* STEP 2 */}
      {step === 2 && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6">
          <label className="block">
            <span className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-slate-600"><MapPin className="h-3.5 w-3.5" /> Address / landmark</span>
            <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="e.g. Near City Market signal, MG Road, Ward 12" maxLength={300}
              className="w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm outline-none placeholder:text-slate-400 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500" />
          </label>
          <div className="mt-4">
            <span className="mb-1.5 block text-xs font-bold text-slate-600">Drop a GPS pin <span className="font-medium text-slate-400">(improves duplicate detection)</span></span>
            <LocationPicker lat={lat} lng={lng} onChange={(la, ln) => { setLat(la ?? null); setLng(ln ?? null); }} />
          </div>
          <div className="mt-5 flex justify-between">
            <button onClick={() => setStep(1)} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-600 transition hover:bg-slate-50">
              <ArrowLeft className="h-4 w-4" /> Back
            </button>
            <button onClick={next} className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-6 py-3 text-sm font-bold text-white shadow transition hover:bg-slate-700">
              Review & AI check <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </motion.div>
      )}

      {/* STEP 3 */}
      {step === 3 && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6">
            <h3 className="text-sm font-extrabold uppercase tracking-widest text-slate-400">Your report</h3>
            <p className="mt-2 text-base font-bold text-slate-900">{title || description.split(/[.!?\n]/)[0]?.slice(0, 90)}</p>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{description}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1.5 font-semibold"><MapPin className="h-3.5 w-3.5" />{address || 'No address'} {lat !== null && lng !== null && `· ${lat.toFixed(4)}, ${lng.toFixed(4)}`}</span>
              {photoPreview && <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1.5 font-semibold"><Camera className="h-3.5 w-3.5" /> Photo attached</span>}
            </div>
            {photoPreview && <img src={photoPreview} alt="Evidence" className="mt-3 h-44 w-full rounded-2xl object-cover ring-1 ring-slate-200" />}
          </div>

          <AITriageCard result={triage} loading={triageLoading} />

          {triage && <DuplicatePanel candidates={triage.duplicate_candidates} title="Reports that look similar" />}

          <div className="flex flex-col justify-between gap-3 sm:flex-row">
            <button onClick={() => setStep(2)} disabled={submitting} className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50">
              <ArrowLeft className="h-4 w-4" /> Back
            </button>
            <button onClick={submit} disabled={submitting || triageLoading} className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-8 py-3.5 text-sm font-extrabold text-white shadow-lg shadow-emerald-900/20 transition hover:bg-emerald-600 disabled:opacity-60">
              {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> {uploadPct || 'Filing…'}</> : <><CheckCircle2 className="h-4 w-4" /> Submit report</>}
            </button>
          </div>
          {!user && <p className="text-center text-xs text-slate-400">You will be asked to sign in before submitting — your draft is saved.</p>}
        </motion.div>
      )}

      {/* STEP 4 — success */}
      {step === 4 && result && (
        <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="overflow-hidden rounded-3xl border border-emerald-200 bg-white shadow-xl">
          <div className="bg-gradient-to-r from-emerald-700 to-teal-600 p-6 text-center sm:p-8">
            <PartyPopper className="mx-auto h-10 w-10 text-amber-300" />
            <h2 className="mt-3 text-2xl font-black text-white">
              {result.linked ? 'Smart match found!' : 'Report filed successfully!'}
            </h2>
            <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-emerald-50/90">
              {result.linked
                ? 'Your report was linked to an existing Civic Issue as a duplicate — this raised its priority instead of creating clutter. Nothing was deleted.'
                : 'AI triaged your complaint and routed it to the right department. Track every step to resolution.'}
            </p>
          </div>
          <div className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
            <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
              <p className="text-[11px] font-extrabold uppercase tracking-widest text-slate-400">Your complaint</p>
              <p className="mt-1.5 font-mono text-sm font-bold text-slate-800">#{result.complaint.id.slice(0, 8).toUpperCase()}</p>
              <p className="mt-1 line-clamp-2 text-sm text-slate-600">{result.complaint.title}</p>
              <Link to={`/complaints/${result.complaint.id}`} className="mt-2.5 inline-flex items-center gap-1 text-sm font-bold text-emerald-700 hover:text-emerald-600">
                Track complaint <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
              <p className="text-[11px] font-extrabold uppercase tracking-widest text-slate-400">
                {result.linked ? 'Linked civic issue' : 'New civic issue'}
              </p>
              <p className="mt-1.5 font-mono text-sm font-bold text-slate-800">#{result.issue.id.slice(0, 8).toUpperCase()}</p>
              <p className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                <Building2 className="h-3.5 w-3.5" /> {result.issue.department}
              </p>
              <p className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                <Link2 className="h-3.5 w-3.5" /> Priority {result.issue.priority_band} · {result.issue.priority_score}/100
              </p>
              <Link to={`/issues/${result.issue.id}`} className="mt-2.5 inline-flex items-center gap-1 text-sm font-bold text-indigo-700 hover:text-indigo-600">
                View civic issue <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
          <div className="flex flex-col gap-2.5 border-t border-slate-100 p-5 sm:flex-row sm:p-6">
            <button onClick={() => navigate('/dashboard')} className="flex-1 rounded-xl bg-slate-900 py-3 text-sm font-bold text-white transition hover:bg-slate-700">
              Go to my dashboard
            </button>
            <button onClick={() => { setResult(null); setStep(1); setTitle(''); setDescription(''); setAddress(''); setLat(null); setLng(null); setAffected(''); setPhoto(null); setPhotoPreview(null); setTriage(null); lastTriaged.current = ''; window.scrollTo({ top: 0 }); }} className="flex-1 rounded-xl border border-slate-200 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50">
              Report another issue
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
