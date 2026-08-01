import { Ionicons } from '@expo/vector-icons';
import { useAudioPlayer } from 'expo-audio';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Afryko, Font, Radius, Type } from '@/constants/brand';
import { photo } from '@/lib/mock';
import { findSound } from '@/lib/sounds';

// Vidéos "utilisant ce son" (démo)
const usingGrid = Array.from({ length: 12 }, (_, i) => ({ id: `u${i}`, thumb: photo(`sound-use-${i}`, 300, 400), views: `${(i * 9 + 5)} k` }));

export default function SoundPage() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const sound = findSound(id);
  const [fav, setFav] = useState(false);
  const [saved, setSaved] = useState(false);
  const [playing, setPlaying] = useState(false);

  const s = sound ?? { id: 'x', title: 'Son', artist: 'Afryko', cover: photo('snd', 300, 300), duration: '0:30', uses: '12 k', audio: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' };
  const player = useAudioPlayer(s.audio);
  const togglePlay = () => {
    if (playing) { player.pause(); setPlaying(false); }
    else { player.play(); setPlaying(true); }
  };

  const share = async () => {
    try { await Share.share({ message: `Écoute "${s.title}" — ${s.artist} sur Afryko` }); } catch {}
  };
  const useSound = () => router.push({ pathname: '/post-new', params: { soundId: s.id, soundTitle: s.title } });

  return (
    <View style={styles.root}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: Afryko.navBg }}>
        <View style={styles.header}>
          <Ionicons name="chevron-back" size={26} color="#fff" onPress={() => (router.canGoBack() ? router.back() : router.replace('/accueil'))} />
          <Text style={styles.headerTitle} numberOfLines={1}>{s.title}</Text>
          <Ionicons name="share-social-outline" size={22} color="#fff" onPress={share} />
        </View>

        {/* En-tête son */}
        <View style={styles.hero}>
          <Pressable onPress={togglePlay} style={styles.coverWrap}>
            <Image source={{ uri: s.cover }} style={styles.cover} contentFit="cover" />
            <View style={styles.playOverlay}>
              <Ionicons name={playing ? 'pause' : 'play'} size={26} color="#fff" />
            </View>
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.title} numberOfLines={2}>{s.title}</Text>
            <Text style={styles.artist}>{s.artist}</Text>
            <View style={styles.metaRow}>
              <Ionicons name="musical-notes" size={14} color="#fff" />
              <Text style={styles.meta}>{s.duration} · {s.uses} publications</Text>
            </View>
          </View>
        </View>

        <View style={styles.actions}>
          <Action icon={fav ? 'heart' : 'heart-outline'} label="Favori" color={fav ? Afryko.live : '#fff'} onPress={() => setFav((v) => !v)} />
          <Action icon={saved ? 'bookmark' : 'bookmark-outline'} label="Enregistrer" color={saved ? Afryko.gold : '#fff'} onPress={() => setSaved((v) => !v)} />
          <Action icon="share-social-outline" label="Partager" onPress={share} />
        </View>
      </SafeAreaView>

      <ScrollView contentContainerStyle={{ paddingBottom: 90 }} showsVerticalScrollIndicator={false}>
        <Text style={styles.section}>Vidéos avec ce son</Text>
        <View style={styles.grid}>
          {usingGrid.map((u) => (
            <View key={u.id} style={styles.cell}>
              <Image source={{ uri: u.thumb }} style={StyleSheet.absoluteFill} contentFit="cover" />
              <View style={styles.cellViews}>
                <Ionicons name="play" size={11} color="#fff" />
                <Text style={styles.cellViewsText}>{u.views}</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Utiliser le son */}
      <SafeAreaView edges={['bottom']} style={styles.footer}>
        <Pressable onPress={useSound} style={styles.useBtn}>
          <Ionicons name="videocam" size={20} color="#fff" />
          <Text style={styles.useText}>Utiliser le son</Text>
        </Pressable>
      </SafeAreaView>
    </View>
  );
}

function Action({ icon, label, color = '#fff', onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; color?: string; onPress?: () => void }) {
  return (
    <Pressable style={styles.action} onPress={onPress}>
      <Ionicons name={icon} size={22} color={color} />
      <Text style={styles.actionLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Afryko.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 10 },
  headerTitle: { color: '#fff', fontFamily: Font.semibold, fontSize: 16, flex: 1, textAlign: 'center', marginHorizontal: 10 },
  hero: { flexDirection: 'row', gap: 14, paddingHorizontal: 16, paddingBottom: 16 },
  coverWrap: { width: 92, height: 92, borderRadius: 14, overflow: 'hidden' },
  cover: { width: 92, height: 92, borderRadius: 14, backgroundColor: '#222' },
  playOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', backgroundColor: '#00000044' },
  title: { color: '#fff', fontFamily: Font.bold, fontSize: 20, letterSpacing: -0.3 },
  artist: { color: '#ffffffcc', ...Type.small, marginTop: 4 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  meta: { color: '#ffffff99', ...Type.caption },
  actions: { flexDirection: 'row', justifyContent: 'space-around', paddingBottom: 16, paddingHorizontal: 30 },
  action: { alignItems: 'center', gap: 4 },
  actionLabel: { color: '#fff', ...Type.caption },

  section: { ...Type.body, fontFamily: Font.semibold, color: Afryko.text, padding: 16, paddingBottom: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 2, paddingHorizontal: 2 },
  cell: { width: '33%', aspectRatio: 0.75, backgroundColor: Afryko.surfaceAlt, flexGrow: 1 },
  cellViews: { position: 'absolute', bottom: 6, left: 6, flexDirection: 'row', alignItems: 'center', gap: 3 },
  cellViewsText: { color: '#fff', fontSize: 11, fontFamily: Font.semibold },

  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingTop: 8, backgroundColor: Afryko.bg, borderTopWidth: 1, borderTopColor: Afryko.border },
  useBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 52, borderRadius: Radius.pill, backgroundColor: Afryko.live },
  useText: { color: '#fff', fontFamily: Font.semibold, fontSize: 16 },
});
