import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import {
  Landmark,
  LayoutDashboard,
  Map as MapIcon,
  BarChart3,
  PlusCircle,
  ShieldCheck,
  LogOut,
  Menu,
  X,
  User as UserIcon,
  FileText,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';

function linkCls({ isActive }: { isActive: boolean }) {
  return `flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition ${
    isActive ? 'bg-white/15 text-white shadow-inner' : 'text-emerald-50/80 hover:bg-white/10 hover:text-white'
  }`;
}

export default function Navbar() {
  const { user, profile, isOfficer, signOut } = useAuth();
  const { success } = useToast();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    success('Signed out', 'See you soon. Your city thanks you.');
    navigate('/');
  };

  const citizenLinks = user ? (
    <>
      <NavLink to="/dashboard" className={linkCls} onClick={() => setOpen(false)}>
        <LayoutDashboard className="h-4 w-4" /> My Reports
      </NavLink>
      <NavLink to="/report" className={linkCls} onClick={() => setOpen(false)}>
        <PlusCircle className="h-4 w-4" /> Report Issue
      </NavLink>
    </>
  ) : null;

  const officerLinks = isOfficer ? (
    <>
      <NavLink to="/officer" className={linkCls} onClick={() => setOpen(false)}>
        <ShieldCheck className="h-4 w-4" /> Command Center
      </NavLink>
      <NavLink to="/officer/map" className={linkCls} onClick={() => setOpen(false)}>
        <MapIcon className="h-4 w-4" /> City Map
      </NavLink>
      <NavLink to="/officer/analytics" className={linkCls} onClick={() => setOpen(false)}>
        <BarChart3 className="h-4 w-4" /> Analytics
      </NavLink>
    </>
  ) : null;

  return (
    <header className="sticky top-0 z-50 border-b border-emerald-950/40 bg-gradient-to-r from-emerald-950 via-emerald-900 to-teal-950 shadow-lg shadow-emerald-950/20">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2.5" onClick={() => setOpen(false)}>
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg shadow-orange-900/40">
            <Landmark className="h-5 w-5 text-emerald-950" />
          </span>
          <span className="leading-tight">
            <span className="block text-lg font-extrabold tracking-tight text-white">
              Civic<span className="text-amber-400">Fix</span>
            </span>
            <span className="hidden text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-200/70 sm:block">
              Intelligent Grievance Triage
            </span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          {!user && (
            <>
              <NavLink to="/track" className={linkCls}>
                <FileText className="h-4 w-4" /> Track Complaint
              </NavLink>
              <NavLink to="/city-map" className={linkCls}>
                <MapIcon className="h-4 w-4" /> Public Map
              </NavLink>
            </>
          )}
          {profile?.role === 'citizen' && citizenLinks}
          {profile?.role === 'citizen' && (
            <NavLink to="/city-map" className={linkCls} onClick={() => setOpen(false)}>
              <MapIcon className="h-4 w-4" /> City Map
            </NavLink>
          )}
          {(profile?.role === 'officer' || profile?.role === 'admin') && officerLinks}
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          {user ? (
            <>
              <span className="flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-xs font-semibold text-white">
                <UserIcon className="h-3.5 w-3.5" />
                <span className="max-w-[140px] truncate">{profile?.full_name || user.email}</span>
                <span className="rounded-full bg-amber-400/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-300">
                  {profile?.role || 'citizen'}
                </span>
              </span>
              <button
                onClick={handleSignOut}
                className="flex items-center gap-1.5 rounded-xl bg-white/10 px-3.5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/20"
              >
                <LogOut className="h-4 w-4" /> Sign out
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="rounded-xl px-3.5 py-2.5 text-sm font-semibold text-emerald-50/90 transition hover:bg-white/10 hover:text-white">
                Citizen Login
              </Link>
              <Link
                to="/report"
                className="rounded-xl bg-amber-400 px-4 py-2.5 text-sm font-bold text-emerald-950 shadow-lg shadow-amber-900/30 transition hover:bg-amber-300"
              >
                Report an Issue
              </Link>
              <Link to="/officer/login" className="rounded-xl border border-white/20 px-3.5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10">
                Officer Portal
              </Link>
            </>
          )}
        </div>

        <button
          className="rounded-xl p-2 text-white transition hover:bg-white/10 lg:hidden"
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-white/10 bg-emerald-950/95 px-4 pb-5 pt-3 backdrop-blur lg:hidden">
          <nav className="flex flex-col gap-1">
            {!user && (
              <>
                <NavLink to="/track" className={linkCls} onClick={() => setOpen(false)}>
                  <FileText className="h-4 w-4" /> Track Complaint
                </NavLink>
                <NavLink to="/city-map" className={linkCls} onClick={() => setOpen(false)}>
                  <MapIcon className="h-4 w-4" /> Public Map
                </NavLink>
                <Link to="/login" onClick={() => setOpen(false)} className="rounded-xl px-3.5 py-2.5 text-sm font-semibold text-white hover:bg-white/10">
                  Citizen Login / Register
                </Link>
                <Link to="/report" onClick={() => setOpen(false)} className="rounded-xl bg-amber-400 px-3.5 py-2.5 text-center text-sm font-bold text-emerald-950">
                  Report an Issue
                </Link>
                <Link to="/officer/login" onClick={() => setOpen(false)} className="rounded-xl border border-white/20 px-3.5 py-2.5 text-center text-sm font-semibold text-white">
                  Officer Portal
                </Link>
              </>
            )}
            {profile?.role === 'citizen' && citizenLinks}
            {profile?.role === 'citizen' && (
              <NavLink to="/city-map" className={linkCls} onClick={() => setOpen(false)}>
                <MapIcon className="h-4 w-4" /> City Map
              </NavLink>
            )}
            {(profile?.role === 'officer' || profile?.role === 'admin') && officerLinks}
            {user && (
              <div className="mt-2 border-t border-white/10 pt-3">
                <p className="px-3.5 text-xs text-emerald-200/70">
                  {profile?.full_name} · {profile?.role}
                </p>
                <button
                  onClick={handleSignOut}
                  className="mt-2 flex w-full items-center gap-2 rounded-xl bg-white/10 px-3.5 py-2.5 text-sm font-semibold text-white"
                >
                  <LogOut className="h-4 w-4" /> Sign out
                </button>
              </div>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
