import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useRef } from 'react';
import { Animated, PanResponder, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { Afylo, Font, Radius } from '@/constants/brand';
import { useLivePip } from '@/lib/live-pip';

/**
 * Mini-lecteur flottant (PiP) : quand on quitte un live, il reste visible et
 * déplaçable au-dessus de toute l'app. Un tap ramène au live, la croix le ferme.
 */
export function LivePipOverlay() {
  const { pip, closePip } = useLivePip();
  const router = useRouter();
  const { width, height } = useWindowDimensions();

  const pan = useRef(new Animated.ValueXY({ x: width - 128, y: height - 260 })).current;
  const responder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 4 || Math.abs(g.dy) > 4,
      onPanResponderGrant: () => {
        pan.setOffset({ x: (pan.x as any)._value, y: (pan.y as any)._value });
        pan.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], { useNativeDriver: false }),
      onPanResponderRelease: () => pan.flattenOffset(),
    }),
  ).current;

  if (!pip) return null;

  const back = () => {
    const p = pip;
    closePip();
    router.push({ pathname: '/live', params: { role: 'viewer', name: p.name, avatar: p.avatar, ...(p.liveId ? { liveId: p.liveId } : {}) } });
  };

  return (
    <Animated.View style={[styles.wrap, { transform: pan.getTranslateTransform() }]} {...responder.panHandlers}>
      <Pressable onPress={back} style={styles.card}>
        <Image source={{ uri: pip.avatar }} style={styles.thumb} contentFit="cover" />
        <View style={styles.overlay} pointerEvents="none">
          <View style={styles.badge}><View style={styles.dot} /><Text style={styles.live}>LIVE</Text></View>
          <Text style={styles.name} numberOfLines={1}>{pip.name}</Text>
        </View>
      </Pressable>
      <Pressable onPress={closePip} style={styles.close} hitSlop={8}>
        <Ionicons name="close" size={15} color="#fff" />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', width: 108, height: 152, zIndex: 9999 },
  card: { flex: 1, borderRadius: Radius.md, overflow: 'hidden', backgroundColor: '#000', borderWidth: 1.5, borderColor: '#ffffff33' },
  thumb: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'space-between', padding: 6 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', backgroundColor: Afylo.live, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5 },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#fff' },
  live: { color: '#fff', fontFamily: Font.bold, fontSize: 9 },
  name: { color: '#fff', fontFamily: Font.semibold, fontSize: 11, textShadowColor: '#000', textShadowRadius: 4 },
  close: { position: 'absolute', top: -8, right: -8, width: 24, height: 24, borderRadius: 12, backgroundColor: '#000000cc', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#ffffff44' },
});
