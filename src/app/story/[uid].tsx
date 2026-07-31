import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/ui-kit';
import { Afylo, Font, Type } from '@/constants/brand';
import { useStories } from '@/lib/stories';

const ITEM_MS = 5000;

export default function StoryViewer() {
  const router = useRouter();
  const { uid } = useLocalSearchParams<{ uid: string }>();
  const { stories, markSeen } = useStories();

  const startIdx = Math.max(0, stories.findIndex((s) => s.id === uid));
  const [sIdx, setSIdx] = useState(startIdx);
  const [iIdx, setIIdx] = useState(0);
  const [progress, setProgress] = useState(0);
  const timer = useRef<any>(null);

  const story = stories[sIdx];

  // Barre de progression + avance auto
  useEffect(() => {
    if (!story) return;
    markSeen(story.id);
    setProgress(0);
    const startedFrames = 60; // ~ steps
    let p = 0;
    timer.current = setInterval(() => {
      p += 1 / startedFrames;
      setProgress(p);
      if (p >= 1) next();
    }, ITEM_MS / startedFrames);
    return () => clearInterval(timer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sIdx, iIdx]);

  if (!story) {
    router.back();
    return null;
  }

  const close = () => router.back();

  const next = () => {
    clearInterval(timer.current);
    if (iIdx < story.items.length - 1) {
      setIIdx((v) => v + 1);
    } else if (sIdx < stories.length - 1) {
      setSIdx((v) => v + 1);
      setIIdx(0);
    } else {
      close();
    }
  };

  const prev = () => {
    clearInterval(timer.current);
    if (iIdx > 0) setIIdx((v) => v - 1);
    else if (sIdx > 0) {
      const ps = stories[sIdx - 1];
      setSIdx((v) => v - 1);
      setIIdx(ps.items.length - 1);
    } else setProgress(0);
  };

  const item = story.items[iIdx];

  return (
    <View style={styles.root}>
      <Image source={{ uri: item.uri }} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} />
      <LinearGradient colors={['#000000AA', '#00000000', '#00000000', '#000000AA']} style={StyleSheet.absoluteFill} />

      {/* Zones de tap */}
      <Pressable style={styles.tapLeft} onPress={prev} />
      <Pressable style={styles.tapRight} onPress={next} />

      <SafeAreaView edges={['top']} pointerEvents="box-none">
        {/* Barres de progression */}
        <View style={styles.bars}>
          {story.items.map((_, i) => (
            <View key={i} style={styles.barTrack}>
              <View style={[styles.barFill, { width: `${i < iIdx ? 100 : i === iIdx ? progress * 100 : 0}%` }]} />
            </View>
          ))}
        </View>

        {/* En-tête */}
        <View style={styles.header}>
          <Avatar uri={story.avatar} size={36} />
          <Text style={styles.name}>{story.name}</Text>
          {story.live && (
            <View style={styles.liveTag}>
              <Text style={styles.liveText}>LIVE</Text>
            </View>
          )}
          <View style={{ flex: 1 }} />
          <Pressable onPress={close} hitSlop={12}>
            <Ionicons name="close" size={28} color="#fff" />
          </Pressable>
        </View>
      </SafeAreaView>

      {/* Réponse rapide */}
      <SafeAreaView edges={['bottom']} style={styles.replyWrap} pointerEvents="box-none">
        <View style={styles.replyBox}>
          <Text style={styles.replyPlaceholder}>Répondre à {story.name}…</Text>
        </View>
        <Ionicons name="heart-outline" size={26} color="#fff" />
        <Ionicons name="paper-plane-outline" size={24} color="#fff" />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  tapLeft: { position: 'absolute', left: 0, top: 80, bottom: 80, width: '35%', zIndex: 5 },
  tapRight: { position: 'absolute', right: 0, top: 80, bottom: 80, width: '35%', zIndex: 5 },

  bars: { flexDirection: 'row', gap: 4, paddingHorizontal: 10, paddingTop: 8 },
  barTrack: { flex: 1, height: 3, borderRadius: 2, backgroundColor: '#ffffff44', overflow: 'hidden' },
  barFill: { height: '100%', backgroundColor: '#fff', borderRadius: 2 },

  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingTop: 12 },
  name: { color: '#fff', fontFamily: Font.semibold, fontSize: 15 },
  liveTag: { backgroundColor: Afylo.live, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  liveText: { color: '#fff', fontFamily: Font.bold, fontSize: 10 },

  replyWrap: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 14, paddingBottom: 8, zIndex: 6 },
  replyBox: { flex: 1, height: 44, borderRadius: 22, borderWidth: 1.5, borderColor: '#ffffff88', justifyContent: 'center', paddingHorizontal: 18 },
  replyPlaceholder: { color: '#ffffffcc', ...Type.body, fontSize: 15 },
});
