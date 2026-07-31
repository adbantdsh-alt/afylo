import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';

import { Afylo, Radius, Type } from '@/constants/brand';

/** Avatar circulaire avec anneau (rouge si en live). */
export function Avatar({
  uri,
  size = 56,
  ring,
  live,
}: {
  uri: string;
  size?: number;
  ring?: boolean;
  live?: boolean;
}) {
  const border = 2.5;
  const inner = size - border * 2 - 2;
  if (ring || live) {
    return (
      <LinearGradient
        colors={live ? [Afylo.live, '#FF4E6A'] : [Afylo.violet, Afylo.violet2]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ width: size, height: size, borderRadius: size / 2, padding: border, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ backgroundColor: Afylo.bg, borderRadius: size / 2, padding: 1.5 }}>
          <Image source={{ uri }} style={{ width: inner, height: inner, borderRadius: inner / 2 }} contentFit="cover" transition={200} />
        </View>
      </LinearGradient>
    );
  }
  return <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2 }} contentFit="cover" transition={200} />;
}

/** Bouton pilule principal (dégradé violet) ou secondaire. */
export function PillButton({
  label,
  onPress,
  variant = 'primary',
  icon,
  style,
  loading,
}: {
  label: string;
  onPress?: () => void;
  variant?: 'primary' | 'ghost' | 'light';
  icon?: keyof typeof Ionicons.glyphMap;
  style?: ViewStyle;
  loading?: boolean;
}) {
  const content = (
    <View style={styles.pillRow}>
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? '#fff' : Afylo.violet} />
      ) : (
        <>
          {icon && <Ionicons name={icon} size={18} color={variant === 'primary' ? '#fff' : Afylo.ink} />}
          <Text style={[styles.pillText, variant !== 'primary' && { color: Afylo.ink }]}>{label}</Text>
        </>
      )}
    </View>
  );

  if (variant === 'primary') {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1 }, style]}>
        <LinearGradient colors={[Afylo.violet, Afylo.violet2]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.pill}>
          {content}
        </LinearGradient>
      </Pressable>
    );
  }
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.pill,
        variant === 'ghost' ? styles.pillGhost : styles.pillLight,
        { opacity: pressed ? 0.85 : 1 },
        style,
      ]}>
      {content}
    </Pressable>
  );
}

/** Petit badge (créateur / boutique / live). */
export function Badge({ label, color = Afylo.violet }: { label: string; color?: string }) {
  return (
    <View style={[styles.badge, { backgroundColor: color + '22', borderColor: color + '55' }]}>
      <Text style={[styles.badgeText, { color }]}>{label}</Text>
    </View>
  );
}

/** Bouton icône rond. */
export function IconButton({
  name,
  onPress,
  size = 20,
  bg = Afylo.surfaceAlt,
  color = Afylo.text,
}: {
  name: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
  size?: number;
  bg?: string;
  color?: string;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.iconBtn, { backgroundColor: bg, opacity: pressed ? 0.7 : 1 }]}>
      <Ionicons name={name} size={size} color={color} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: { height: 54, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  pillGhost: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: Afylo.border },
  pillLight: { backgroundColor: '#fff' },
  pillRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pillText: { ...Type.button, color: '#fff' },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.pill, borderWidth: 1 },
  badgeText: { ...Type.badge },
  iconBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
});
