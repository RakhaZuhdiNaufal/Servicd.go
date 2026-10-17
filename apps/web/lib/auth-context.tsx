'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase-client';

interface AuthCtx {
  session: Session | null;
  user: User | null;
  role: 'admin' | 'customer' | null;
  profileId: string | null;
  loading: boolean;
}

const Ctx = createContext<AuthCtx>({
  session: null,
  user: null,
  role: null,
  profileId: null,
  loading: true
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<'admin' | 'customer' | null>(null);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function syncProfile(accessToken: string) {
    try {
      const res = await fetch('/api/v1/auth/sync-profile', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });
      const json = await res.json();
      if (json.data) {
        setRole(json.data.role);
        setProfileId(json.data.id);
      }
    } catch {
      // non-fatal: middleware will still try to look up profile
    }
  }

  useEffect(() => {
    let mounted = true;

    async function initAuth() {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) {
          console.warn('Auth session error, clearing stale credentials:', error.message);
          await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
          if (mounted) {
            setSession(null);
            setRole(null);
            setProfileId(null);
          }
        } else if (mounted) {
          const currentSession = data.session;
          setSession(currentSession);
          if (currentSession) {
            // Hanya app_metadata (diisi server); user_metadata bisa diubah pengguna sendiri.
            const r = (currentSession.user.app_metadata?.role ?? null) as 'admin' | 'customer' | null;
            setRole(r);
            setProfileId(currentSession.user.app_metadata?.profile_id ?? null);
            if (!r || !currentSession.user.app_metadata?.profile_id) {
              syncProfile(currentSession.access_token);
            }
          }
        }
      } catch (err: any) {
        console.warn('Auth init failed:', err?.message);
        await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
        if (mounted) {
          setSession(null);
          setRole(null);
          setProfileId(null);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    initAuth();

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (!mounted) return;
      setSession(newSession);
      if (newSession) {
        const r = (newSession.user.app_metadata?.role ?? null) as 'admin' | 'customer' | null;
        setRole(r);
        setProfileId(newSession.user.app_metadata?.profile_id ?? null);
        if (!newSession.user.app_metadata?.profile_id) {
          syncProfile(newSession.access_token);
        }
      } else {
        setRole(null);
        setProfileId(null);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return (
    <Ctx.Provider value={{ session, user: session?.user ?? null, role, profileId, loading }}>
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);
