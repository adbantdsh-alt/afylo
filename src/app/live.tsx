import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEffect, useRef, useState } from 'react';
import { Animated, Modal, Pressable, ScrollView, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/ui-kit';
import { GiftSheet } from '@/components/gift-sheet';
import { PaymentSheet } from '@/components/payment-sheet';
import { Afylo, Font, Radius } from '@/constants/brand';
import { affiliationProducts, avatar, myProducts, photo, video } from '@/lib/mock';

type SellProduct = { id: string; title: string; price: string; image: string; tag: string };
type Comment = { id: string; name: string; avatar: string; text: string; gift?: boolean };

// Produits disponibles pour le vendeur : les siens + ceux en affiliation
const AVAILABLE: SellProduct[] = [
  ...myProducts.map((p) => ({ id: `m-${p.id}`, title: p.title, price: `${p.price} FCFA`, image: p.image, tag: 'Ma boutique' })),
  ...affiliationProducts.slice(0, 6).map((p) => ({ id: `a-${p.id}`, title: p.title, price: `${p.price.toLocaleString('fr-FR')} FCFA`, image: p.image, tag: `Affiliation ${p.commission}%` })),
];

const CHATTERS = ['Awa', 'Modou', 'Sokhna', 'Cheikh', 'Mariama', 'Ibou', 'Aïda', 'Serigne'];
const MSGS = ['Trop belle 😍', 'Ça coûte combien ?', 'Livraison à Thiès ?', '🔥🔥🔥', "J'achète !", 'Bravo 👏', "Tu as d'autres couleurs ?", 'Première fois ici 🙌', 'Salut de Dakar', 'Le lien du produit ?', 'Magnifique'];
const GIFTS = [500, 1000, 2000, 5000];
let cid = 0;

export default function Live() {
  const router = useRouter();
  const params = useLocalSearchParams<{ role?: string; name?: string; avatar?: string }>();
  const isHost = params.role !== 'viewer';
  const name = params.name || (isHost ? 'Ton live' : 'Fatou Ndiaye');
  const hostAvatar = params.avatar || avatar(5);

  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<'front' | 'back'>('front');
  const [phase, setPhase] = useState<'setup' | 'live'>(isHost ? 'setup' : 'live');

  const [sell, setSell] = useState<SellProduct[]>(isHost ? [] : AVAILABLE.slice(0, 3));
  const [productPicker, setProductPicker] = useState(false);

  const [comments, setComments] = useState<Comment[]>([]);
  const [text, setText] = useState('');
  const [viewers, setViewers] = useState(128);
  const [hearts, setHearts] = useState<{ id: number }[]>([]);
  const [followed, setFollowed] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [giftOpen, setGiftOpen] = useState(false);
  const [pinned, setPinned] = useState<Comment | null>(null);
  const [blocked, setBlocked] = useState<string[]>([]);
  const [mod, setMod] = useState<Comment | null>(null);

  const viewerPlayer = useVideoPlayer(video(3), (p) => { p.loop = true; p.muted = true; if (!isHost) p.play(); });

  const toggleSell = (p: SellProduct) => setSell((prev) => (prev.find((x) => x.id === p.id) ? prev.filter((x) => x.id !== p.id) : [...prev, p]));

  const sendHeart = () => setHearts((h) => [...h.slice(-14), { id: cid++ }]);
  const onGiftSent = (amount: number) => {
    setComments((prev) => [...prev.slice(-30), { id: `g${cid++}`, name: 'Toi', avatar: avatar(12), text: `a offert ${amount.toLocaleString('fr-FR')} FCFA 🎁`, gift: true }]);
    sendHeart();
  };
  const share = async () => { try { await Share.share({ message: `${name} est en direct sur Afylo — rejoins !` }); } catch {} };
  const send = () => {
    if (!text.trim()) return;
    setComments((prev) => [...prev.slice(-30), { id: `c${cid++}`, name: 'Toi', avatar: avatar(12), text: text.trim() }]);
    setText('');
  };

  // Modération (vendeur)
  const deleteComment = (id: string) => { setComments((prev) => prev.filter((c) => c.id !== id)); setMod(null); };
  const blockUser = (n: string) => { setBlocked((b) => [...b, n]); setComments((prev) => prev.filter((c) => c.name !== n)); setMod(null); };
  const pinComment = (c: Comment) => { setPinned(c); setMod(null); };

  // Flux commentaires + cadeaux (seulement en live)
  useEffect(() => {
    if (phase !== 'live') return;
    const t = setInterval(() => {
      const nm = CHATTERS[Math.floor((Date.now() / 1000) % CHATTERS.length)];
      if (blocked.includes(nm)) return;
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
  }, [phase, blocked]);

  // ---------- VUE VENDEUR : préparation du live ----------
  if (isHost && phase === 'setup') {
    return (
      <View style={styles.root}>
        {permission?.granted ? (
          <CameraView key={facing} style={StyleSheet.absoluteFill} facing={facing} />
        ) : (
          <View style={[StyleSheet.absoluteFill, styles.permWrap]}>
            <Ionicons name="videocam" size={40} color="#fff" />
            <Pressable onPress={requestPermission} style={styles.permBtn}><Text style={styles.permBtnText}>Autoriser la caméra</Text></Pressable>
          </View>
        )}
        <View style={styles.setupDim} />
        <SafeAreaView style={{ flex: 1 }}>
          <View style={styles.setupHeader}>
            <Pressable onPress={() => router.back()} style={styles.close}><Ionicons name="close" size={24} color="#fff" /></Pressable>
            <Text style={styles.setupTitle}>Préparer ton live</Text>
            <Pressable onPress={() => setFacing((f) => (f === 'front' ? 'back' : 'front'))} style={styles.close}><Ionicons name="camera-reverse-outline" size={22} color="#fff" /></Pressable>
          </View>

          <View style={{ flex: 1 }} />

          <View style={styles.setupPanel}>
            <Text style={styles.panelTitle}>Que veux-tu vendre en live ?</Text>
            <Text style={styles.panelSub}>Sélectionne tes produits (ma boutique + affiliation). {sell.length} sélectionné(s).</Text>
            <ScrollView style={{ maxHeight: 240 }} showsVerticalScrollIndicator={false}>
              {AVAILABLE.map((p) => {
                const on = !!sell.find((x) => x.id === p.id);
                return (
                  <Pressable key={p.id} onPress={() => toggleSell(p)} style={[styles.pRow, on && styles.pRowOn]}>
                    <Image source={{ uri: p.image }} style={styles.pImg} contentFit="cover" />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.pName} numberOfLines={1}>{p.title}</Text>
                      <Text style={styles.pMeta}>{p.price} · {p.tag}</Text>
                    </View>
                    <Ionicons name={on ? 'checkmark-circle' : 'ellipse-outline'} size={24} color={on ? Afylo.violet : '#ffffff66'} />
                  </Pressable>
                );
              })}
            </ScrollView>
            <Pressable onPress={() => setPhase('live')} style={styles.startBtn}>
              <View style={styles.startDot} />
              <Text style={styles.startText}>Démarrer le live</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  // ---------- VUE LIVE (vendeur en direct OU spectateur) ----------
  return (
    <View style={styles.root}>
      {isHost ? (
        <CameraView key={facing} style={StyleSheet.absoluteFill} facing={facing} />
      ) : (
        <VideoView player={viewerPlayer} style={StyleSheet.absoluteFill} contentFit="cover" nativeControls={false} />
      )}

      <SafeAreaView style={{ flex: 1 }} pointerEvents="box-none">
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
          <View style={styles.viewersPill}><Ionicons name="eye" size={13} color="#fff" /><Text style={styles.viewersText}>{Math.max(1, viewers)}</Text></View>
          <Pressable onPress={share} style={styles.topIcon}><Ionicons name="share-social" size={18} color="#fff" /></Pressable>
          <Pressable onPress={() => router.back()} style={styles.close}><Ionicons name="close" size={24} color="#fff" /></Pressable>
        </View>

        {/* Commentaire épinglé */}
        {pinned && (
          <View style={styles.pinned}>
            <Ionicons name="pin" size={13} color={Afylo.gold} />
            <Text style={styles.pinnedText} numberOfLines={1}><Text style={{ fontFamily: Font.semibold }}>{pinned.name}</Text> · {pinned.text}</Text>
            {isHost && <Ionicons name="close" size={16} color="#ffffff99" onPress={() => setPinned(null)} />}
          </View>
        )}

        <View style={{ flex: 1 }} />

        {/* Commentaires (tap = modérer pour le vendeur) */}
        <View style={styles.commentsWrap} pointerEvents="box-none">
          {comments.slice(-6).map((c) => (
            <Pressable key={c.id} onPress={() => isHost && c.name !== 'Toi' && setMod(c)} style={styles.comment}>
              <Avatar uri={c.avatar} size={26} />
              <View style={[styles.commentBubble, c.gift && styles.giftBubble]}>
                <Text style={[styles.commentName, c.gift && { color: '#fff' }]}>{c.name}</Text>
                <Text style={[styles.commentText, c.gift && styles.giftText]}>{c.text}</Text>
              </View>
            </Pressable>
          ))}
        </View>

        {/* Barre du bas */}
        <View style={styles.bottom}>
          {!isHost ? (
            <View style={styles.inputBar}>
              <TextInput style={styles.input} value={text} onChangeText={setText} placeholder="Ajoute un commentaire…" placeholderTextColor="#ffffff99" onSubmitEditing={send} />
            </View>
          ) : (
            <Pressable onPress={() => setFacing((f) => (f === 'front' ? 'back' : 'front'))} style={styles.circleBtn}>
              <Ionicons name="camera-reverse-outline" size={24} color="#fff" />
            </Pressable>
          )}

          {isHost && (
            <Pressable onPress={() => setProductPicker(true)} style={styles.circleBtn}>
              <Ionicons name="pricetags" size={22} color="#fff" />
            </Pressable>
          )}

          <Pressable onPress={() => setPayOpen(true)} style={styles.sellBtn}>
            <Ionicons name="bag-handle" size={18} color="#fff" />
            <Text style={styles.sellText}>{isHost ? `Vente (${sell.length})` : `Acheter (${sell.length})`}</Text>
          </Pressable>

          {!isHost && (
            <Pressable onPress={() => setGiftOpen(true)} style={styles.circleBtn}><Ionicons name="gift" size={24} color={Afylo.gold} /></Pressable>
          )}
          <Pressable onPress={sendHeart} style={styles.circleBtn}><Ionicons name="heart" size={26} color={Afylo.live} /></Pressable>
        </View>
      </SafeAreaView>

      {/* Cœurs flottants */}
      <View style={styles.heartsLayer} pointerEvents="none">
        {hearts.map((h) => <FloatingHeart key={h.id} onDone={() => setHearts((prev) => prev.filter((x) => x.id !== h.id))} />)}
      </View>

      {/* Sélecteur de produit (ajouter pendant le live) */}
      <Modal visible={productPicker} transparent animationType="slide" onRequestClose={() => setProductPicker(false)}>
        <Pressable style={styles.mOverlay} onPress={() => setProductPicker(false)}>
          <View style={styles.mSheet}>
            <View style={styles.mHandle} />
            <Text style={styles.mTitle}>Produits en vente</Text>
            <ScrollView style={{ maxHeight: 360 }}>
              {AVAILABLE.map((p) => {
                const on = !!sell.find((x) => x.id === p.id);
                return (
                  <Pressable key={p.id} onPress={() => toggleSell(p)} style={styles.pRow}>
                    <Image source={{ uri: p.image }} style={styles.pImg} contentFit="cover" />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.pName} numberOfLines={1}>{p.title}</Text>
                      <Text style={styles.pMeta}>{p.price} · {p.tag}</Text>
                    </View>
                    <Ionicons name={on ? 'checkmark-circle' : 'add-circle-outline'} size={24} color={on ? Afylo.violet : '#ffffff88'} />
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>

      {/* Menu de modération (vendeur) */}
      <Modal visible={!!mod} transparent animationType="fade" onRequestClose={() => setMod(null)}>
        <Pressable style={styles.modOverlay} onPress={() => setMod(null)}>
          <View style={styles.modSheet}>
            <Text style={styles.modWho}>{mod?.name}</Text>
            <Text style={styles.modMsg}>{mod?.text}</Text>
            <Pressable style={styles.modItem} onPress={() => mod && pinComment(mod)}><Ionicons name="pin-outline" size={20} color={Afylo.text} /><Text style={styles.modItemText}>Épingler</Text></Pressable>
            <Pressable style={styles.modItem} onPress={() => mod && deleteComment(mod.id)}><Ionicons name="trash-outline" size={20} color={Afylo.live} /><Text style={[styles.modItemText, { color: Afylo.live }]}>Supprimer</Text></Pressable>
            <Pressable style={styles.modItem} onPress={() => mod && blockUser(mod.name)}><Ionicons name="ban-outline" size={20} color={Afylo.live} /><Text style={[styles.modItemText, { color: Afylo.live }]}>Bloquer {mod?.name}</Text></Pressable>
            <Pressable style={styles.modCancel} onPress={() => setMod(null)}><Text style={styles.modCancelText}>Annuler</Text></Pressable>
          </View>
        </Pressable>
      </Modal>

      <PaymentSheet visible={payOpen} items={sell.map((p) => ({ title: p.title, price: p.price }))} onClose={() => setPayOpen(false)} />
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
  permBtn: { backgroundColor: Afylo.violet, paddingHorizontal: 18, paddingVertical: 10, borderRadius: Radius.pill },
  permBtnText: { color: '#fff', fontFamily: Font.semibold },

  setupDim: { ...StyleSheet.absoluteFillObject, backgroundColor: '#00000066' },
  setupHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingTop: 8 },
  setupTitle: { color: '#fff', fontFamily: Font.bold, fontSize: 17 },
  setupPanel: { backgroundColor: '#15151C', margin: 12, borderRadius: 20, padding: 16 },
  panelTitle: { color: '#fff', fontFamily: Font.bold, fontSize: 17 },
  panelSub: { color: '#ffffffaa', fontSize: 13, marginTop: 4, marginBottom: 10 },
  pRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8, paddingHorizontal: 8, borderRadius: 12 },
  pRowOn: { backgroundColor: '#ffffff10' },
  pImg: { width: 46, height: 46, borderRadius: 10, backgroundColor: '#222' },
  pName: { color: '#fff', fontFamily: Font.semibold, fontSize: 14 },
  pMeta: { color: '#ffffff99', fontSize: 12, marginTop: 2 },
  startBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Afylo.live, height: 52, borderRadius: Radius.pill, marginTop: 12 },
  startDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#fff' },
  startText: { color: '#fff', fontFamily: Font.bold, fontSize: 16 },

  top: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingTop: 8 },
  hostPill: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#00000055', borderRadius: Radius.pill, paddingLeft: 4, paddingRight: 10, paddingVertical: 4, maxWidth: 170 },
  hostName: { color: '#fff', fontFamily: Font.semibold, fontSize: 13, flexShrink: 1 },
  followBtn: { backgroundColor: Afylo.violet, width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  followText: { color: '#fff', fontFamily: Font.bold, fontSize: 13 },
  liveBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: Afylo.live, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#fff' },
  liveText: { color: '#fff', fontFamily: Font.bold, fontSize: 10 },
  viewersPill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#00000055', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  viewersText: { color: '#fff', fontFamily: Font.semibold, fontSize: 12 },
  topIcon: { marginLeft: 'auto', width: 34, height: 34, borderRadius: 17, backgroundColor: '#00000055', alignItems: 'center', justifyContent: 'center' },
  close: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#00000055', alignItems: 'center', justifyContent: 'center' },

  pinned: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#00000066', marginHorizontal: 12, marginTop: 10, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: '#FFD98A55' },
  pinnedText: { color: '#fff', fontSize: 13, flex: 1 },

  commentsWrap: { paddingHorizontal: 12, gap: 8, marginBottom: 8, maxWidth: '82%' },
  comment: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  commentBubble: { backgroundColor: '#00000055', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6 },
  commentName: { color: '#ffffffcc', fontFamily: Font.semibold, fontSize: 11 },
  commentText: { color: '#fff', fontSize: 14 },
  giftBubble: { backgroundColor: '#B8791Fee', borderWidth: 1, borderColor: '#FFD98A' },
  giftText: { color: '#fff', fontFamily: Font.bold },

  bottom: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingBottom: 8 },
  inputBar: { flex: 1, backgroundColor: '#00000055', borderRadius: Radius.pill, borderWidth: 1, borderColor: '#ffffff44', paddingHorizontal: 16, height: 44, justifyContent: 'center' },
  input: { color: '#fff', fontSize: 15 },
  circleBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#00000055', alignItems: 'center', justifyContent: 'center' },
  sellBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Afylo.violet, paddingHorizontal: 16, height: 44, borderRadius: Radius.pill, marginLeft: 'auto' },
  sellText: { color: '#fff', fontFamily: Font.semibold, fontSize: 14 },
  heartsLayer: { position: 'absolute', right: 0, bottom: 0, width: 100, height: 400 },

  mOverlay: { flex: 1, backgroundColor: '#00000088', justifyContent: 'flex-end' },
  mSheet: { backgroundColor: '#15151C', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 16, paddingBottom: 28 },
  mHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#ffffff33', alignSelf: 'center', marginBottom: 12 },
  mTitle: { color: '#fff', fontFamily: Font.bold, fontSize: 17, marginBottom: 8 },

  modOverlay: { flex: 1, backgroundColor: '#00000088', justifyContent: 'center', paddingHorizontal: 30 },
  modSheet: { backgroundColor: Afylo.surface, borderRadius: 20, padding: 16 },
  modWho: { ...{}, color: Afylo.text, fontFamily: Font.bold, fontSize: 15 },
  modMsg: { color: Afylo.textDim, fontSize: 14, marginTop: 2, marginBottom: 10 },
  modItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  modItemText: { color: Afylo.text, fontFamily: Font.semibold, fontSize: 15 },
  modCancel: { alignItems: 'center', paddingVertical: 12, marginTop: 4 },
  modCancelText: { color: Afylo.textDim, fontFamily: Font.semibold, fontSize: 15 },
});
