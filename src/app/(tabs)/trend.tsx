import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useVideoPlayer, VideoView } from 'expo-video';

import { Avatar } from '@/components/ui-kit';
import { BuzzBadge } from '@/components/buzz-badge';
import { PaymentSheet } from '@/components/payment-sheet';
import { RateSheet } from '@/components/rate-sheet';
import { RatingStar } from '@/components/rating-star';
import { ReportSheet } from '@/components/report-sheet';
import { Afryko, Font, Radius, Type } from '@/constants/brand';
import { NICHES, rankPosts } from '@/lib/algo';
import { useAuthGate } from '@/lib/auth-gate';
import { avatar, face, type Post, posts as basePosts, video } from '@/lib/mock';
import { useHideOnScroll } from '@/lib/tabbar';

// Quelques vidéos verticales supplémentaires pour le défilement
const reels: Post[] = [
  ...basePosts,
  {
    id: 'r4',
    name: 'Sokhna Live',
    handle: '@sokhna.crea',
    avatar: avatar(20),
    badge: 'créateur',
    time: 'en direct',
    image: face('afryko-reel4', 700, 1300),
    likes: '15k',
    comments: '890',
    views: '210k',
    shares: '412',
    caption: 'Danse challenge du moment 💃 #afryko #dakar',
    product: { title: 'T-shirt Afryko édition limitée', price: '8 000 FCFA', commission: '25%' },
  },
  {
    id: 'r5',
    name: 'Cheikh Tech',
    handle: '@cheikh.tech',
    avatar: avatar(33),
    time: 'il y a 1 j',
    image: face('afryko-reel5', 700, 1300),
    likes: '6.4k',
    comments: '120',
    views: '58k',
    shares: '77',
    caption: 'Test du nouveau ring light 📸 lien en boutique',
    product: { title: 'Ring light pro', price: '15 000 FCFA', commission: '10%' },
  },
];

// Chaque vidéo reçoit une niche (pour l'algo + le Trend de niche)
const NICHE_MAP = ['Mode', 'Beauté', 'Musique', 'Danse', 'Tech'];
const REELS: (Post & { niche: string })[] = reels.map((r, i) => ({ ...r, niche: NICHE_MAP[i] ?? NICHES[i % NICHES.length] }));
const FOLLOWING = ['@fatou.style', '@awa.beauty']; // créateurs suivis (démo)

type TabKey = 'abonnements' | 'trend' | 'buzz';

// Score de buzz d'un contenu (les commentaires pèsent le plus) — "1,2k" -> 1200
const pc = (s?: string) => { if (!s) return 0; const n = parseFloat(s.replace(',', '.')); return /m/i.test(s) ? n * 1e6 : /k/i.test(s) ? n * 1e3 : n || 0; };
const buzzScore = (p: Post) => pc(p.comments) * 4 + pc(p.likes) * 2 + pc(p.views) * 0.05;

export default function Trend() {
  const { height, width } = useWindowDimensions();
  const scroll = useHideOnScroll();
  const [tab, setTab] = useState<TabKey>('trend');
  const [active, setActive] = useState(0);
  const [notInterested, setNotInterested] = useState<string[]>([]);

  const TABS = [
    { key: 'abonnements' as TabKey, label: 'Abonnements' },
    { key: 'trend' as TabKey, label: 'Trend' },
    { key: 'buzz' as TabKey, label: '🔥 Buzz' },
  ];

  const shown = useMemo(() => {
    if (tab === 'abonnements') return rankPosts(REELS, { following: FOLLOWING, notInterested }).filter((p) => FOLLOWING.includes(p.handle));
    // Buzz : ce qui buzze réellement — classé par engagement (commentaires/likes/vues)
    if (tab === 'buzz') return REELS.filter((p) => !notInterested.includes(p.id)).sort((a, b) => buzzScore(b) - buzzScore(a));
    return rankPosts(REELS, { notInterested }); // Trend général (algo viralité)
  }, [tab, notInterested]);

  const notInterestedIn = (id: string) => setNotInterested((prev) => [...prev, id]);

  return (
    <View style={styles.root}>
      <ScrollView
        key={tab}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        snapToInterval={height}
        decelerationRate="fast"
        onMomentumScrollEnd={(e) => setActive(Math.round(e.nativeEvent.contentOffset.y / height))}
        {...scroll}>
        {shown.map((r, i) => (
          <Reel key={r.id} post={r} index={i} active={i === active} height={height} width={width} showBuzz={tab === 'buzz' && i === 0} onNotInterested={() => notInterestedIn(r.id)} />
        ))}
        {shown.length === 0 && (
          <View style={{ height, width, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30 }}>
            <Text style={styles.empty}>{tab === 'abonnements' ? 'Suis des créateurs pour voir leurs vidéos ici.' : "Rien ici pour l'instant."}</Text>
          </View>
        )}
      </ScrollView>

      {/* Bandeau Buzz : le contenu n°1 du moment */}
      {tab === 'buzz' && shown.length > 0 && (
        <SafeAreaView edges={['top']} style={styles.buzzBanner} pointerEvents="box-none">
          <View style={styles.buzzChip}>
            <Ionicons name="flame" size={13} color="#fff" />
            <Text style={styles.buzzChipText}>Ça buzze en ce moment</Text>
          </View>
        </SafeAreaView>
      )}

      {/* En-tête flottant */}
      <SafeAreaView edges={['top']} style={styles.headerWrap} pointerEvents="box-none">
        <View style={styles.header}>
          {TABS.map((t) => (
            <Pressable key={t.key} onPress={() => setTab(t.key)} hitSlop={8}>
              <Text style={[styles.tab, tab === t.key && styles.tabActive]}>{t.label}</Text>
            </Pressable>
          ))}
        </View>
      </SafeAreaView>
    </View>
  );
}

