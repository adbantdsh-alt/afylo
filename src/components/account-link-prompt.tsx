import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { Afylo, Font, Radius } from '@/constants/brand';
import { evaluateNewAccount, keepOnlyAccount } from '@/lib/accounts';
import { useAuth } from '@/lib/auth';

/**
 * Message affiché quand un compte DIFFÉRENT vient de se connecter alors que d'autres
 * comptes sont déjà enregistrés sur l'appareil : propose de les garder liés dans le même
 * espace (pour basculer sans se reconnecter) ou de ne garder que le compte courant.
 */
export function AccountLinkPrompt() {
  const { session } = useAuth();
  const [ask, setAsk] = useState<{ uid: string; count: number } | null>(null);

  useEffect(() => {
    const uid = session?.user?.id;
    if (!uid) return;
    let alive = true;
    evaluateNewAccount(uid).then((n) => { if (alive && n > 0) setAsk({ uid, count: n }); }).catch(() => {});
    return () => { alive = false; };
  }, [session?.user?.id]);

  if (!ask) return null;
  const s = ask.count > 1 ? 's' : '';
  const keepLinked = () => setAsk(null);
  const keepOnly = async () => { await keepOnlyAccount(ask.uid); setAsk(null); };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={keepLinked}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.icon}><Ionicons name="people" size={26} color={Afylo.violet} /></View>
          <Text style={styles.title}>Lier tes comptes ?</Text>
          <Text style={styles.body}>
            Tu as {ask.count} autre{s} compte{s} enregistré{s} sur cet appareil. Les garder dans ton
            espace pour basculer de l'un à l'autre sans te reconnecter ?
          </Text>
          <Pressable onPress={keepLinked} style={styles.primary}><Text style={styles.primaryText}>Garder mes comptes liés</Text></Pressable>
          <Pressable onPress={keepOnly} style={styles.secondary}><Text style={styles.secondaryText}>Garder seulement ce compte</Text></Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: '#000000aa', alignItems: 'center', justifyContent: 'center', padding: 28 },
  card: { width: '100%', maxWidth: 380, backgroundColor: Afylo.bg, borderRadius: 22, padding: 22, alignItems: 'center', gap: 10 },
  icon: { width: 60, height: 60, borderRadius: 30, backgroundColor: Afylo.violet + '1A', alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  title: { color: Afylo.text, fontFamily: Font.bold, fontSize: 19 },
  body: { color: Afylo.textDim, fontSize: 14, lineHeight: 20, textAlign: 'center', marginBottom: 6 },
  primary: { width: '100%', height: 50, borderRadius: Radius.pill, backgroundColor: Afylo.violet, alignItems: 'center', justifyContent: 'center' },
  primaryText: { color: '#fff', fontFamily: Font.bold, fontSize: 15 },
  secondary: { width: '100%', height: 46, alignItems: 'center', justifyContent: 'center' },
  secondaryText: { color: Afylo.textDim, fontFamily: Font.semibold, fontSize: 14 },
});
