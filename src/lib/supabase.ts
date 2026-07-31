import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import 'react-native-url-polyfill/auto';

/**
 * Client Supabase — utilise UNIQUEMENT la clé publishable (anon).
 * ⚠️ Ne jamais mettre la clé SECRÈTE ici : ce code tourne côté client
 * (mobile + web), donc tout ce qui s'y trouve est public.
 * La clé secrète servira plus tard côté serveur (Edge Functions).
 *
 * Les valeurs viennent de .env (préfixe EXPO_PUBLIC_ requis par Expo).
 */
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    '[Afylo] Supabase non configuré : renseigne EXPO_PUBLIC_SUPABASE_URL et EXPO_PUBLIC_SUPABASE_ANON_KEY dans .env',
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Persistance de session : AsyncStorage sur mobile, localStorage sur web.
    storage: Platform.OS === 'web' ? undefined : AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web',
  },
});

export const isSupabaseConfigured = () => Boolean(supabaseUrl && supabaseAnonKey);
