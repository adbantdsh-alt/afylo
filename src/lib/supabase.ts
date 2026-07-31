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
// La clé "publishable" (anon) et l'URL sont PUBLIQUES par design (protégées par RLS),
// donc on peut les mettre en valeurs par défaut : le site fonctionne en ligne
// sans config supplémentaire. (La clé SECRÈTE, elle, n'est jamais ici.)
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://uxtnmvyqwoklspffjbdn.supabase.co';
const supabaseAnonKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_Reuj2Wa4ffDJYyHmV_Y15g_CTqJpTLW';

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
