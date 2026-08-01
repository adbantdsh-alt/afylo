import { useRef } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { Afylo, Font, Radius, Type } from '@/constants/brand';

export const REACTIONS = ['🔥', '❤️', '😍', '👏', '😂', '😮'];

function now(): number { try { return Date.now(); } catch { return 0; } }

/**
 * Feuille compacte : réaction emoji (1 ligne) + note /10 (1 ligne).
 * Fermeture : soit réaction ET note choisies, soit double-tap pour valider une seule des deux.
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
  const last = useRef<{ k: string; t: number }>({ k: '', t: 0 });

  const pickReaction = (e: string) => {
    const t = now();
    const dbl = last.current.k === `r:${e}` && t - last.current.t < 320;
    last.current = { k: `r:${e}`, t };
    if (dbl) { onClose(); return; }        // double-tap = valider la réaction seule
    onReact(e);                            // 1er tap : sélectionne
    if (rating > 0) onClose();             // réaction + note choisies → ferme
  };
  const pickRating = (n: number) => {
    const t = now();
    const dbl = last.current.k === `n:${n}` && t - last.current.t < 320;
    last.current = { k: `n:${n}`, t };
    if (dbl) { onClose(); return; }        // double-tap = valider la note seule
    onRate(n);                             // 1er tap : sélectionne
    if (reaction) onClose();               // réaction + note choisies → ferme
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.handle} />

          {/* Réactions rapides */}
          <View style={styles.reactRow}>
            {REACTIONS.map((e) => (
              <Pressable key={e} onPress={() => pickReaction(e)} style={[styles.emojiBtn, reaction === e && styles.emojiActive]}>
                <Text style={styles.emoji}>{e}</Text>
              </Pressable>
            ))}
          </View>

          {/* Note /10 sur une seule ligne */}
          <View style={styles.scaleHead}>
            <Text style={styles.scaleLabel}>Note sur 10</Text>
            {rating > 0 && (
              <Pressable onPress={() => onRate(0)} hitSlop={8}><Text style={styles.reset}>Retirer</Text></Pressable>
            )}
          </View>
          <View style={styles.scale}>
            {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => {
              const active = n <= rating;
              return (
                <Pressable key={n} onPress={() => pickRating(n)} style={[styles.num, active && styles.numActive]}>
                  <Text style={[styles.numText, active && styles.numTextActive]}>{n}</Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.hint}>Choisis une réaction <Text style={{ fontFamily: Font.semibold }}>et</Text> une note, ou double-tape pour n'en valider qu'une.</Text>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: '#00000066', justifyContent: 'flex-end' },
  sheet: { backgroundColor: Afylo.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 26 },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: Afylo.border, alignSelf: 'center', marginBottom: 14 },

  reactRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 18 },
  emojiBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: Afylo.surface, borderWidth: 1, borderColor: Afylo.border, alignItems: 'center', justifyContent: 'center' },
  emojiActive: { backgroundColor: '#3E5BFF22', borderColor: Afylo.violet },
  emoji: { fontSize: 24 },

  scaleHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, paddingHorizontal: 2 },
  scaleLabel: { ...Type.small, color: Afylo.textDim, fontFamily: Font.semibold },
  reset: { ...Type.small, color: Afylo.violet, fontFamily: Font.semibold },
  scale: { flexDirection: 'row', justifyContent: 'space-between' },
  num: { flex: 1, aspectRatio: 1, marginHorizontal: 2, borderRadius: 10, backgroundColor: Afylo.surface, borderWidth: 1, borderColor: Afylo.border, alignItems: 'center', justifyContent: 'center' },
  numActive: { backgroundColor: Afylo.violet, borderColor: Afylo.violet },
  numText: { fontFamily: Font.semibold, color: Afylo.text, fontSize: 14 },
  numTextActive: { color: '#fff' },
  hint: { ...Type.caption, color: Afylo.textFaint, textAlign: 'center', marginTop: 16, lineHeight: 16 },
});
