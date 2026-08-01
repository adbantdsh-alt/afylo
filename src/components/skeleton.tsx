/**
 * Chargements « squelette » (façon Facebook/X) — remplacent les spinners.
 * Un bloc gris qui pulse doucement pendant le chargement du contenu réel.
 */
import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, type DimensionValue, type ViewStyle } from 'react-native';

import { Afryko } from '@/constants/brand';

export function Skeleton({ w, h, radius = 10, style }: { w?: DimensionValue; h?: DimensionValue; radius?: number; style?: ViewStyle }) {
  const op = useRef(new Animated.Value(0.45)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(op, { toValue: 1, duration: 750, useNativeDriver: true }),
        Animated.timing(op, { toValue: 0.45, duration: 750, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [op]);
  return <Animated.View style={[{ width: w, height: h, borderRadius: radius, backgroundColor: Afryko.surfaceAlt, opacity: op }, style]} />;
}

export function SkeletonCircle({ size }: { size: number }) {
  return <Skeleton w={size} h={size} radius={size / 2} />;
}

/** Squelette d'une carte de post (accueil). */
export function PostCardSkeleton() {
  return (
    <View style={styles.post}>
      <View style={styles.postHead}>
        <SkeletonCircle size={42} />
        <View style={{ gap: 6 }}>
          <Skeleton w={130} h={13} radius={6} />
          <Skeleton w={90} h={11} radius={6} />
        </View>
      </View>
      <Skeleton w="100%" h={320} radius={0} />
      <View style={{ padding: 14, gap: 8 }}>
        <Skeleton w="70%" h={13} radius={6} />
        <Skeleton w="45%" h={13} radius={6} />
      </View>
    </View>
  );
}

/** Plusieurs cartes de post empilées. */
export function FeedSkeleton({ count = 3 }: { count?: number }) {
  return (
    <View>
      {Array.from({ length: count }).map((_, i) => (
        <PostCardSkeleton key={i} />
      ))}
    </View>
  );
}

/** Grille de vignettes (boutique, produits). */
export function GridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <View style={styles.grid}>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={styles.gridCell}>
          <Skeleton w="100%" h={130} radius={12} />
          <Skeleton w="80%" h={12} radius={6} style={{ marginTop: 8 }} />
          <Skeleton w="50%" h={12} radius={6} style={{ marginTop: 6 }} />
        </View>
      ))}
    </View>
  );
}

/** Squelette générique de « cartes » empilées (portefeuille, listes). */
export function CardsSkeleton({ count = 3, height = 78 }: { count?: number; height?: number }) {
  return (
    <View style={{ gap: 12 }}>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} w="100%" h={height} radius={16} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  post: { marginBottom: 10 },
  postHead: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  gridCell: { width: '46%', flexGrow: 1 },
});