function Reel({ post, index, active, height, width, showBuzz, onNotInterested }: { post: Post; index: number; active: boolean; height: number; width: number; showBuzz?: boolean; onNotInterested: () => void }) {
  const router = useRouter();
  const gate = useAuthGate();

  const player = useVideoPlayer(video(index), (p) => {
    p.loop = true;
    p.muted = true;
  });
  useEffect(() => {
    if (active) player.play();
    else player.pause();
  }, [active, player]);
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [reposted, setReposted] = useState(false);
  const [rating, setRating] = useState(0);
  const [reaction, setReaction] = useState<string | null>(null);
  const [rateOpen, setRateOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [speed, setSpeed] = useState(1);
  const lastTap = useRef(0);

  const changeSpeed = (s: number) => { setSpeed(s); try { player.playbackRate = s; } catch {} };
  const onTap = () => { const now = Date.now(); if (now - lastTap.current < 300 && gate('aimer')) setLiked(true); lastTap.current = now; };

  const like = () => { if (gate('aimer')) setLiked((v) => !v); };
  const save = () => { if (gate('enregistrer')) setSaved((v) => !v); };
  const share = () => { if (gate('republier')) setReposted((v) => !v); };
  const rate = () => { if (gate('noter')) setRateOpen(true); };
  const buy = () => { if (gate('acheter')) setPayOpen(true); };
  const openComments = () => router.push({ pathname: '/comments/[id]', params: { id: post.id, image: post.image } });

  return (
    <View style={{ height, width, backgroundColor: '#000' }}>
      <Image source={{ uri: post.image }} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} />
      <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="cover" nativeControls={false} />
      <LinearGradient colors={['#00000000', '#00000000', '#000000CC']} style={StyleSheet.absoluteFill} />
      <Pressable style={StyleSheet.absoluteFill} onPress={onTap} onLongPress={() => setOptionsOpen(true)} delayLongPress={250} />
      {speed !== 1 && <View style={styles.speedTag}><Text style={styles.speedTagText}>{speed}×</Text></View>}

      {/* Rail d'actions à droite */}
      <View style={styles.rail}>
        <View style={{ marginBottom: 6 }}>
          <Avatar uri={post.avatar} size={48} ring />
        </View>
        <Action
          node={reaction ? <Text style={{ fontSize: 30 }}>{reaction}</Text> : <RatingStar fill={rating > 0 ? rating / 10 : liked ? 1 : 0} size={32} color={Afryko.violet2} empty="#fff" />}
          label={rating > 0 ? `${rating}/10` : liked ? 'Aimé' : 'Noter'}
          color={rating > 0 || liked ? Afryko.violet2 : '#fff'}
          onPress={like}
          onLongPress={rate}
        />
        <Action icon="chatbubble-ellipses" label={post.comments} onPress={openComments} />
        <Action icon={saved ? 'bookmark' : 'bookmark-outline'} label="Enreg." color={saved ? Afryko.gold : '#fff'} onPress={save} />
        <Action icon="arrow-redo" label={reposted ? 'Republié' : post.shares} color={reposted ? Afryko.green : '#fff'} onPress={share} />
      </View>

      {/* Infos en bas */}
      <SafeAreaView edges={['bottom']} style={styles.bottom} pointerEvents="box-none">
        <View style={styles.infoRow}>
          <Text style={styles.name}>{post.name}</Text>
          {showBuzz && <BuzzBadge />}
          {post.time === 'en direct' && (
            <View style={styles.liveTag}>
              <View style={styles.dot} />
              <Text style={styles.liveTagText}>LIVE</Text>
            </View>
          )}
        </View>
        <Text style={styles.caption} numberOfLines={2}>{post.caption}</Text>

        {post.product && (
          <View style={styles.buyBar}>
            <Ionicons name="bag-handle" size={18} color="#fff" />
            <Text style={styles.buyTitle} numberOfLines={1}>{post.product.title}</Text>
            <Text style={styles.buyPrice}>{post.product.price}</Text>
            <Pressable style={styles.buyCta} onPress={buy}>
              <Text style={styles.buyCtaText}>Acheter</Text>
            </Pressable>
          </View>
        )}
      </SafeAreaView>

      <RateSheet
        visible={rateOpen}
        rating={rating}
        reaction={reaction}
        onRate={setRating}
        onReact={(e) => setReaction((r) => (r === e ? null : e))}
        onClose={() => setRateOpen(false)}
      />
      <PaymentSheet
        visible={payOpen}
        items={post.products ?? (post.product ? [{ title: post.product.title, price: post.product.price }] : [])}
        onClose={() => setPayOpen(false)}
      />

      {/* Menu d'options (appui long) */}
      <Modal visible={optionsOpen} transparent animationType="slide" onRequestClose={() => setOptionsOpen(false)}>
        <Pressable style={styles.optOverlay} onPress={() => setOptionsOpen(false)}>
          <View style={styles.optSheet}>
            <View style={styles.optGrip} />
            <View style={styles.optGrid}>
              <OptItem icon="download-outline" label="Télécharger" onPress={() => setOptionsOpen(false)} />
              <OptItem icon="heart-dislike-outline" label="Pas intéressé" onPress={() => { onNotInterested(); setOptionsOpen(false); }} />
              <OptItem icon="flag-outline" label="Signaler" onPress={() => { setOptionsOpen(false); setReportOpen(true); }} />
              <OptItem icon="storefront-outline" label="La boutique" onPress={() => { setOptionsOpen(false); router.push({ pathname: '/creator/[id]', params: { id: post.handle, name: post.name, avatar: post.avatar } }); }} />
            </View>

            <View style={styles.optRow}>
              <Ionicons name="speedometer-outline" size={20} color={Afryko.text} />
              <Text style={styles.optRowLabel}>Vitesse</Text>
              <View style={styles.speedChips}>
                {[0.5, 1, 1.5, 2].map((s) => (
                  <Pressable key={s} onPress={() => changeSpeed(s)} style={[styles.speedChip, speed === s && styles.speedChipOn]}>
                    <Text style={[styles.speedChipText, speed === s && { color: '#fff' }]}>{s}×</Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <Pressable style={styles.optLine} onPress={() => { player.muted = !player.muted; }}>
              <Ionicons name="headset-outline" size={20} color={Afryko.text} />
              <Text style={styles.optLineText}>Son en arrière-plan</Text>
            </Pressable>
            <Pressable style={styles.optLine} onPress={() => setOptionsOpen(false)}>
              <Ionicons name="musical-notes-outline" size={20} color={Afryko.text} />
              <Text style={styles.optLineText}>Lien avec la publication</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      <ReportSheet visible={reportOpen} onClose={() => setReportOpen(false)} />
    </View>
  );
}

function OptItem({ icon, label, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void }) {
  return (
    <Pressable style={styles.optItem} onPress={onPress}>
      <View style={styles.optIcon}><Ionicons name={icon} size={24} color={Afryko.text} /></View>
      <Text style={styles.optItemText}>{label}</Text>
    </Pressable>
  );
}

function Action({ icon, node, label, color = '#fff', onPress, onLongPress }: { icon?: keyof typeof Ionicons.glyphMap; node?: React.ReactNode; label: string; color?: string; onPress?: () => void; onLongPress?: () => void }) {
  return (
    <Pressable style={styles.action} onPress={onPress} onLongPress={onLongPress} delayLongPress={260} hitSlop={6}>
      {node ?? <Ionicons name={icon!} size={32} color={color} />}
      <Text style={styles.actionLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  headerWrap: { position: 'absolute', top: 0, left: 0, right: 0 },
  header: { flexDirection: 'row', justifyContent: 'center', gap: 18, paddingTop: 6 },
  tab: { color: '#ffffff99', fontSize: 15, fontWeight: '600' },
  tabActive: { color: '#fff', fontWeight: '800', textShadowColor: '#000', textShadowRadius: 8 },
  empty: { color: '#ffffffaa', fontSize: 15, fontFamily: Font.medium },
  nicheTitle: { color: '#fff', fontFamily: Font.bold, fontSize: 20, marginTop: 12, textAlign: 'center' },
  nicheSub: { color: '#ffffffbb', fontSize: 14, marginTop: 6, textAlign: 'center', lineHeight: 20 },
  nicheGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10, marginTop: 20 },
  nicheChip: { backgroundColor: '#ffffff1A', borderWidth: 1, borderColor: '#ffffff44', paddingHorizontal: 18, paddingVertical: 11, borderRadius: Radius.pill },
  nicheChipText: { color: '#fff', fontFamily: Font.semibold, fontSize: 14 },
  nicheActiveWrap: { position: 'absolute', top: 44, left: 0, right: 0, alignItems: 'center' },
  nicheActive: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Afryko.violet, paddingHorizontal: 14, paddingVertical: 7, borderRadius: Radius.pill },
  nicheActiveText: { color: '#fff', fontFamily: Font.bold, fontSize: 13 },
  buzzBanner: { position: 'absolute', top: 44, left: 0, right: 0, alignItems: 'center' },
  buzzChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FF2D55', paddingHorizontal: 14, paddingVertical: 7, borderRadius: Radius.pill },
  buzzChipText: { color: '#fff', fontFamily: Font.bold, fontSize: 13 },
  speedTag: { position: 'absolute', top: 90, alignSelf: 'center', backgroundColor: '#000000AA', paddingHorizontal: 10, paddingVertical: 3, borderRadius: Radius.pill },
  speedTagText: { color: '#fff', fontFamily: Font.bold, fontSize: 12 },

  optOverlay: { flex: 1, backgroundColor: '#00000066', justifyContent: 'flex-end' },
  optSheet: { backgroundColor: Afryko.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 16, paddingBottom: 30 },
  optGrip: { width: 40, height: 4, borderRadius: 2, backgroundColor: Afryko.border, alignSelf: 'center', marginBottom: 14 },
  optGrid: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 8 },
  optItem: { alignItems: 'center', gap: 6, width: 74 },
  optIcon: { width: 54, height: 54, borderRadius: 27, backgroundColor: Afryko.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  optItemText: { ...Type.caption, color: Afryko.text, textAlign: 'center' },
  optRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, borderTopWidth: 1, borderTopColor: Afryko.border, marginTop: 8 },
  optRowLabel: { ...Type.body, color: Afryko.text, flex: 1 },
  speedChips: { flexDirection: 'row', gap: 6, backgroundColor: Afryko.surfaceAlt, borderRadius: Radius.pill, padding: 3 },
  speedChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.pill },
  speedChipOn: { backgroundColor: Afryko.violet },
  speedChipText: { ...Type.small, fontFamily: Font.semibold, color: Afryko.text },
  optLine: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, borderTopWidth: 1, borderTopColor: Afryko.border },
  optLineText: { ...Type.body, color: Afryko.text },

  rail: { position: 'absolute', right: 12, bottom: 160, alignItems: 'center', gap: 20 },
  action: { alignItems: 'center', gap: 3 },
  actionLabel: { color: '#fff', fontSize: 12, fontWeight: '700' },

  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingBottom: 90 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  name: { color: '#fff', fontSize: 17, fontWeight: '800' },
  liveTag: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Afryko.live, paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.pill },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#fff' },
  liveTagText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  caption: { color: '#fff', fontSize: 14, lineHeight: 20, width: '78%' },
  buyBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ffffff22',
    borderWidth: 1,
    borderColor: '#ffffff44',
    borderRadius: Radius.pill,
    paddingLeft: 12,
    paddingRight: 6,
    paddingVertical: 6,
    marginTop: 12,
    width: '82%',
  },
  buyTitle: { color: '#fff', fontSize: 13, fontWeight: '700', flex: 1 },
  buyPrice: { color: Afryko.gold, fontSize: 13, fontWeight: '800' },
  buyCta: { backgroundColor: Afryko.violet, paddingHorizontal: 14, paddingVertical: 8, borderRadius: Radius.pill },
  buyCtaText: { color: '#fff', fontSize: 13, fontWeight: '800' },
});
