import { BlurView } from 'expo-blur';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { Afylo, Font, Radius, Type } from '@/constants/brand';

export const REACTIONS = ['🔥', '❤️', '😍', '👏', '😂', '😮'];

/**
 * Feuille de notation : note un contenu sur /10 (modifiable) + réaction emoji.
 * Idée « sang neuf » : au-delà du like, on note vraiment la qualité.
 */
export function RateSheet({
  visible,
  rating,
  reaction,
  onRate,
  onReact,
  onClose,
}: {
  visible: boolean;
  rating: number;
  reaction: string | null;
  onRate: (n: number) => void;
  onReact: (e: string) => void;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <BlurView intensity={30} tint="light" style={StyleSheet.absoluteFill} />
          <View style={styles.handle} />

          <Text style={styles.title}>Note ce contenu</Text>
          <Text style={styles.big}>
            {rating > 0 ? `${rating}` : '—'}
            <Text style={styles.big10}> /10</Text>
          </Text>

          {/* Échelle /10 */}
          <View style={styles.scale}>
            {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => {
              const active = n <= rating;
              return (
                <Pressable key={n} onPress={() => onRate(n)} style={[styles.num, active && styles.numActive]}>
                  <Text style={[styles.numText, active && styles.numTextActive]}>{n}</Text>
                </Pressable>
              );
            })}
          </View>
          {rating > 0 && (
            <Pressable onPress={() => onRate(0)}>
              <Text style={styles.reset}>Retirer ma note</Text>
            </Pressable>
          )}

          <View style={styles.divider} />

          <Text style={styles.reactTitle}>Ou réagis</Text>
          <View style={styles.reactRow}>
            {REACTIONS.map((e) => (
              <Pressable key={e} onPress={() => onReact(e)} style={[styles.emojiBtn, reaction === e && styles.emojiActive]}>
                <Text style={styles.emoji}>{e}</Text>
              </Pressable>
            ))}
          </View>

          <Pressable onPress={onClose} style={styles.done}>
            <Text style={styles.doneText}>Terminé</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: '#00000066', justifyContent: 'flex-end' },
  sheet: { backgroundColor: Afylo.glass, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 22, paddingBottom: 30, alignItems: 'center', overflow: 'hidden' },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: Afylo.border, marginBottom: 14 },
  title: { ...Type.subtitle, color: Afylo.text },
  big: { ...Type.title, fontSize: 44, color: Afylo.violet, marginTop: 6 },
  big10: { fontSize: 20, color: Afylo.textDim, fontFamily: Font.semibold },

  scale: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 14 },
  num: { width: 40, height: 40, borderRadius: 12, backgroundColor: Afylo.surface, borderWidth: 1, borderColor: Afylo.border, alignItems: 'center', justifyContent: 'center' },
  numActive: { backgroundColor: Afylo.violet, borderColor: Afylo.violet },
  numText: { ...Type.body, fontFamily: Font.semibold, color: Afylo.text },
  numTextActive: { color: '#fff' },
  reset: { ...Type.small, color: Afylo.textDim, marginTop: 12 },

  divider: { height: 1, alignSelf: 'stretch', backgroundColor: Afylo.border, marginVertical: 18 },
  reactTitle: { ...Type.small, color: Afylo.textDim, fontFamily: Font.semibold },
  reactRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  emojiBtn: { width: 46, height: 46, borderRadius: 23, backgroundColor: Afylo.surface, borderWidth: 1, borderColor: Afylo.border, alignItems: 'center', justifyContent: 'center' },
  emojiActive: { backgroundColor: '#3E5BFF22', borderColor: Afylo.violet },
  emoji: { fontSize: 24 },

  done: { alignSelf: 'stretch', height: 50, borderRadius: Radius.pill, backgroundColor: Afylo.violet, alignItems: 'center', justifyContent: 'center', marginTop: 22 },
  doneText: { color: '#fff', fontFamily: Font.semibold, fontSize: 16 },
});
