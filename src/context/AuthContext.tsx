import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { Profile, Settings } from '../types';

interface AuthState {
  session: Session | null;
  profile: Profile | null;
  settings: Settings | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, displayName: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  refreshSettings: () => Promise<void>;
  updateSettings: (patch: Partial<Settings>) => Promise<{ error: string | null }>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

const DEFAULT_SETTINGS: Settings = {
  id: '',
  user_id: '',
  detection_sensitivity: 'medium',
  auto_mitigation: true,
  email_alerts: false,
  browser_notifications: true,
  rate_limit_rps: 100,
  block_duration_minutes: 30,
  geo_block_enabled: false,
  geo_blocked_countries: [],
  whitelist_ips: [],
  theme: 'dark',
  updated_at: '',
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = async (uid: string) => {
    const { data, error } = await supabase.from('profiles').select('*').eq('user_id', uid).maybeSingle();
    if (error) {
      // eslint-disable-next-line no-console
      console.error('profile load error', error);
      return;
    }
    if (!data) {
      // create profile
      const { data: created } = await supabase
        .from('profiles')
        .insert({ user_id: uid, email: session?.user?.email ?? '', display_name: 'Security Analyst', role: 'admin' })
        .select()
        .maybeSingle();
      if (created) setProfile(created as Profile);
    } else {
      setProfile(data as Profile);
      await supabase.from('profiles').update({ last_login_at: new Date().toISOString() }).eq('id', data.id);
    }
  };

  const loadSettings = async (uid: string) => {
    const { data, error } = await supabase.from('settings').select('*').eq('user_id', uid).maybeSingle();
    if (error) {
      // eslint-disable-next-line no-console
      console.error('settings load error', error);
      return;
    }
    if (!data) {
      const { data: created } = await supabase
        .from('settings')
        .insert({ user_id: uid })
        .select()
        .maybeSingle();
      if (created) setSettings(created as Settings);
      else setSettings(DEFAULT_SETTINGS);
    } else {
      setSettings(data as Settings);
    }
  };

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      if (data.session?.user) {
        Promise.all([loadProfile(data.session.user.id), loadSettings(data.session.user.id)]).finally(() => mounted && setLoading(false));
      } else {
        setLoading(false);
      }
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, sess) => {
      setSession(sess);
      if (event === 'SIGNED_OUT') {
        setProfile(null);
        setSettings(null);
      } else if (sess?.user) {
        (async () => {
          await Promise.all([loadProfile(sess.user.id), loadSettings(sess.user.id)]);
        })();
      }
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  };

  const signUp = async (email: string, password: string, displayName: string) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return { error: error.message };
    if (data.user) {
      await supabase.from('profiles').insert({
        user_id: data.user.id,
        email,
        display_name: displayName,
        role: 'admin',
      });
    }
    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setSettings(null);
  };

  const refreshProfile = async () => {
    if (session?.user) await loadProfile(session.user.id);
  };

  const refreshSettings = async () => {
    if (session?.user) await loadSettings(session.user.id);
  };

  const updateSettings = async (patch: Partial<Settings>) => {
    if (!session?.user || !settings) return { error: 'Not authenticated' };
    const { data, error } = await supabase.from('settings').update(patch).eq('user_id', session.user.id).select().maybeSingle();
    if (error) return { error: error.message };
    if (data) setSettings(data as Settings);
    return { error: null };
  };

  const value = useMemo<AuthState>(
    () => ({ session, profile, settings, loading, signIn, signUp, signOut, refreshProfile, refreshSettings, updateSettings }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [session, profile, settings, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
