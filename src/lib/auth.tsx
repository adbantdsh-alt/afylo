import type { Session } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { Platform } from 'react-native';

import { upsertTokens } from './accounts';
import { supabase } from './supabase';

/** URL de retour des emails (confirmation, reset) : domaine courant sur le web. */
export const redirectOrigin =
  Platform.OS === 'web' && typeof window !== 'undefined' ? window.location.origin : undefined;

type AuthState = {
  session: Session | null;
  guest: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string) => Promise<{ error: string | null; needsConfirm: boolean }>;
  signOut: () => Promise<void>;
  enterGuest: () => void;
};

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [guest, setGuest] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      void upsertTokens(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      void upsertTokens(s); // garde les jetons du compte actif à jour (multi-comptes)
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const signIn: AuthState['signIn'] = async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    return { error: error?.message ?? null };
  };

  const signUp: AuthState['signUp'] = async (email, password) => {
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { emailRedirectTo: redirectOrigin },
    });
    // Si la confirmation email est requise, il n'y a pas encore de session.
    return { error: error?.message ?? null, needsConfirm: !error && !data.session };
  };

  const signOut = async () => {
    setGuest(false);
    await supabase.auth.signOut();
  };

  const enterGuest = () => setGuest(true);

  return (
    <AuthContext.Provider value={{ session, guest, loading, signIn, signUp, signOut, enterGuest }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth doit être utilisé dans <AuthProvider>');
  return ctx;
}
