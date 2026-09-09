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
      // non-fatal — middleware will still try to look up profile
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        const r = (session.user.app_metadata?.role ??
          session.user.user_metadata?.role ??
          null) as 'admin' | 'customer' | null;
        setRole(r);
        setProfileId(session.user.user_metadata?.profile_id ?? null);
        if (!r || !session.user.user_metadata?.profile_id) {
          syncProfile(session.access_token);
        }
      }
      setLoading(false);
    });

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        const r = (session.user.app_metadata?.role ??
          session.user.user_metadata?.role ??
          null) as 'admin' | 'customer' | null;
        setRole(r);
        setProfileId(session.user.user_metadata?.profile_id ?? null);
        if (!session.user.user_metadata?.profile_id) {
          syncProfile(session.access_token);
        }
      } else {
        setRole(null);
        setProfileId(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <Ctx.Provider value={{ session, user: session?.user ?? null, role, profileId, loading }}>
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);
