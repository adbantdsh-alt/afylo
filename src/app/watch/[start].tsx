import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PaymentSheet } from '@/components/payment-sheet';
import { Afylo, Font, Radius } from '@/constants/brand';
import { useAuthGate } from '@/lib/auth-gate';
import { exploreItems, type ExploreItem, video } from '@/lib/mock';

// Fil « Découvrir » : images + vidéos mélangées (ordre = algo, partagé avec la grille)
const FEED = exploreItems;

export default function Watch() {
  const router = useRouter();
  const { height, width } = useWindowDimensions();
  const { start } = useLocalSearchParams<{ start?: string }>();
  const startIdx = Math.min(Math.max(parseInt(start ?? '0', 10) || 0, 0), FEED.length - 1);
  const [active, setActive] = useState(startIdx);

  return (
    <View style={styles.root}>
      <ScrollView
        pagingEnabled
        showsVerticalScrollIndicator={false}
        snapToInterval={height}
        decelerationRate="fast"
        contentOffset={{ x: 0, y: startIdx * height }}
        onMomentumScrollEnd={(e) => setActive(Math.round(e.nativeEvent.contentOffset.y / height))}>
        {FEED.map((it, i) => (
          <Slide key={it.id} item={it} index={i} active={i === active} height={height} width={width} />
        ))}
      </ScrollView>

      <SafeAreaView edges={['top']} style={styles.topBar} pointerEvents="box-none">
        <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/accueil'))} style={styles.close}>
          <Ionicons name="chevron-back" size={26} color="#fff" />
        </Pressable>
        <Text style={styles.topTitle}>Découvrir</Text>
        <View style={{ width: 40 }} />
      </SafeAreaView>
    </View>
  );
}

function Slide({ item, index, active, height, width }: { item: ExploreItem; index: number; active: boolean; height: number; width: number }) {
  const router = useRouter();
  const gate = useAuthGate();
  const isVideo = index % 2 === 1; // image/vidéo mélangés
  const player = useVideoPlayer(video(index), (p) => { p.loop = true; p.muted = true; });
  useEffect(() => {
    if (!isVideo) return;
    if (active) player.play(); else player.pause();
  }, [active, isVideo, player]);

  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const like = () => { if (gate('aimer')) setLiked((v) => !v); };
  const buy = () => { if (gate('acheter')) setPayOpen(true); };

  const openProfile = () => router.push({ pathname: '/creator/[id]', params: { id: item.name, name: item.name, avatar: item.image } });

  return (
    <View style={{ height, width, backgroundColor: '#000' }}>
      {isVideo ? (
        <>
          <Image source={{ uri: item.image }} style={StyleSheet.absoluteFill} contentFit="cover" />
          <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="cover" nativeControls={false} />
        </>
      ) : (
        <Image source={{ uri: item.image }} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} />
      )}
      <LinearGradient colors={['#00000055', '#00000000', '#00000000', '#000000CC']} style={StyleSheet.absoluteFill} />

      {/* Rail d'actions */}
      <View style={styles.rail}>
        <Act icon={liked ? 'heart' : 'heart-outline'} color={liked ? Afylo.live : '#fff'} label="12,4k" onPress={like} />
        <Act icon="chatbubble-ellipses" label="340" onPress={() => router.push({ pathname: '/comments/[id]', params: { id: item.id } })} />
        <Act icon={saved ? 'bookmark' : 'bookmark-outline'} color={saved ? Afylo.gold : '#fff'} label="Enreg." onPress={() => setSaved((v) => !v)} />
        <Act icon="arrow-redo" label="88" />
      </View>

      {/* Infos */}
      <SafeAreaView edges={['bottom']} style={styles.bottom} pointerEvents="box-none">
        <Pressable onPress={openProfile} style={styles.creatorRow}>
          <Image source={{ uri: item.image }} style={styles.creatorAvatar} contentFit="cover" />
          <Text style={styles.creatorName}>{item.name}</Text>
          {item.live && <View style={styles.liveTag}><Text style={styles.liveText}>LIVE</Text></View>}
        </Pressable>
        <Text style={styles.caption}>{item.label} · {isVideo ? 'vidéo' : 'photo'} recommandée pour toi</Text>

        {item.product && (
          <Pressable onPress={buy} style={styles.buyBar}>
            <Ionicons name="bag-handle" size={18} color="#fff" />
            <Text style={styles.buyTitle} numberOfLines={1}>{item.product.title}</Text>
            <Text style={styles.buyPrice}>{item.product.price}</Text>
            <View style={styles.buyCta}><Text style={styles.buyCtaText}>Acheter</Text></View>
          </Pressable>
        )}
      </SafeAreaView>

      <PaymentSheet visible={payOpen} items={item.product ? [item.product] : []} onClose={() => setPayOpen(false)} />
    </View>
  );
}

function Act({ icon, label, color = '#fff', onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; color?: string; onPress?: () => void }) {
  return (
    <Pressable style={styles.act} onPress={onPress} hitSlop={6}>
      <Ionicons name={icon} size={32} color={color} />
      <Text style={styles.actLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  topBar: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 10, paddingTop: 6 },
  close: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  topTitle: { color: '#fff', fontFamily: Font.bold, fontSize: 17, textShadowColor: '#000', textShadowRadius: 6 },

  rail: { position: 'absolute', right: 12, bottom: 150, alignItems: 'center', gap: 20 },
  act: { alignItems: 'center', gap: 3 },
  actLabel: { color: '#fff', fontSize: 12, fontFamily: Font.semibold },

  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingBottom: 24 },
  creatorRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  creatorAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#333', borderWidth: 1.5, borderColor: '#fff' },
  creatorName: { color: '#fff', fontFamily: Font.bold, fontSize: 15 },
  liveTag: { backgroundColor: Afylo.live, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  liveText: { color: '#fff', fontFamily: Font.bold, fontSize: 10 },
  caption: { color: '#fff', fontSize: 14, width: '80%' },
  buyBar: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#ffffff26', borderWidth: 1, borderColor: '#ffffff44', borderRadius: Radius.pill, paddingLeft: 12, paddingRight: 6, paddingVertical: 6, marginTop: 12, width: '86%' },
  buyTitle: { color: '#fff', fontFamily: Font.semibold, fontSize: 13, flex: 1 },
  buyPrice: { color: Afylo.gold, fontFamily: Font.bold, fontSize: 13 },
  buyCta: { backgroundColor: Afylo.violet, paddingHorizontal: 16, paddingVertical: 8, borderRadius: Radius.pill },
  buyCtaText: { color: '#fff', fontFamily: Font.semibold, fontSize: 13 },
});

