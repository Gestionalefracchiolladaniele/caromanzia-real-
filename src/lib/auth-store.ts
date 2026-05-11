import type { Session } from '@supabase/supabase-js';
import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';

import type { SubscriptionStatus, User, UserRole } from '@/types';
import { supabase } from './supabase';

interface AuthState {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  setSession: (session: Session | null) => void;
  setUser: (user: User | null) => void;
  setLoading: (v: boolean) => void;
  signOut: () => Promise<void>;
  hydrateAuth: () => Promise<void>;
  updateUser: (updates: Partial<User>) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  user: null,
  isLoading: true,

  setSession: (session) => set({ session }),
  setUser: (user) => set({ user }),
  setLoading: (v) => set({ isLoading: v }),

  signOut: async () => {
    await supabase.auth.signOut();
    set({ session: null, user: null });
  },

  hydrateAuth: async () => {
    set({ isLoading: true });
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      const { data: profile } = await supabase
        .from('users')
        .select('*')
        .eq('id', session.user.id)
        .single();
      set({ session, user: profile ?? null });
    }
    set({ isLoading: false });
  },

  updateUser: async (updates) => {
    const { session } = get();
    if (!session) throw new Error('Sessione non trovata');
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', session.user.id)
      .select()
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new Error('Profilo non trovato — ricarica e riprova');
    set({ user: data });
  },
}));

export const useAuth = () =>
  useAuthStore(
    useShallow((s) => ({
      session: s.session,
      user: s.user,
      isLoading: s.isLoading,
      signOut: s.signOut,
    })),
  );

export const useAuthActions = () =>
  useAuthStore(
    useShallow((s) => ({
      setSession: s.setSession,
      setUser: s.setUser,
      hydrateAuth: s.hydrateAuth,
      updateUser: s.updateUser,
    })),
  );

export const useUserRole = (): UserRole | null =>
  useAuthStore((s) => s.user?.role ?? null);

export const useIsCartomante = (): boolean =>
  useAuthStore((s) => s.user?.role === 'cartomante');

export const useIsOnboarded = (): boolean =>
  useAuthStore((s) => s.user?.role_completed === true);

export const useSubscription = (): SubscriptionStatus =>
  useAuthStore((s) => s.user?.subscription_status ?? 'free');
