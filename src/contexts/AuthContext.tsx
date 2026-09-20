import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import supabase from '../lib/supabase';
import { apiFetch } from '../lib/api';
import type { User, Session } from '@supabase/supabase-js';

export type Role = 'citizen' | 'officer' | 'admin';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: Role;
  phone?: string;
  ward?: string;
  department?: string;
  created_at?: string;
}

interface AuthCtx {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  isOfficer: boolean;
  refreshProfile: () => Promise<Profile | null>;
  signOut: () => Promise<void>;
  loginDemoUser: (role: 'citizen' | 'officer') => void;
}

const Ctx = createContext<AuthCtx>({
  user: null,
  session: null,
  profile: null,
  loading: true,
  isOfficer: false,
  refreshProfile: async () => null,
  signOut: async () => {},
  loginDemoUser: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = useCallback(async (): Promise<Profile | null> => {
    try {
      const p = await apiFetch<Profile | null>('/api/auth-profile');
      if (p) {
        setProfile(p);
        return p;
      }
    } catch {
      /* fetch failed */
    }
    const demoSess = localStorage.getItem('civicfix_demo_session');
    if (demoSess) {
      try {
        const { profile: dProfile } = JSON.parse(demoSess);
        setProfile(dProfile);
        return dProfile;
      } catch {
        /* noop */
      }
    }
    setProfile(null);
    return null;
  }, []);

  const loginDemoUser = useCallback((role: 'citizen' | 'officer') => {
    const isOff = role === 'officer';
    const demoUser = {
      id: isOff ? 'demo-officer-id' : 'demo-citizen-id',
      email: isOff ? 'officer@civicfix.in' : 'citizen@civicfix.in',
      aud: 'authenticated',
      role: 'authenticated',
      created_at: new Date().toISOString(),
      app_metadata: { provider: 'email' },
      user_metadata: { full_name: isOff ? 'Officer Rajesh Kumar' : 'Demo Citizen' },
    } as unknown as User;

    const demoProf: Profile = {
      id: demoUser.id,
      email: demoUser.email || '',
      full_name: isOff ? 'Officer Rajesh Kumar' : 'Demo Citizen',
      role: isOff ? 'officer' : 'citizen',
      phone: isOff ? '9876543211' : '9876543210',
      ward: isOff ? 'Central Zone' : 'Ward 4',
      department: isOff ? 'Roads & Traffic' : '',
      created_at: new Date().toISOString(),
    };

    const sessObj = { user: demoUser, profile: demoProf };
    localStorage.setItem('civicfix_demo_session', JSON.stringify(sessObj));
    setUser(demoUser);
    setSession({ user: demoUser, access_token: 'demo-token', refresh_token: 'demo-refresh' } as unknown as Session);
    setProfile(demoProf);
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const demoSess = localStorage.getItem('civicfix_demo_session');
      if (demoSess) {
        try {
          const { user: dUser, profile: dProfile } = JSON.parse(demoSess);
          if (mounted) {
            setUser(dUser);
            setSession({ user: dUser } as unknown as Session);
            setProfile(dProfile);
            setLoading(false);
            return;
          }
        } catch {
          localStorage.removeItem('civicfix_demo_session');
        }
      }

      try {
        const { data } = await supabase.auth.getSession();
        if (!mounted) return;
        setSession(data.session);
        setUser(data.session?.user ?? null);
        if (data.session?.user) await refreshProfile();
      } catch {
        /* supabase fetch error */
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, sess) => {
      if (localStorage.getItem('civicfix_demo_session')) return;
      setSession(sess);
      setUser(sess?.user ?? null);
      if (sess?.user) {
        await refreshProfile();
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [refreshProfile]);

  const signOut = useCallback(async () => {
    localStorage.removeItem('civicfix_demo_session');
    try {
      await supabase.auth.signOut();
    } catch {
      /* noop */
    }
    setUser(null);
    setSession(null);
    setProfile(null);
  }, []);

  const value = useMemo<AuthCtx>(
    () => ({
      user,
      session,
      profile,
      loading,
      isOfficer: profile?.role === 'officer' || profile?.role === 'admin',
      refreshProfile,
      signOut,
      loginDemoUser,
    }),
    [user, session, profile, loading, refreshProfile, signOut, loginDemoUser]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
