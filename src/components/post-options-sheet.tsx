import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { Afylo, Font, Radius, Type } from '@/constants/brand';

/**
 * Menu ⋯ d'une publication : partager, affiner l'algo (intéressé / pas intéressé),
 * enregistrer, signaler. Remplace l'ancien menu qui ne servait qu'à signaler.
 */
export function PostOptionsSheet({
  visible,
  saved,
  isOwner,
  onClose,
  onShare,
  onInterested,
  onNotInterested,
  onSave,
  onReport,
  onBlock,
  onEdit,
  onDelete,
  onPromote,
}: {
  visible: boolean;
  saved: boolean;
  isOwner?: boolean; // accès propriétaire (auteur du post) ≠ accès viewer
  onClose: () => void;
  onShare: () => void;
  onInterested: () => void;
  onNotInterested: () => void;
  onSave: () => void;
  onReport: () => void;
  onBlock?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onPromote?: () => void;
}) {
  const act = (fn?: () => void) => { onClose(); if (fn) setTimeout(fn, 10); };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation?.()}>
          <View style={styles.grip} />

          {isOwner ? (
            // ---- Accès PROPRIÉTAIRE (auteur du post) ----
            <View style={styles.list}>
              <Row icon="rocket-outline" label="Promouvoir" promote onPress={() => act(onPromote)} />
              <Row icon="create-outline" label="Modifier" onPress={() => act(onEdit)} />
              <Row icon="share-social-outline" label="Partager" onPress={() => act(onShare)} />
              <Row icon={saved ? 'bookmark' : 'bookmark-outline'} label={saved ? 'Retirer des enregistrements' : 'Enregistrer'} onPress={() => act(onSave)} />
              <Row icon="trash-outline" label="Supprimer" danger onPress={() => act(onDelete)} last />
            </View>
          ) : (
            // ---- Accès VIEWER ----
            <>
              <View style={styles.algoRow}>
                <Pressable style={styles.algoBtn} onPress={() => act(onInterested)}>
                  <View style={[styles.algoIcon, { backgroundColor: '#16A34A18' }]}><Ionicons name="thumbs-up" size={22} color="#16A34A" /></View>
                  <Text style={styles.algoText}>Ça m'intéresse</Text>
                  <Text style={styles.algoSub}>Plus de ce contenu</Text>
                </Pressable>
                <Pressable style={styles.algoBtn} onPress={() => act(onNotInterested)}>
                  <View style={[styles.algoIcon, { backgroundColor: Afylo.surfaceAlt }]}><Ionicons name="thumbs-down" size={22} color={Afylo.textDim} /></View>
                  <Text style={styles.algoText}>Pas intéressé</Text>
                  <Text style={styles.algoSub}>Moins de ce contenu</Text>
                </Pressable>
              </View>

              <View style={styles.list}>
                <Row icon="share-social-outline" label="Partager" onPress={() => act(onShare)} />
                <Row icon={saved ? 'bookmark' : 'bookmark-outline'} label={saved ? 'Retirer des enregistrements' : 'Enregistrer'} onPress={() => act(onSave)} />
                <Row icon="ban-outline" label="Bloquer" danger onPress={() => act(onBlock)} />
                <Row icon="flag-outline" label="Signaler" danger onPress={() => act(onReport)} last />
              </View>
            </>
          )}

          <Pressable style={styles.cancel} onPress={onClose}><Text style={styles.cancelText}>Annuler</Text></Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function Row({ icon, label, onPress, danger, promote, last }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void; danger?: boolean; promote?: boolean; last?: boolean }) {
  const color = danger ? Afylo.live : promote ? Afylo.violet : Afylo.text;
  return (
    <Pressable style={[styles.row, !last && styles.rowBorder]} onPress={onPress}>
      <Ionicons name={icon} size={22} color={color} />
      <Text style={[styles.rowText, { color }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: '#00000066', justifyContent: 'flex-end' },
  sheet: { backgroundColor: Afylo.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 16, paddingBottom: 28 },
  grip: { width: 40, height: 4, borderRadius: 2, backgroundColor: Afylo.border, alignSelf: 'center', marginBottom: 16 },

  algoRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  algoBtn: { flex: 1, alignItems: 'center', backgroundColor: Afylo.surface, borderWidth: 1, borderColor: Afylo.border, borderRadius: Radius.lg, paddingVertical: 16 },
  algoIcon: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  algoText: { ...Type.body, fontFamily: Font.bold, color: Afylo.text },
  algoSub: { ...Type.caption, color: Afylo.textDim, marginTop: 1 },

  list: { backgroundColor: Afylo.surface, borderWidth: 1, borderColor: Afylo.border, borderRadius: Radius.lg, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingVertical: 15 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: Afylo.bg },
  rowText: { ...Type.body, fontFamily: Font.semibold, color: Afylo.text },

  cancel: { alignItems: 'center', paddingVertical: 14, marginTop: 6 },
  cancelText: { ...Type.body, fontFamily: Font.semibold, color: Afylo.textDim },
});
