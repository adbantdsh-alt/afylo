import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text } from 'react-native';

import { Font } from '@/constants/brand';

/**
 * Badge "BUZZ" — porté par le contenu le plus viral du moment (une seule
 * couronne à la fois). Dégradé chaud très visible, façon récompense.
 */
export function BuzzBadge({ size = 'md', label = 'BUZZ' }: { size?: 'sm' | 'md'; label?: string }) {
  const sm = size === 'sm';
  return (
    <LinearGradient
      colors={['#FF9500', '#FF2D55', '#AF52DE']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.badge, sm ? styles.sm : styles.md]}>
      <Ionicons name="flame" size={sm ? 11 : 13} color="#fff" />
      <Text style={[styles.text, { fontSize: sm ? 10 : 12 }]}>{label}</Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  badge: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  sm: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  md: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8 },
  text: { color: '#fff', fontFamily: Font.bold, letterSpacing: 0.5 },
});
