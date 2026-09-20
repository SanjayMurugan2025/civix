import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Landmark, ShieldCheck, Sparkles, MapPin } from 'lucide-react';
import Navbar from './Navbar';

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-slate-100">
      <Navbar />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 sm:py-8">{children}</main>
      <footer className="border-t border-emerald-950/30 bg-emerald-950 text-emerald-100/80">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-4">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500">
                <Landmark className="h-4.5 w-4.5 text-emerald-950" />
              </span>
              <span className="text-lg font-extrabold text-white">
                Civic<span className="text-amber-400">Fix</span>
              </span>
            </div>
            <p className="mt-3 max-w-md text-sm leading-relaxed">
              Intelligent Citizen Grievance Triage, Deduplication &amp; Accountability.
              AI converts raw complaints into categorized, prioritized, deduplicated civic
              issues routed to the right department — tracked transparently to resolution.
            </p>
            <p className="mt-2 text-xs text-emerald-200/60">PS-18 · Smart City Grievance Platform</p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-emerald-300">Citizens</p>
            <ul className="mt-3 space-y-2 text-sm">
              <li><Link to="/report" className="hover:text-white">Report an issue</Link></li>
              <li><Link to="/dashboard" className="hover:text-white">Track my reports</Link></li>
              <li><Link to="/city-map" className="hover:text-white">Public city map</Link></li>
              <li><Link to="/login" className="hover:text-white">Citizen login</Link></li>
            </ul>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-emerald-300">Officers</p>
            <ul className="mt-3 space-y-2 text-sm">
              <li><Link to="/officer" className="hover:text-white">Command center</Link></li>
              <li><Link to="/officer/map" className="hover:text-white">Officer map</Link></li>
              <li><Link to="/officer/analytics" className="hover:text-white">Analytics</Link></li>
              <li><Link to="/officer/login" className="hover:text-white">Officer login</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-white/10">
          <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-4 text-xs text-emerald-200/60 sm:flex-row sm:px-6">
            <span className="flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5" /> Gemini AI triage with deterministic fallback
            </span>
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5" /> Role-based access · Audit trail
              <MapPin className="ml-2 h-3.5 w-3.5" /> OpenStreetMap
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
