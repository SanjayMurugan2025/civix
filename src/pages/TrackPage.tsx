import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Search, FileText, Loader2 } from 'lucide-react';
import { apiFetch } from '../lib/api';
import { useToast } from '../contexts/ToastContext';
import type { Complaint } from '../types';

export default function TrackPage() {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const { error: toastError } = useToast();
  const navigate = useNavigate();

  const track = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = code.trim().replace(/^#/, '');
    if (clean.length < 4) {
      toastError('Invalid tracking code', 'Enter at least the first 4 characters of your complaint ID.');
      return;
    }
    setBusy(true);
    try {
      // Try direct ID lookup first.
      try {
        const direct = await apiFetch<Complaint>(`/api/complaints?id=${clean}`);
        if (direct?.id) {
          navigate(`/complaints/${direct.id}`);
          return;
        }
      } catch { /* fall through to search */ }
      const r = await apiFetch<{ complaints: Complaint[] }>(`/api/complaints?limit=100&order=newest`);
      const match = (r.complaints || []).find((c) => c.id.toLowerCase().startsWith(clean.toLowerCase()));
      if (match) {
        navigate(`/complaints/${match.id}`);
      } else {
        toastError('Not found', 'No complaint starts with that code. Check your tracking ID and try again.');
      }
    } catch (err: unknown) {
      toastError('Lookup failed', (err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-xl py-8">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl sm:p-8">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
          <FileText className="h-6 w-6" />
        </span>
        <h1 className="mt-4 text-2xl font-black tracking-tight text-slate-900">Track your complaint</h1>
        <p className="mt-1.5 text-sm leading-relaxed text-slate-500">
          Enter the tracking code from your report confirmation (the 8-character ID, e.g. <span className="font-mono font-bold">A3F9C21B</span>).
          No login needed for public tracking.
        </p>
        <form onSubmit={track} className="mt-5 flex gap-2">
          <label className="flex flex-1 items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 transition focus-within:border-sky-400 focus-within:bg-white focus-within:ring-2 focus-within:ring-sky-500">
            <Search className="h-4 w-4 shrink-0 text-slate-400" />
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="e.g. A3F9C21B"
              className="w-full bg-transparent font-mono text-sm font-bold uppercase tracking-widest outline-none placeholder:text-slate-400"
            />
          </label>
          <button disabled={busy} className="inline-flex items-center gap-2 rounded-2xl bg-sky-700 px-5 py-3 text-sm font-extrabold text-white shadow transition hover:bg-sky-600 disabled:opacity-60">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} Track
          </button>
        </form>
        <p className="mt-5 text-center text-xs text-slate-400">
          Filed while signed in? <Link to="/dashboard" className="font-bold text-sky-700">Open your dashboard →</Link>
        </p>
      </div>
    </div>
  );
}
