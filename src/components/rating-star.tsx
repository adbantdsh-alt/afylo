import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

import { Afylo } from '@/constants/brand';

/**
 * Étoile remplie proportionnellement (0 → 1) avec un pop d'animation à chaque changement.
 * fill = note/10 : 0.1 remplit un peu, 1 remplit entièrement.
 */
export function RatingStar({
  fill,
  size = 19,
  color = Afylo.violet,
  empty = Afylo.inkDim,
}: {
  fill: number;
  size?: number;
  color?: string;
  empty?: string;
}) {
  const f = Math.max(0, Math.min(1, fill));
  const scale = useRef(new Animated.Value(1)).current;
  const first = useRef(true);

  useEffect(() => {
    if (first.current) { first.current = false; return; }
    scale.setValue(f > 0 ? 0.5 : 1.35);
    Animated.spring(scale, { toValue: 1, friction: 4, tension: 160, useNativeDriver: true }).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [f]);

  let star;
  if (f <= 0) star = <Ionicons name="star-outline" size={size} color={empty} />;
  else if (f >= 1) star = <Ionicons name="star" size={size} color={color} />;
  else
    star = (
      <View style={{ width: size, height: size }}>
        <Ionicons name="star" size={size} color={empty} style={StyleSheet.absoluteFill} />
        <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: size * f, overflow: 'hidden' }}>
          <Ionicons name="star" size={size} color={color} />
        </View>
      </View>
    );

  return <Animated.View style={{ transform: [{ scale }] }}>{star}</Animated.View>;
}
