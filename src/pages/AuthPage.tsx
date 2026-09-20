import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Landmark, Mail, Lock, User as UserIcon, Phone, MapPin, Eye, EyeOff, Loader2, ShieldCheck } from 'lucide-react';
import supabase from '../lib/supabase';
import { apiFetch } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { googleConfigured, signInWithGoogle } from '../lib/googleAuth';
import { DEPARTMENTS } from '../lib/format';

type Mode = 'citizen' | 'officer';

export default function AuthPage({ mode }: { mode: Mode }) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState(mode === 'officer' ? 'officer@civicfix.in' : '');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [ward, setWard] = useState('');
  const [department, setDepartment] = useState(DEPARTMENTS[0]);
  const [officerCode, setOfficerCode] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [fieldError, setFieldError] = useState('');

  const { user, profile, refreshProfile, loginDemoUser } = useAuth();
  const { success, error: toastError } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const next = new URLSearchParams(location.search).get('next') || (location.state as { from?: string } | null)?.from;

  useEffect(() => {
    if (user && profile) {
      const dest = next || (profile.role === 'citizen' ? '/dashboard' : '/officer');
      navigate(dest, { replace: true });
    }
  }, [user, profile, navigate, next]);

  const validate = (): boolean => {
    if (!email.includes('@')) { setFieldError('Please enter a valid email address.'); return false; }
    if (password.length < 6) { setFieldError('Password must be at least 6 characters.'); return false; }
    if (isSignUp && mode === 'citizen' && !fullName.trim()) { setFieldError('Please enter your full name.'); return false; }
    if (mode === 'officer' && isSignUp && !officerCode.trim()) { setFieldError('Officer access code is required to register.'); return false; }
    setFieldError('');
    return true;
  };

  const provisionProfile = async (role: 'citizen' | 'officer') => {
    try {
      await apiFetch('/api/auth-profile', {
        method: 'POST',
        body: JSON.stringify({
          full_name: fullName || email.split('@')[0],
          role,
          phone,
          ward,
          department: role === 'officer' ? department : '',
          officer_code: officerCode,
        }),
      });
    } catch (e: unknown) {
      throw e;
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate() || busy) return;
    setBusy(true);
    const isDemoAccount = email === 'citizen@civicfix.in' || email === 'officer@civicfix.in';

    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) {
          if (isDemoAccount) {
            loginDemoUser(mode);
            success('Welcome to CivicFix (Demo Mode)!', 'Signed in successfully.');
            return;
          }
          throw error;
        }
        if (!data.session) {
          success('Account created', 'Please check your email to confirm, then sign in.');
          setIsSignUp(false);
          return;
        }
        await provisionProfile(mode);
        await refreshProfile();
        success('Welcome to CivicFix!', mode === 'officer' ? 'Officer account provisioned.' : 'Your citizen account is ready.');
      } else {
        try {
          const { data, error } = await supabase.auth.signInWithPassword({ email, password });
          if (error) {
            if (isDemoAccount) {
              const { data: suData, error: suErr } = await supabase.auth.signUp({ email, password });
              if (!suErr && suData.session) {
                await provisionProfile(mode);
                await refreshProfile();
                success('Welcome to CivicFix!', mode === 'officer' ? 'Officer account provisioned.' : 'Your citizen account is ready.');
                return;
              }
              loginDemoUser(mode);
              success('Welcome to CivicFix (Demo Mode)!', 'Signed in successfully.');
              return;
            }
            throw error;
          }
          if (data.user) {
            try {
              const existing = await apiFetch<{ role?: string } | null>('/api/auth-profile');
              if (!existing) {
                await provisionProfile(mode);
              } else if (mode === 'officer' && existing.role === 'citizen') {
                await supabase.auth.signOut();
                throw new Error('This account is registered as a citizen. Use the citizen login instead.');
              }
            } catch (err: unknown) {
              const msg = (err as Error).message || '';
              if (msg.includes('citizen login')) throw err;
              try { await provisionProfile(mode); } catch { /* profile may already exist */ }
            }
            await refreshProfile();
          }
          success('Welcome back!', 'Signed in successfully.');
        } catch (err: unknown) {
          if (isDemoAccount) {
            loginDemoUser(mode);
            success('Welcome to CivicFix (Demo Mode)!', 'Signed in successfully.');
            return;
          }
          throw err;
        }
      }
    } catch (err: unknown) {
      toastError('Authentication failed', (err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handleGoogle = () => {
    if (!googleConfigured()) {
      toastError('Google sign-in unavailable', 'OAuth is not configured for this deployment. Please use email.');
      return;
    }
    signInWithGoogle('CivicFix');
  };

  const demoFill = (kind: 'citizen' | 'officer') => {
    if (kind === 'citizen') {
      setEmail('citizen@civicfix.in');
      setPassword('citizen123');
    } else {
      setEmail('officer@civicfix.in');
      setPassword('officer123');
    }
    setIsSignUp(false);
  };

  const isOfficerMode = mode === 'officer';

  return (
    <div className="mx-auto flex max-w-5xl flex-col items-center">
      <div className="grid w-full overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl lg:grid-cols-2">
        {/* Side panel */}
        <div className={`relative hidden flex-col justify-between p-8 lg:flex ${isOfficerMode ? 'bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900' : 'bg-gradient-to-br from-emerald-900 via-emerald-800 to-teal-900'}`}>
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500">
                <Landmark className="h-5 w-5 text-emerald-950" />
              </span>
              <span className="text-lg font-extrabold text-white">Civic<span className="text-amber-400">Fix</span></span>
            </div>
            <h2 className="mt-8 text-3xl font-black leading-tight text-white">
              {isOfficerMode ? 'Command every issue in your city.' : 'Your city, fixed together.'}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-white/70">
              {isOfficerMode
                ? 'Prioritized queues, duplicate intelligence, one-tap assignments and resolution evidence — everything an officer needs in one command center.'
                : 'Report potholes, garbage, leaks and outages in under a minute. Watch AI triage, prioritize and track your issue to resolution.'}
            </p>
            <ul className="mt-6 space-y-3 text-sm text-white/85">
              {(isOfficerMode
                ? ['AI-prioritized issue queue', 'Deduplication inspector & merge', 'SLA analytics by department']
                : ['AI triage in seconds', 'Live status tracking & evidence', 'Verify fixes with one tap']
              ).map((t) => (
                <li key={t} className="flex items-center gap-2.5">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-400/20 text-xs font-black text-amber-300">✓</span>
                  {t}
                </li>
              ))}
            </ul>
          </div>
          <p className="text-xs text-white/50">PS-18 · Secure · Audited · Accountable</p>
        </div>

        {/* Form */}
        <div className="p-6 sm:p-10">
          <div className="flex items-center gap-2 lg:hidden">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500">
              <Landmark className="h-4 w-4 text-emerald-950" />
            </span>
            <span className="font-extrabold text-slate-900">CivicFix</span>
          </div>
          <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-900 lg:mt-0">
            {isSignUp ? `Create ${isOfficerMode ? 'officer' : 'citizen'} account` : `${isOfficerMode ? 'Officer' : 'Citizen'} ${isSignUp ? 'register' : 'sign in'}`}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {isSignUp ? 'Join CivicFix in seconds.' : `Welcome back. ${isOfficerMode ? 'Access the command center.' : 'Track your city.'}`}
          </p>

          <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs">
            <p className="font-bold text-slate-700">Demo accounts <span className="font-medium text-slate-400">(one-click fill)</span></p>
            <div className="mt-2 flex flex-wrap gap-2">
              <button type="button" onClick={() => demoFill('citizen')} className="rounded-lg bg-white px-3 py-1.5 font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:ring-emerald-300">
                Citizen · citizen@civicfix.in
              </button>
              <button type="button" onClick={() => demoFill('officer')} className="rounded-lg bg-white px-3 py-1.5 font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:ring-indigo-300">
                Officer · officer@civicfix.in
              </button>
            </div>
          </div>

          <form onSubmit={handleEmailAuth} className="mt-5 space-y-3.5" noValidate>
            {isSignUp && (
              <label className="block">
                <span className="mb-1.5 block text-xs font-bold text-slate-600">Full name</span>
                <span className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-3 ring-emerald-500 transition focus-within:border-emerald-400 focus-within:ring-2">
                  <UserIcon className="h-4 w-4 shrink-0 text-slate-400" />
                  <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Asha Verma" className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400" />
                </span>
              </label>
            )}
            <label className="block">
              <span className="mb-1.5 block text-xs font-bold text-slate-600">Email</span>
              <span className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-3 transition focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-500">
                <Mail className="h-4 w-4 shrink-0 text-slate-400" />
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400" autoComplete="email" />
              </span>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-bold text-slate-600">Password</span>
              <span className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-3 transition focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-500">
                <Lock className="h-4 w-4 shrink-0 text-slate-400" />
                <input type={showPw ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min. 6 characters" className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400" autoComplete={isSignUp ? 'new-password' : 'current-password'} />
                <button type="button" onClick={() => setShowPw(!showPw)} className="text-slate-400 hover:text-slate-600" aria-label="Toggle password">
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </span>
            </label>

            {isSignUp && !isOfficerMode && (
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="mb-1.5 block text-xs font-bold text-slate-600">Phone <span className="font-medium text-slate-400">(optional)</span></span>
                  <span className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-3 transition focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-500">
                    <Phone className="h-4 w-4 shrink-0 text-slate-400" />
                    <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="98XXXXXX00" className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400" />
                  </span>
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-bold text-slate-600">Ward <span className="font-medium text-slate-400">(optional)</span></span>
                  <span className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-3 transition focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-500">
                    <MapPin className="h-4 w-4 shrink-0 text-slate-400" />
                    <input value={ward} onChange={(e) => setWard(e.target.value)} placeholder="Ward 12" className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400" />
                  </span>
                </label>
              </div>
            )}

            {isOfficerMode && isSignUp && (
              <>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-bold text-slate-600">Department</span>
                  <select value={department} onChange={(e) => setDepartment(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500">
                    {DEPARTMENTS.map((d) => <option key={d}>{d}</option>)}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-slate-600">
                    <ShieldCheck className="h-3.5 w-3.5 text-indigo-600" /> Officer access code
                  </span>
                  <input value={officerCode} onChange={(e) => setOfficerCode(e.target.value)} placeholder="Issued by municipal admin" className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm outline-none placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500" />
                </label>
              </>
            )}

            {fieldError && (
              <p className="rounded-xl bg-red-50 px-3.5 py-2.5 text-xs font-semibold text-red-700 ring-1 ring-red-200">{fieldError}</p>
            )}

            <button
              type="submit"
              disabled={busy}
              className={`flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-extrabold text-white shadow-lg transition disabled:opacity-60 ${
                isOfficerMode ? 'bg-indigo-700 shadow-indigo-900/20 hover:bg-indigo-600' : 'bg-emerald-700 shadow-emerald-900/20 hover:bg-emerald-600'
              }`}
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              {isSignUp ? 'Create account' : 'Sign in'}
            </button>
          </form>

          {!isOfficerMode && (
            <>
              <div className="my-5 flex items-center gap-3 text-xs font-semibold text-slate-400">
                <span className="h-px flex-1 bg-slate-200" /> or <span className="h-px flex-1 bg-slate-200" />
              </div>
              <button
                onClick={handleGoogle}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-3 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                <svg className="h-4.5 w-4.5" width="18" height="18" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3l5.7-5.7C34.5 6.1 29.5 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.7-.4-3.9z" /><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3l5.7-5.7C34.5 6.1 29.5 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" /><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" /><path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C36.9 39.2 44 34 44 24c0-1.3-.1-2.7-.4-3.9z" /></svg>
                Continue with Google
              </button>
            </>
          )}

          <div className="mt-6 flex items-center justify-between text-sm">
            <button onClick={() => setIsSignUp(!isSignUp)} className="font-bold text-emerald-700 hover:text-emerald-600">
              {isSignUp ? 'Already have an account? Sign in' : "New here? Create an account"}
            </button>
          </div>
          <p className="mt-4 text-center text-xs text-slate-400">
            {isOfficerMode ? (
              <>Are you a citizen? <Link to="/login" className="font-bold text-indigo-700">Citizen login →</Link></>
            ) : (
              <>Municipal staff? <Link to="/officer/login" className="font-bold text-emerald-700">Officer portal →</Link></>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
