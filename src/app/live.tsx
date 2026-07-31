import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/ui-kit';
import { GiftSheet } from '@/components/gift-sheet';
import { PaymentSheet } from '@/components/payment-sheet';
import { Afylo, Font, Radius } from '@/constants/brand';
import { avatar, video } from '@/lib/mock';

const LIVE_PRODUCTS = [
  { title: 'Ensemble wax premium', price: '18 500 FCFA' },
  { title: 'Foulard assorti', price: '6 500 FCFA' },
  { title: 'Sac raphia', price: '14 000 FCFA' },
];

const CHATTERS = ['Awa', 'Modou', 'Sokhna', 'Cheikh', 'Mariama', 'Ibou', 'Aïda', 'Serigne'];
const MSGS = [
  'Trop belle 😍', 'Ça coûte combien ?', 'Livraison à Thiès ?', '🔥🔥🔥', 'J\'achète !', 'Bravo 👏',
  'Tu as d\'autres couleurs ?', 'Première fois ici 🙌', 'Salut de Dakar', 'Le lien du produit ?', 'Magnifique',
];

let cid = 0;
export default function Live() {
  const router = useRouter();
  const params = useLocalSearchParams<{ role?: string; name?: string; avatar?: string }>();
  const isHost = params.role !== 'viewer';
  const name = params.name || (isHost ? 'Ton live' : 'Fatou Ndiaye');
  const hostAvatar = params.avatar || avatar(5);

  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<'front' | 'back'>('front');
  const [comments, setComments] = useState<{ id: string; name: string; avatar: string; text: string; gift?: boolean }[]>([]);
  const [text, setText] = useState('');
  const [viewers, setViewers] = useState(128);
  const [hearts, setHearts] = useState<{ id: number }[]>([]);
  const [followed, setFollowed] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [giftOpen, setGiftOpen] = useState(false);

  const onGiftSent = (amount: number) => {
    setComments((prev) => [...prev.slice(-30), { id: `g${cid++}`, name: 'Toi', avatar: avatar(12), text: `a offert ${amount.toLocaleString('fr-FR')} FCFA 🎁`, gift: true }]);
    sendHeart();
  };
  const share = async () => { try { await Share.share({ message: `${name} est en direct sur Afylo — rejoins le live !` }); } catch {} };

  const viewerPlayer = useVideoPlayer(video(3), (p) => { p.loop = true; p.muted = true; if (!isHost) p.play(); });

  // Flux de commentaires + cadeaux + spectateurs (démo)
  useEffect(() => {
    const GIFTS = [500, 1000, 2000, 5000];
    const t = setInterval(() => {
      const nm = CHATTERS[Math.floor((Date.now() / 1000) % CHATTERS.length)];
      const isGift = Math.round(Date.now() / 1000) % 4 === 0;
      setComments((prev) => [
        ...prev.slice(-30),
        isGift
          ? { id: `c${cid++}`, name: nm, avatar: avatar(9 + (cid % 40)), text: `a offert ${GIFTS[cid % GIFTS.length].toLocaleString('fr-FR')} FCFA 🎁`, gift: true }
          : { id: `c${cid++}`, name: nm, avatar: avatar(9 + (cid % 40)), text: MSGS[cid % MSGS.length] },
      ]);
      setViewers((v) => v + (Math.round(Date.now() / 1000) % 3) - 1);
    }, 2200);
    return () => clearInterval(t);
  }, []);

  const sendHeart = () => setHearts((h) => [...h.slice(-14), { id: cid++ }]);
  const send = () => {
    if (!text.trim()) return;
    setComments((prev) => [...prev.slice(-30), { id: `c${cid++}`, name: 'Toi', avatar: avatar(12), text: text.trim() }]);
    setText('');
  };

  return (
    <View style={styles.root}>
      {/* Fond : caméra (hôte) ou vidéo (spectateur) */}
      {isHost ? (
        permission?.granted ? (
          <CameraView key={facing} style={StyleSheet.absoluteFill} facing={facing} />
        ) : (
          <View style={[StyleSheet.absoluteFill, styles.permWrap]}>
            <Ionicons name="videocam" size={40} color="#fff" />
            <Text style={styles.permText}>Active la caméra pour passer en live</Text>
            <Pressable onPress={requestPermission} style={styles.permBtn}><Text style={styles.permBtnText}>Autoriser la caméra</Text></Pressable>
          </View>
        )
      ) : (
        <VideoView player={viewerPlayer} style={StyleSheet.absoluteFill} contentFit="cover" nativeControls={false} />
      )}

      <SafeAreaView style={{ flex: 1 }} pointerEvents="box-none">
        {/* En-tête */}
        <View style={styles.top}>
          <View style={styles.hostPill}>
            <Avatar uri={hostAvatar} size={30} />
            <Text style={styles.hostName} numberOfLines={1}>{name}</Text>
            {!isHost && (
              <Pressable onPress={() => setFollowed((v) => !v)} style={[styles.followBtn, followed && { backgroundColor: '#ffffff33' }]}>
                <Text style={styles.followText}>{followed ? '✓' : '+'}</Text>
              </Pressable>
            )}
          </View>
          <View style={styles.liveBadge}><View style={styles.liveDot} /><Text style={styles.liveText}>EN DIRECT</Text></View>
          <View style={styles.viewers}><Ionicons name="eye" size={13} color="#fff" /><Text style={styles.viewersText}>{Math.max(1, viewers)}</Text></View>
          <Pressable onPress={share} style={styles.topIcon}><Ionicons name="share-social" size={18} color="#fff" /></Pressable>
          <Pressable onPress={() => router.back()} style={styles.close}><Ionicons name="close" size={24} color="#fff" /></Pressable>
        </View>

        <View style={{ flex: 1 }} />

        {/* Commentaires */}
        <View style={styles.commentsWrap} pointerEvents="box-none">
          {comments.slice(-6).map((c) => (
            <View key={c.id} style={styles.comment}>
              <Avatar uri={c.avatar} size={26} />
              <View style={[styles.commentBubble, c.gift && styles.giftBubble]}>
                <Text style={[styles.commentName, c.gift && { color: '#fff' }]}>{c.name}</Text>
                <Text style={[styles.commentText, c.gift && styles.giftText]}>{c.text}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Barre du bas */}
        <View style={styles.bottom}>
          {!isHost ? (
            <View style={styles.inputBar}>
              <TextInput style={styles.input} value={text} onChangeText={setText} placeholder="Ajoute un commentaire…" placeholderTextColor="#ffffff99" onSubmitEditing={send} />
            </View>
          ) : (
            <Pressable onPress={() => setFacing((f) => (f === 'front' ? 'back' : 'front'))} style={styles.hostTool}>
              <Ionicons name="camera-reverse-outline" size={24} color="#fff" />
            </Pressable>
          )}

          {/* Produit à vendre / acheter */}
          <Pressable onPress={() => setPayOpen(true)} style={styles.sellBtn}>
            <Ionicons name="bag-handle" size={18} color="#fff" />
            <Text style={styles.sellText}>{isHost ? 'Vendre' : `Acheter (${LIVE_PRODUCTS.length})`}</Text>
          </Pressable>

          {/* Cadeau (argent réel) */}
          {!isHost && (
            <Pressable onPress={() => setGiftOpen(true)} style={styles.giftBtn}>
              <Ionicons name="gift" size={24} color={Afylo.gold} />
            </Pressable>
          )}

          <Pressable onPress={sendHeart} style={styles.heartBtn}>
            <Ionicons name="heart" size={26} color={Afylo.live} />
          </Pressable>
        </View>
      </SafeAreaView>

      {/* Cœurs flottants */}
      <View style={styles.heartsLayer} pointerEvents="none">
        {hearts.map((h) => <FloatingHeart key={h.id} onDone={() => setHearts((prev) => prev.filter((x) => x.id !== h.id))} />)}
      </View>

      <PaymentSheet visible={payOpen} items={LIVE_PRODUCTS} onClose={() => setPayOpen(false)} />
      <GiftSheet visible={giftOpen} host={name} onClose={() => setGiftOpen(false)} onSent={onGiftSent} />
    </View>
  );
}

function FloatingHeart({ onDone }: { onDone: () => void }) {
  const y = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const x = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(y, { toValue: -260, duration: 2200, useNativeDriver: true }),
      Animated.timing(x, { toValue: (cid % 2 ? 1 : -1) * 30, duration: 2200, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0, duration: 2200, useNativeDriver: true }),
    ]).start(onDone);
  }, []);
  return (
    <Animated.View style={{ position: 'absolute', bottom: 90, right: 24, opacity, transform: [{ translateY: y }, { translateX: x }] }}>
      <Ionicons name="heart" size={26} color={Afylo.live} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  permWrap: { alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: '#111' },
  permText: { color: '#fff', fontFamily: Font.semibold, fontSize: 15 },
  permBtn: { backgroundColor: Afylo.violet, paddingHorizontal: 18, paddingVertical: 10, borderRadius: Radius.pill },
  permBtnText: { color: '#fff', fontFamily: Font.semibold },

  top: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingTop: 8 },
  hostPill: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#00000055', borderRadius: Radius.pill, paddingLeft: 4, paddingRight: 10, paddingVertical: 4, maxWidth: 190 },
  hostName: { color: '#fff', fontFamily: Font.semibold, fontSize: 13, flexShrink: 1 },
  followBtn: { backgroundColor: Afylo.violet, width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  followText: { color: '#fff', fontFamily: Font.bold, fontSize: 13 },
  liveBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: Afylo.live, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#fff' },
  liveText: { color: '#fff', fontFamily: Font.bold, fontSize: 10 },
  viewers: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#00000055', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  viewersText: { color: '#fff', fontFamily: Font.semibold, fontSize: 12 },
  topIcon: { marginLeft: 'auto', width: 34, height: 34, borderRadius: 17, backgroundColor: '#00000055', alignItems: 'center', justifyContent: 'center' },
  close: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#00000055', alignItems: 'center', justifyContent: 'center' },

  commentsWrap: { paddingHorizontal: 12, gap: 8, marginBottom: 8, maxWidth: '80%' },
  comment: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  commentBubble: { backgroundColor: '#00000055', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6 },
  commentName: { color: '#ffffffcc', fontFamily: Font.semibold, fontSize: 11 },
  commentText: { color: '#fff', fontSize: 14 },
  giftBubble: { backgroundColor: '#B8791Fee', borderWidth: 1, borderColor: '#FFD98A' },
  giftText: { color: '#fff', fontFamily: Font.bold },

  bottom: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingBottom: 8 },
  inputBar: { flex: 1, backgroundColor: '#00000055', borderRadius: Radius.pill, borderWidth: 1, borderColor: '#ffffff44', paddingHorizontal: 16, height: 44, justifyContent: 'center' },
  input: { color: '#fff', fontSize: 15 },
  hostTool: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#00000055', alignItems: 'center', justifyContent: 'center' },
  sellBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Afylo.violet, paddingHorizontal: 16, height: 44, borderRadius: Radius.pill, marginLeft: 'auto' },
  sellText: { color: '#fff', fontFamily: Font.semibold, fontSize: 14 },
  giftBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#00000055', alignItems: 'center', justifyContent: 'center' },
  heartBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#00000055', alignItems: 'center', justifyContent: 'center' },

  heartsLayer: { position: 'absolute', right: 0, bottom: 0, width: 100, height: 400 },
});
