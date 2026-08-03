import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/ui-kit';
import { Afryko, Font, Radius } from '@/constants/brand';
import { listAccounts, removeAccount, switchAccount, type SavedAccount } from '@/lib/accounts';
import { useAuth } from '@/lib/auth';
import { face } from '@/lib/mock';

export function AccountSwitcher({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const router = useRouter();
  const { session } = useAuth();
  const [accounts, setAccounts] = useState<SavedAccount[]>([]);
  const [switching, setSwitching] = useState<string | null>(null);

  const load = () => listAccounts().then(setAccounts);
  useEffect(() => { if (visible) load(); }, [visible]);

  const currentId = session?.user?.id;

  const onSwitch = async (a: SavedAccount) => {
    if (a.id === currentId) { onClose(); return; }
    setSwitching(a.id);
    const ok = await switchAccount(a.id);
    setSwitching(null);
    if (ok) { onClose(); router.replace('/accueil'); }
    else {
      // Jeton expiré → il faut se reconnecter à ce compte.
      await removeAccount(a.id);
      onClose();
      router.push('/login');
    }
  };

  const onRemove = async (id: string) => { await removeAccount(id); load(); };

  const addAccount = () => { onClose(); router.push('/login'); };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <SafeAreaView edges={['bottom']}>
            <View style={styles.grip} />
            <Text style={styles.title}>Changer de compte</Text>

            <ScrollView style={{ maxHeight: 360 }}>
              {accounts.map((a) => {
                const active = a.id === currentId;
                return (
                  <Pressable key={a.id} onPress={() => onSwitch(a)} style={styles.row}>
                    <Avatar uri={a.avatar || face(a.handle || a.id)} size={44} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.name} numberOfLines={1}>{a.name || a.handle || 'Compte'}</Text>
                      {a.handle ? <Text style={styles.handle} numberOfLines={1}>@{a.handle}</Text> : null}
                    </View>
                    {switching === a.id ? (
                      <ActivityIndicator color={Afryko.violet} />
                    ) : active ? (
                      <Ionicons name="checkmark-circle" size={24} color={Afryko.violet} />
                    ) : (
                      <Pressable onPress={() => onRemove(a.id)} hitSlop={10}>
                        <Ionicons name="close" size={20} color={Afryko.textFaint} />
                      </Pressable>
                    )}
                  </Pressable>
                );
              })}
            </ScrollView>

            <Pressable onPress={addAccount} style={styles.addRow}>
              <View style={styles.addIcon}><Ionicons name="add" size={22} color={Afryko.violet} /></View>
              <Text style={styles.addText}>Ajouter un compte</Text>
            </Pressable>
          </SafeAreaView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: '#00000088', justifyContent: 'flex-end' },
  sheet: { backgroundColor: Afryko.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 16, paddingTop: 8 },
  grip: { width: 40, height: 4, borderRadius: 2, backgroundColor: Afryko.border, alignSelf: 'center', marginBottom: 12 },
  title: { color: Afryko.text, fontFamily: Font.bold, fontSize: 18, marginBottom: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  name: { color: Afryko.text, fontFamily: Font.semibold, fontSize: 15 },
  handle: { color: Afryko.textDim, fontSize: 13, marginTop: 1 },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Afryko.border, marginTop: 4 },
  addIcon: { width: 44, height: 44, borderRadius: 22, borderWidth: 1.5, borderColor: Afryko.violet, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
  addText: { color: Afryko.violet, fontFamily: Font.semibold, fontSize: 15 },
});
