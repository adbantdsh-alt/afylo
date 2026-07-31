import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { PillButton } from '@/components/ui-kit';
import { Afylo, Font, Radius, Type } from '@/constants/brand';
import { useAuth } from '@/lib/auth';

/**
 * Portail de connexion : un invité peut REGARDER (feed, lives, vidéos)
 * mais toute action (publier, vendre, suivre, aimer, acheter, message…)
 * ouvre une invitation douce à créer un compte.
 *
 * Usage : const gate = useAuthGate();  if (!gate('suivre')) return;
 */
const GateCtx = createContext<(reason?: string) => boolean>(() => true);

export function AuthGateProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const router = useRouter();
  const [reason, setReason] = useState<string | null>(null);

  const gate = useCallback(
    (r?: string) => {
      if (session) return true; // connecté → autorisé
      setReason(r ?? 'continuer');
      return false; // invité → on ouvre le portail
    },
    [session],
  );

  const go = (mode: 'signup' | 'login') => {
    setReason(null);
    router.push(mode === 'signup' ? '/login?mode=signup' : '/login');
  };

  return (
    <GateCtx.Provider value={gate}>
      {children}
      <Modal visible={!!reason} transparent animationType="slide" onRequestClose={() => setReason(null)}>
        <Pressable style={styles.backdrop} onPress={() => setReason(null)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.handle} />
            <LinearGradient colors={[Afylo.violet, Afylo.violet2]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.logo}>
              <Text style={styles.logoText}>A</Text>
            </LinearGradient>
            <Text style={styles.title}>Rejoins Afylo pour {reason}</Text>
            <Text style={styles.sub}>Crée ton compte gratuitement en quelques secondes et commence à créer, vendre et gagner.</Text>

            <PillButton label="Créer un compte" onPress={() => go('signup')} style={{ marginTop: 20 }} />
            <PillButton label="J'ai déjà un compte" variant="ghost" onPress={() => go('login')} style={{ marginTop: 12 }} />

            <Pressable onPress={() => setReason(null)} style={{ marginTop: 16 }}>
              <Text style={styles.later}>Plus tard</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </GateCtx.Provider>
  );
}

export const useAuthGate = () => useContext(GateCtx);

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: '#00000066', justifyContent: 'flex-end' },
  sheet: { backgroundColor: Afylo.bg, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 34, alignItems: 'center' },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: Afylo.border, marginBottom: 18 },
  logo: { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  logoText: { color: '#fff', fontFamily: Font.bold, fontSize: 28 },
  title: { ...Type.title, color: Afylo.text, textAlign: 'center', marginTop: 16 },
  sub: { ...Type.body, color: Afylo.textDim, textAlign: 'center', marginTop: 8 },
  later: { ...Type.small, color: Afylo.textDim },
});
