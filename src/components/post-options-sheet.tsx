import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { Afryko, Font, Radius, Type } from '@/constants/brand';

/**
 * Menu ⋯ d'une publication : partager, affiner l'algo (intéressé / pas intéressé),
 * enregistrer, signaler. Remplace l'ancien menu qui ne servait qu'à signaler.
 */
export function PostOptionsSheet({
  visible,
  saved,
  onClose,
  onShare,
  onInterested,
  onNotInterested,
  onSave,
  onReport,
}: {
  visible: boolean;
  saved: boolean;
  onClose: () => void;
  onShare: () => void;
  onInterested: () => void;
  onNotInterested: () => void;
  onSave: () => void;
  onReport: () => void;
}) {
  const act = (fn: () => void) => { onClose(); setTimeout(fn, 10); };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation?.()}>
          <View style={styles.grip} />

          {/* Affiner l'algo — mis en avant */}
          <View style={styles.algoRow}>
            <Pressable style={styles.algoBtn} onPress={() => act(onInterested)}>
              <View style={[styles.algoIcon, { backgroundColor: '#16A34A18' }]}><Ionicons name="thumbs-up" size={22} color="#16A34A" /></View>
              <Text style={styles.algoText}>Ça m'intéresse</Text>
              <Text style={styles.algoSub}>Plus de ce contenu</Text>
            </Pressable>
            <Pressable style={styles.algoBtn} onPress={() => act(onNotInterested)}>
              <View style={[styles.algoIcon, { backgroundColor: Afryko.surfaceAlt }]}><Ionicons name="thumbs-down" size={22} color={Afryko.textDim} /></View>
              <Text style={styles.algoText}>Pas intéressé</Text>
              <Text style={styles.algoSub}>Moins de ce contenu</Text>
            </Pressable>
          </View>

          <View style={styles.list}>
            <Row icon="share-social-outline" label="Partager" onPress={() => act(onShare)} />
            <Row icon={saved ? 'bookmark' : 'bookmark-outline'} label={saved ? 'Retirer des enregistrements' : 'Enregistrer'} onPress={() => act(onSave)} />
            <Row icon="flag-outline" label="Signaler" danger onPress={() => act(onReport)} last />
          </View>

          <Pressable style={styles.cancel} onPress={onClose}><Text style={styles.cancelText}>Annuler</Text></Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function Row({ icon, label, onPress, danger, last }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void; danger?: boolean; last?: boolean }) {
  return (
    <Pressable style={[styles.row, !last && styles.rowBorder]} onPress={onPress}>
      <Ionicons name={icon} size={22} color={danger ? Afryko.live : Afryko.text} />
      <Text style={[styles.rowText, danger && { color: Afryko.live }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: '#00000066', justifyContent: 'flex-end' },
  sheet: { backgroundColor: Afryko.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 16, paddingBottom: 28 },
  grip: { width: 40, height: 4, borderRadius: 2, backgroundColor: Afryko.border, alignSelf: 'center', marginBottom: 16 },

  algoRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  algoBtn: { flex: 1, alignItems: 'center', backgroundColor: Afryko.surface, borderWidth: 1, borderColor: Afryko.border, borderRadius: Radius.lg, paddingVertical: 16 },
  algoIcon: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  algoText: { ...Type.body, fontFamily: Font.bold, color: Afryko.text },
  algoSub: { ...Type.caption, color: Afryko.textDim, marginTop: 1 },

  list: { backgroundColor: Afryko.surface, borderWidth: 1, borderColor: Afryko.border, borderRadius: Radius.lg, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingVertical: 15 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: Afryko.bg },
  rowText: { ...Type.body, fontFamily: Font.semibold, color: Afryko.text },

  cancel: { alignItems: 'center', paddingVertical: 14, marginTop: 6 },
  cancelText: { ...Type.body, fontFamily: Font.semibold, color: Afryko.textDim },
});
