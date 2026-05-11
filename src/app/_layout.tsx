import '../global.css';

import * as SplashScreen from 'expo-splash-screen';
import { router, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { useAuthStore } from '@/lib/auth-store';
import { supabase } from '@/lib/supabase';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const setSession = useAuthStore((s) => s.setSession);
  const setUser = useAuthStore((s) => s.setUser);
  const setLoading = useAuthStore((s) => s.setLoading);
  const isLoading = useAuthStore((s) => s.isLoading);
  const didInit = useRef(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'INITIAL_SESSION' && didInit.current) return;
      if (event === 'INITIAL_SESSION') didInit.current = true;

      setSession(session);

      if (!session) {
        setUser(null);
        setLoading(false);
        router.replace('/');
        return;
      }

      // Usa maybeSingle: non crasha se 0 righe
      const { data: profile } = await supabase
        .from('users')
        .select('*')
        .eq('id', session.user.id)
        .maybeSingle();

      if (profile) {
        setUser(profile);
        setLoading(false);
        router.replace(profile.role_completed ? '/(tabs)/impostazioni' : '/onboarding');
        return;
      }

      // Riga non esiste: creala
      const meta = session.user.user_metadata ?? {};
      const { data: created, error } = await supabase
        .from('users')
        .insert({
          id: session.user.id,
          email: session.user.email ?? '',
          name: meta.full_name ?? meta.name ?? session.user.email?.split('@')[0] ?? '',
          avatar_url: meta.avatar_url ?? null,
        })
        .select()
        .maybeSingle();

      // Se 409 conflict, rileggi (la riga esiste ma RLS non la vedeva)
      if (error?.code === '23505') {
        const { data: retry } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .maybeSingle();
        setUser(retry ?? null);
        setLoading(false);
        router.replace(retry?.role_completed ? '/(tabs)/impostazioni' : '/onboarding');
        return;
      }

      setUser(created ?? null);
      setLoading(false);
      router.replace('/onboarding');
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!isLoading) {
      SplashScreen.hideAsync();
    }
  }, [isLoading]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="(tabs)" />
      </Stack>
    </GestureHandlerRootView>
  );
}
