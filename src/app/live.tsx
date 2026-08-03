import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Modal, Pressable, ScrollView, Share, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/ui-kit';
import { GiftSheet } from '@/components/gift-sheet';
import { PaymentSheet } from '@/components/payment-sheet';
import { Afylo, Font, Radius } from '@/constants/brand';
import { BuzzBadge } from '@/components/buzz-badge';
import { useIsBuzz } from '@/lib/buzz';
import { endLive, listMyProducts, setLiveViewers } from '@/lib/db';
import { useMe } from '@/lib/me';
import { avatar, photo, video } from '@/lib/mock';

type SellProduct = { id: string; title: string; price: string; image: string; tag: string };
type Comment = { id: string; name: string; avatar: string; text: string; gift?: boolean; system?: 'join' | 'like' | 'share' | 'guest' | 'sale'; product?: { title: string; price: string } };
type GuestMode = 'audio' | 'video';
type Guest = { id: string; name: string; avatar: string; mode: GuestMode; local?: boolean };
type Heart = { id: number; x: number; y: number; color: string; size: number };
type Sale = { id: string; buyer: string; avatar: string; title: string; price: string };

const priceNum = (s: string) => parseInt(s.replace(/\D/g, ''), 10) || 0;
const fmtF = (n: number) => n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' FCFA';

const CHATTERS = ['Awa', 'Modou', 'Sokhna', 'Cheikh', 'Mariama', 'Ibou', 'Aïda', 'Serigne'];
const MSGS = ['Trop belle 😍', 'Ça coûte combien ?', 'Livraison à Thiès ?', '🔥🔥🔥', "J'achète !", 'Bravo 👏', "Tu as d'autres couleurs ?", 'Première fois ici 🙌', 'Salut de Dakar', 'Le lien du produit ?', 'Magnifique'];
const GIFTS = [500, 1000, 2000, 5000];
const BUZZ_GOAL = 100; // j'aime à atteindre pour que le live obtienne le Buzz
const HEART_COLORS = ['#E11D48', '#FF4D8D', '#FF7AB8', '#B8791F', '#6E80FF', '#FF5A5F', '#FF2D55'];
const SYS: Record<'join' | 'like' | 'share' | 'guest' | 'sale', { icon: keyof typeof Ionicons.glyphMap; color: string }> = {
  join: { icon: 'enter-outline', color: '#7EC8FF' },
  like: { icon: 'heart', color: Afylo.live },
  share: { icon: 'arrow-redo', color: '#fff' },
  guest: { icon: 'mic', color: Afylo.violet2 },
  sale: { icon: 'bag-check', color: '#37D67A' },
};

export default function Live() {
  const router = useRouter();
  const me = useMe();
  const { width, height } = useWindowDimensions();
  const params = useLocalSearchParams<{ role?: string; name?: string; avatar?: string; liveId?: string }>();
  const isHost = params.role !== 'viewer';
  const liveId = params.liveId || null;
  const isBuzz = useIsBuzz(liveId);
  const name = params.name || (isHost ? 'Ton live' : 'Fatou Ndiaye');
  const hostAvatar = params.avatar || avatar(5);

  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<'front' | 'back'>('front');
  const [phase, setPhase] = useState<'setup' | 'live'>(isHost ? 'setup' : 'live');

  const [sell, setSell] = useState<SellProduct[]>([]);
  const [available, setAvailable] = useState<SellProduct[]>([]); // VRAIS produits du vendeur
  const [productPicker, setProductPicker] = useState(false);

  // Charge les vraies boutiques du vendeur (plus de produit fictif).
  useEffect(() => {
    if (!isHost) return;
    listMyProducts()
      .then((rows) => setAvailable(rows.map((p) => ({ id: p.id, title: p.title, price: fmtF(p.promo_cfa ?? p.price_cfa), image: p.image_url || photo(`p-${p.id}`, 200, 200), tag: 'Ma boutique' }))))
      .catch(() => {});
  }, [isHost]);

  const [comments, setComments] = useState<Comment[]>([]);
  const [text, setText] = useState('');
  const [viewers, setViewers] = useState(128);
  const [likeCount, setLikeCount] = useState(0); // compteur de j'aime réel (objectif Buzz)
  const [buzzReached, setBuzzReached] = useState(false);
  const buzzRef = useRef(false);
  const [hearts, setHearts] = useState<Heart[]>([]);
  const [pops, setPops] = useState<{ id: number; x: number; y: number }[]>([]);
  const [followed, setFollowed] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [giftOpen, setGiftOpen] = useState(false);
  const [sales, setSales] = useState<Sale[]>([]); // ventes reçues pendant le live (vendeur)
  const [salesOpen, setSalesOpen] = useState(false);
  const [payProducts, setPayProducts] = useState<{ title: string; price: string }[]>([]); // panier ouvert
  const [linkPicker, setLinkPicker] = useState<string | null>(null); // envoie un lien produit à ce nom
  const [pinned, setPinned] = useState<Comment | null>(null);
  const [blocked, setBlocked] = useState<string[]>([]);
  const [mod, setMod] = useState<Comment | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [requests, setRequests] = useState<Guest[]>([]); // demandes d'intervention (vendeur)
  const [guests, setGuests] = useState<Guest[]>([]); // intervenants acceptés
  const [requestsOpen, setRequestsOpen] = useState(false); // panneau des demandes (vendeur)
  const [requested, setRequested] = useState<'idle' | 'pending' | 'accepted' | 'live'>('idle'); // côté spectateur
  const [chooser, setChooser] = useState(false); // choix audio/vidéo après acceptation
  const [endConfirm, setEndConfirm] = useState(false); // confirmation avant de terminer le live (vendeur)
  const lastTap = useRef(0);
  const commentsRef = useRef<ScrollView>(null); // auto-scroll vers le dernier message

  const leave = () => {
    if (isHost && liveId) endLive(liveId).catch(() => {}); // ferme le live en base
    router.canGoBack() ? router.back() : router.replace('/accueil');
  };
  const seq = useRef(0); // compteur d'ids (persiste avec l'état, pas de collision au Fast Refresh)

  // Heartbeat : met à jour le nb de spectateurs affiché dans le Feed (hôte)
  useEffect(() => {
    if (!isHost || !liveId) return;
    setLiveViewers(liveId, viewers).catch(() => {});
    const t = setInterval(() => setLiveViewers(liveId, viewers).catch(() => {}), 10000);
    return () => clearInterval(t); // NE PAS terminer le live ici (démontage dev/nav) — seulement via leave()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHost, liveId, viewers]);

  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast((cur) => (cur === m ? null : cur)), 1700); };
  const nid = (p: string) => `${p}${seq.current++}`; // id calculé UNE fois, hors updater
  const addComment = (c: Omit<Comment, 'id'>) => { const id = nid('c'); setComments((prev) => [...prev.slice(-50), { id, ...c }]); };

  // Auto-scroll TikTok : on colle toujours au dernier message (deux frames pour laisser le layout se poser).
  useEffect(() => {
    const id = requestAnimationFrame(() => requestAnimationFrame(() => commentsRef.current?.scrollToEnd({ animated: true })));
    return () => cancelAnimationFrame(id);
  }, [comments]);
  const pushEvent = (nm: string, av: string, system: NonNullable<Comment['system']>, txt: string) => {
    const id = nid('e');
    setComments((prev) => [...prev.slice(-50), { id, name: nm, avatar: av, text: txt, system }]);
  };

  const viewerPlayer = useVideoPlayer(video(3), (p) => { p.loop = true; p.muted = true; if (!isHost) p.play(); });

  const toggleSell = (p: SellProduct) => setSell((prev) => (prev.find((x) => x.id === p.id) ? prev.filter((x) => x.id !== p.id) : [...prev, p]));

  // ---- LIKES spectaculaires ----
  const spawnHearts = (x: number, y: number, count = 1) => {
    const additions = Array.from({ length: count }, () => ({
      id: seq.current++,
      x: x + (Math.random() * 46 - 23),
      y: y + (Math.random() * 20 - 10),
      color: HEART_COLORS[Math.floor(Math.random() * HEART_COLORS.length)],
      size: 20 + Math.random() * 26,
    }));
    setHearts((h) => [...h.slice(-44), ...additions]);
  };
  const bigPop = (x: number, y: number) => {
    const id = seq.current++;
    setPops((p) => [...p, { id, x, y }]);
    setTimeout(() => setPops((p) => p.filter((z) => z.id !== id)), 700);
  };
  const addLikes = (n = 1) => setLikeCount((c) => c + n);
  const sendHeart = () => { spawnHearts(width - 38, height - 130, 2); addLikes(2); }; // bouton cœur (bas droite)

  // Objectif Buzz atteint → annonce visible par tous (viewers + hôte).
  useEffect(() => {
    if (buzzRef.current || likeCount < BUZZ_GOAL) return;
    buzzRef.current = true;
    setBuzzReached(true);
    setComments((prev) => [...prev.slice(-50), { id: `buzz${seq.current++}`, name: '', avatar: '', text: '🔥 Ce live a le BUZZ !', system: 'like' }]);
    showToast(isHost ? '🔥 Ton live a le Buzz !' : '🔥 Ce live a le Buzz !');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [likeCount]);

  const onGiftSent = (amount: number) => {
    addComment({ name: me.name, avatar: me.avatar, text: `a offert ${amount.toLocaleString('fr-FR')} FCFA 🎁`, gift: true });
    spawnHearts(width / 2, height / 2, 8);
  };
  const share = async () => { try { await Share.share({ message: `${name} est en direct sur Afylo — rejoins !` }); } catch {} };
  const send = () => {
    if (!text.trim()) return;
    addComment({ name: me.name, avatar: me.avatar, text: text.trim() });
    setText('');
  };

  // Actions sur un commentaire (appui long) — le menu s'adapte hôte / spectateur
  const deleteComment = (id: string) => { setComments((prev) => prev.filter((c) => c.id !== id)); setMod(null); showToast('Commentaire supprimé'); };
  const blockUser = (n: string) => { setBlocked((b) => [...b, n]); setComments((prev) => prev.filter((c) => c.name !== n)); setMod(null); showToast(`${n} bloqué`); };
  const pinComment = (c: Comment) => { setPinned(c); setMod(null); };
  const replyTo = (n: string) => { setText((t) => `@${n} ${t}`); setMod(null); };
  const reportComment = () => { setMod(null); showToast('Merci, commentaire signalé'); };

  // Achat : panier complet (bouton) ou un seul produit (lien envoyé dans le chat)
  const openBuyAll = () => { setPayProducts(sell.map((p) => ({ title: p.title, price: p.price }))); setPayOpen(true); };
  const openBuyOne = (prod: { title: string; price: string }) => { setPayProducts([prod]); setPayOpen(true); };

  // Vendeur : répondre en envoyant un lien de vente d'un produit
  const sendProductLink = (p: SellProduct) => {
    const target = linkPicker && linkPicker !== me.name ? `@${linkPicker} ` : '';
    addComment({ name: me.name, avatar: me.avatar, text: `${target}voici le lien 👇`, product: { title: p.title, price: p.price } });
    setLinkPicker(null);
  };

  // Aller sur le profil du live
  const openHostProfile = () => router.push({ pathname: '/creator/[id]', params: { id: name, name, avatar: hostAvatar } });

  // Double-tap n'importe où = like à l'endroit touché
  const onScreenTap = (e: any) => {
    const now = Date.now();
    const { locationX = width / 2, locationY = height / 2 } = e?.nativeEvent ?? {};
    if (now - lastTap.current < 300) { bigPop(locationX, locationY); spawnHearts(locationX, locationY, 6); addLikes(1); }
    lastTap.current = now;
  };

  // ---- Intervenants (co-host façon appel vidéo TikTok) ----
  const acceptGuest = (g: Guest, mode: GuestMode) => {
    setGuests((prev) => [...prev, { ...g, mode }]);
    setRequests((prev) => prev.filter((r) => r.id !== g.id));
    pushEvent(g.name, g.avatar, 'guest', mode === 'video' ? 'a rejoint en vidéo 📹' : 'a rejoint en audio 🎤');
  };
  const refuseGuest = (id: string) => setRequests((prev) => prev.filter((r) => r.id !== id));
  const removeGuest = (id: string) => { setGuests((prev) => prev.filter((g) => g.id !== id)); showToast('Intervenant retiré'); };

  // Côté spectateur : demander à intervenir → accepté → choix audio/vidéo
  const requestJoin = () => {
    if (requested !== 'idle') return;
    setRequested('pending');
    setTimeout(() => { setRequested('accepted'); setChooser(true); }, 2200);
  };
  const chooseMode = async (mode: GuestMode) => {
    if (mode === 'video' && !permission?.granted) {
      const r = await requestPermission();
      if (!r?.granted) showToast('Caméra refusée — audio activé');
    }
    const finalMode: GuestMode = mode === 'video' && !permission?.granted ? 'audio' : mode;
    setGuests((prev) => [...prev, { id: 'me', name: me.name, avatar: me.avatar, mode: finalMode, local: true }]);
    setRequested('live');
    setChooser(false);
    pushEvent(me.name, me.avatar, 'guest', finalMode === 'video' ? 'tu interviens en vidéo 📹' : 'tu interviens en audio 🎤');
  };
  const leaveStage = () => { setGuests((prev) => prev.filter((g) => !g.local)); setRequested('idle'); };
  const localMode = guests.find((g) => g.local)?.mode;

  // Contrôles de MON intervention (co-host) : retourner ma caméra, couper la caméra (→ audio) ou la rallumer.
  const [guestFacing, setGuestFacing] = useState<'front' | 'back'>('front');
  const flipGuestCam = () => setGuestFacing((f) => (f === 'front' ? 'back' : 'front'));
  const toggleGuestCam = async () => {
    const cur = guests.find((g) => g.local);
    if (!cur) return;
    if (cur.mode === 'audio' && !permission?.granted) { const r = await requestPermission(); if (!r?.granted) { showToast('Caméra refusée'); return; } }
    setGuests((prev) => prev.map((g) => (g.local ? { ...g, mode: g.mode === 'video' ? 'audio' : 'video' } : g)));
  };

  // Événement d'arrivée
  useEffect(() => {
    if (phase === 'live') pushEvent(me.name, me.avatar, 'join', 'a rejoint le live');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // Flux d'événements + demandes d'intervention simulées
  useEffect(() => {
    if (phase !== 'live') return;
    const t = setInterval(() => {
      const nm = CHATTERS[Math.floor((Date.now() / 1000) % CHATTERS.length)];
      const av = avatar(9 + (seq.current % 40));
      if (!blocked.includes(nm)) {
        const roll = Math.round(Date.now() / 1000) % 6;
        if (roll === 0) addComment({ name: nm, avatar: av, text: `a offert ${GIFTS[seq.current % GIFTS.length].toLocaleString('fr-FR')} FCFA 🎁`, gift: true });
        else if (roll === 1) pushEvent(nm, av, 'join', 'a rejoint le live');
        else if (roll === 2) { pushEvent(nm, av, 'like', 'a aimé'); spawnHearts(width - 38, height - 130, 1); addLikes(1); }
        else if (roll === 3) pushEvent(nm, av, 'share', 'a partagé');
        else addComment({ name: nm, avatar: av, text: MSGS[seq.current % MSGS.length] });
      }
      setViewers((v) => v + (Math.round(Date.now() / 1000) % 3) - 1);
      if (isHost && Math.round(Date.now() / 1000) % 7 === 0) {
        const rid = nid('r');
        setRequests((prev) => (prev.length >= 3 ? prev : [...prev, { id: rid, name: nm, avatar: av, mode: 'audio' }]));
      }
      // Ventes reçues en direct (uniquement si le vendeur a mis des produits)
      if (isHost && sell.length > 0 && Math.round(Date.now() / 1000) % 5 === 0) {
        const prod = sell[seq.current % sell.length];
        const sid = nid('s');
        setSales((prev) => [{ id: sid, buyer: nm, avatar: av, title: prod.title, price: prod.price }, ...prev].slice(0, 60));
        pushEvent(nm, av, 'sale', `a acheté ${prod.title}`);
      }
    }, 2200);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, blocked, isHost, sell, width, height]);

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
            <Pressable onPress={() => (isHost ? setEndConfirm(true) : leave())} style={styles.close}><Ionicons name="close" size={24} color="#fff" /></Pressable>
            <Text style={styles.setupTitle}>Préparer ton live</Text>
            <Pressable onPress={() => setFacing((f) => (f === 'front' ? 'back' : 'front'))} style={styles.close}><Ionicons name="camera-reverse-outline" size={22} color="#fff" /></Pressable>
          </View>
          <View style={{ flex: 1 }} />
          <View style={styles.setupPanel}>
            <View style={styles.panelHead}>
              <Text style={styles.panelTitle}>Produits à vendre</Text>
              <Text style={styles.optTag}>Optionnel</Text>
            </View>
            <Text style={styles.panelSub}>Tu peux lancer ton live sans produit. {sell.length > 0 ? `${sell.length} sélectionné(s).` : 'Ajoute-en quand tu veux pendant le live.'}</Text>
            <ScrollView style={{ maxHeight: 240 }} showsVerticalScrollIndicator={false}>
              {available.map((p) => {
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

  // ---------- VUE LIVE ----------
  return (
    <View style={styles.root}>
      {isHost ? (
        <CameraView key={facing} style={StyleSheet.absoluteFill} facing={facing} />
      ) : (
        <VideoView player={viewerPlayer} style={StyleSheet.absoluteFill} contentFit="cover" nativeControls={false} />
      )}

      {/* Double-tap n'importe où = like */}
      <Pressable style={StyleSheet.absoluteFill} onPress={onScreenTap} />

      <SafeAreaView style={{ flex: 1 }} pointerEvents="box-none">
        <View style={styles.top}>
          <Pressable onPress={openHostProfile} style={styles.hostPill}>
            <Avatar uri={hostAvatar} size={30} />
            <Text style={styles.hostName} numberOfLines={1}>{name}</Text>
            {!isHost && (
              <Pressable onPress={() => setFollowed((v) => !v)} style={[styles.followBtn, followed && { backgroundColor: '#ffffff33' }]}>
                <Text style={styles.followText}>{followed ? '✓' : '+'}</Text>
              </Pressable>
            )}
          </Pressable>
          <View style={styles.liveBadge}><View style={styles.liveDot} /><Text style={styles.liveText}>EN DIRECT</Text></View>
          <View style={styles.viewersPill}><Ionicons name="eye" size={13} color="#fff" /><Text style={styles.viewersText}>{Math.max(1, viewers)}</Text></View>
          {/* Compteur de j'aime → objectif Buzz (temps réel) */}
          <View style={[styles.viewersPill, buzzReached && { backgroundColor: '#FF2D5566' }]}>
            <Ionicons name={buzzReached ? 'flame' : 'heart'} size={13} color={buzzReached ? Afylo.gold : Afylo.live} />
            <Text style={styles.viewersText}>{buzzReached ? likeCount : `${likeCount}/${BUZZ_GOAL}`}</Text>
          </View>
          {(isBuzz || buzzReached) && <BuzzBadge size="sm" />}
          <View style={{ flex: 1 }} />
          {isHost && (
            <Pressable onPress={() => setFacing((f) => (f === 'front' ? 'back' : 'front'))} style={styles.close}>
              <Ionicons name="camera-reverse-outline" size={20} color="#fff" />
            </Pressable>
          )}
          {isHost && (
            <Pressable onPress={() => setRequestsOpen(true)} style={styles.close}>
              <Ionicons name="people" size={19} color="#fff" />
              {requests.length > 0 && <View style={styles.reqBadge}><Text style={styles.reqBadgeText}>{requests.length}</Text></View>}
            </Pressable>
          )}
          <Pressable onPress={share} style={styles.close}><Ionicons name="share-social" size={18} color="#fff" /></Pressable>
          <Pressable onPress={() => (isHost ? setEndConfirm(true) : leave())} style={styles.close}><Ionicons name="close" size={24} color="#fff" /></Pressable>
        </View>

        {/* Commentaire épinglé */}
        {pinned && (
          <View style={styles.pinned}>
            <Ionicons name="pin" size={13} color={Afylo.gold} />
            <Text style={styles.pinnedText} numberOfLines={1}><Text style={{ fontFamily: Font.semibold }}>{pinned.name}</Text> · {pinned.text}</Text>
            {isHost && <Ionicons name="close" size={16} color="#ffffff99" onPress={() => setPinned(null)} />}
          </View>
        )}

        {/* Intervenants en direct (audio = avatar, vidéo = flux) */}
        {guests.length > 0 && (
          <View style={styles.guestStrip}>
            {guests.map((g) => (
              <GuestPip
                key={g.id}
                g={g}
                facing={g.local ? guestFacing : facing}
                onFlip={g.local ? flipGuestCam : undefined}
                onToggleCam={g.local ? toggleGuestCam : undefined}
                onLeave={g.local ? leaveStage : undefined}
              />
            ))}
          </View>
        )}

        <View style={{ flex: 1 }} />

        {/* Commentaires — scrollables, appui long pour agir */}
        <ScrollView
          ref={commentsRef}
          style={styles.commentsScroll}
          contentContainerStyle={styles.commentsContent}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => commentsRef.current?.scrollToEnd({ animated: true })}
          pointerEvents="box-none">
          {comments.map((c) =>
            c.system ? (
              <View key={c.id} style={styles.sysRow}>
                <Ionicons name={SYS[c.system].icon} size={13} color={SYS[c.system].color} />
                <Text style={styles.sysText}><Text style={{ fontFamily: Font.semibold }}>{c.name}</Text> {c.text}</Text>
              </View>
            ) : (
              <Pressable key={c.id} onLongPress={() => c.name !== me.name && setMod(c)} delayLongPress={280} style={styles.comment}>
                <Avatar uri={c.avatar} size={26} />
                <View style={[styles.commentBubble, c.gift && styles.giftBubble]}>
                  <Text style={[styles.commentText, c.gift && styles.giftText]}>
                    <Text style={[styles.commentName, c.gift && { color: '#fff' }]}>{c.name}  </Text>
                    {c.text}
                  </Text>
                  {c.product && (
                    <Pressable onPress={() => openBuyOne(c.product!)} style={styles.linkChip}>
                      <Ionicons name="bag-handle" size={13} color="#fff" />
                      <Text style={styles.linkChipTitle} numberOfLines={1}>{c.product.title}</Text>
                      <Text style={styles.linkChipPrice}>{c.product.price}</Text>
                      <View style={styles.linkChipCta}><Text style={styles.linkChipCtaText}>Acheter</Text></View>
                    </Pressable>
                  )}
                </View>
              </Pressable>
            ),
          )}
        </ScrollView>

        {/* Barre du bas */}
        <View style={styles.bottom}>
          <View style={styles.inputBar}>
            <TextInput
              style={styles.input}
              value={text}
              onChangeText={setText}
              placeholder={isHost ? 'Réponds à ta communauté…' : 'Ajoute un commentaire…'}
              placeholderTextColor="#ffffff99"
              onSubmitEditing={send}
              returnKeyType="send"
              blurOnSubmit={false}
            />
          </View>

          {isHost ? (
            <Pressable onPress={() => setProductPicker(true)} style={styles.circleBtn}>
              <Ionicons name="pricetags" size={22} color="#fff" />
            </Pressable>
          ) : (
            <Pressable
              onPress={requested === 'live' ? leaveStage : requestJoin}
              style={[styles.circleBtn, requested !== 'idle' && { backgroundColor: Afylo.violet }]}>
              <Ionicons
                name={requested === 'live' ? (localMode === 'video' ? 'videocam' : 'mic') : requested === 'pending' ? 'hourglass' : requested === 'accepted' ? 'checkmark' : 'hand-left'}
                size={20}
                color="#fff"
              />
            </Pressable>
          )}

          {isHost ? (
            <Pressable onPress={() => setSalesOpen(true)} style={styles.sellBtn}>
              <Ionicons name="cart" size={18} color="#fff" />
              <Text style={styles.sellText}>Ventes ({sales.length})</Text>
            </Pressable>
          ) : (
            <Pressable onPress={openBuyAll} style={styles.sellBtn}>
              <Ionicons name="bag-handle" size={18} color="#fff" />
              <Text style={styles.sellText}>Acheter ({sell.length})</Text>
            </Pressable>
          )}

          {!isHost && (
            <Pressable onPress={() => setGiftOpen(true)} style={styles.circleBtn}><Ionicons name="gift" size={24} color={Afylo.gold} /></Pressable>
          )}
          <Pressable onPress={sendHeart} style={styles.circleBtn}><Ionicons name="heart" size={26} color={Afylo.live} /></Pressable>
        </View>
      </SafeAreaView>

      {/* Toast */}
      {toast && (
        <View style={styles.toast} pointerEvents="none"><Text style={styles.toastText}>{toast}</Text></View>
      )}

      {/* Cœurs flottants + pop double-tap */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {hearts.map((h) => <FloatingHeart key={h.id} heart={h} onDone={() => setHearts((prev) => prev.filter((x) => x.id !== h.id))} />)}
        {pops.map((p) => <BigPop key={p.id} x={p.x} y={p.y} />)}
      </View>

      {/* Panneau des demandes d'intervention (vendeur) */}
      <Modal visible={requestsOpen} transparent animationType="slide" onRequestClose={() => setRequestsOpen(false)}>
        <Pressable style={styles.mOverlay} onPress={() => setRequestsOpen(false)}>
          <Pressable style={styles.mSheet} onPress={(e) => e.stopPropagation?.()}>
            <View style={styles.mHandle} />
            <Text style={styles.mTitle}>Demandes d'intervention</Text>
            {requests.length === 0 ? (
              <Text style={styles.emptyReq}>Aucune demande pour le moment.</Text>
            ) : (
              requests.map((r) => (
                <View key={r.id} style={styles.reqRow}>
                  <Avatar uri={r.avatar} size={40} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.reqName}>{r.name}</Text>
                    <Text style={styles.reqSub}>veut intervenir</Text>
                  </View>
                  <Pressable onPress={() => acceptGuest(r, 'audio')} style={styles.reqIcon}><Ionicons name="mic" size={18} color="#fff" /></Pressable>
                  <Pressable onPress={() => acceptGuest(r, 'video')} style={[styles.reqIcon, { backgroundColor: Afylo.violet }]}><Ionicons name="videocam" size={18} color="#fff" /></Pressable>
                  <Pressable onPress={() => refuseGuest(r.id)} style={styles.reqIconGhost}><Ionicons name="close" size={18} color="#fff" /></Pressable>
                </View>
              ))
            )}

            {guests.length > 0 && (
              <>
                <Text style={[styles.mTitle, { fontSize: 15, marginTop: 18 }]}>En direct avec toi</Text>
                {guests.map((g) => (
                  <View key={g.id} style={styles.reqRow}>
                    <Avatar uri={g.avatar} size={40} ring />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.reqName}>{g.name}{g.local ? ' (toi)' : ''}</Text>
                      <Text style={styles.reqSub}><Ionicons name={g.mode === 'video' ? 'videocam' : 'mic'} size={11} color="#ffffffaa" /> {g.mode === 'video' ? 'Vidéo' : 'Audio'}</Text>
                    </View>
                    <Pressable onPress={() => removeGuest(g.id)} style={styles.reqRemove}><Text style={styles.reqRemoveText}>Retirer</Text></Pressable>
                  </View>
                ))}
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Choix audio / vidéo (spectateur accepté) */}
      <Modal visible={chooser} transparent animationType="fade" onRequestClose={() => { setChooser(false); setRequested('idle'); }}>
        <View style={styles.chooserOverlay}>
          <View style={styles.chooserCard}>
            <View style={styles.chooserIcon}><Ionicons name="checkmark" size={26} color="#fff" /></View>
            <Text style={styles.chooserTitle}>Tu es accepté !</Text>
            <Text style={styles.chooserSub}>Comment veux-tu intervenir dans le live ?</Text>
            <View style={styles.chooserRow}>
              <Pressable onPress={() => chooseMode('audio')} style={styles.chooserBtn}>
                <Ionicons name="mic" size={26} color={Afylo.text} />
                <Text style={styles.chooserBtnText}>Audio</Text>
              </Pressable>
              <Pressable onPress={() => chooseMode('video')} style={[styles.chooserBtn, styles.chooserBtnVideo]}>
                <Ionicons name="videocam" size={26} color="#fff" />
                <Text style={[styles.chooserBtnText, { color: '#fff' }]}>Vidéo</Text>
              </Pressable>
            </View>
            <Pressable onPress={() => { setChooser(false); setRequested('idle'); }}><Text style={styles.chooserCancel}>Annuler</Text></Pressable>
          </View>
        </View>
      </Modal>

      {/* Sélecteur de produit (ajouter pendant le live) */}
      <Modal visible={productPicker} transparent animationType="slide" onRequestClose={() => setProductPicker(false)}>
        <Pressable style={styles.mOverlay} onPress={() => setProductPicker(false)}>
          <View style={styles.mSheet}>
            <View style={styles.mHandle} />
            <Text style={styles.mTitle}>Produits en vente</Text>
            <ScrollView style={{ maxHeight: 360 }}>
              {available.map((p) => {
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

      {/* Choisir un produit à envoyer comme lien de vente dans le chat (vendeur) */}
      <Modal visible={!!linkPicker} transparent animationType="slide" onRequestClose={() => setLinkPicker(null)}>
        <Pressable style={styles.mOverlay} onPress={() => setLinkPicker(null)}>
          <Pressable style={[styles.mSheet, { maxHeight: height * 0.6 }]} onPress={(e) => e.stopPropagation?.()}>
            <View style={styles.mHandle} />
            <Text style={styles.mTitle}>Envoyer un lien produit{linkPicker && linkPicker !== me.name ? ` à ${linkPicker}` : ''}</Text>
            <Text style={styles.linkHint}>Le produit s'affiche dans le chat avec un bouton « Acheter ».</Text>
            <ScrollView style={{ maxHeight: height * 0.6 - 130 }} showsVerticalScrollIndicator={false}>
              {(sell.length > 0 ? sell : available).map((p) => (
                <Pressable key={p.id} onPress={() => sendProductLink(p)} style={styles.pRow}>
                  <Image source={{ uri: p.image }} style={styles.pImg} contentFit="cover" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.pName} numberOfLines={1}>{p.title}</Text>
                    <Text style={styles.pMeta}>{p.price} · {p.tag}</Text>
                  </View>
                  <Ionicons name="send" size={20} color={Afylo.violet2} />
                </Pressable>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Menu commentaire (appui long) — hôte modère, spectateur répond/signale */}
      <Modal visible={!!mod} transparent animationType="fade" onRequestClose={() => setMod(null)}>
        <Pressable style={styles.modOverlay} onPress={() => setMod(null)}>
          <View style={styles.modSheet}>
            <Text style={styles.modWho}>{mod?.name}</Text>
            <Text style={styles.modMsg}>{mod?.text}</Text>
            {isHost ? (
              <>
                <Pressable style={styles.modItem} onPress={() => mod && pinComment(mod)}><Ionicons name="pin-outline" size={20} color={Afylo.text} /><Text style={styles.modItemText}>Épingler</Text></Pressable>
                <Pressable style={styles.modItem} onPress={() => mod && replyTo(mod.name)}><Ionicons name="return-up-back-outline" size={20} color={Afylo.text} /><Text style={styles.modItemText}>Répondre</Text></Pressable>
                <Pressable style={styles.modItem} onPress={() => { const n = mod?.name ?? null; setMod(null); setLinkPicker(n); }}><Ionicons name="pricetag-outline" size={20} color={Afylo.violet} /><Text style={[styles.modItemText, { color: Afylo.violet }]}>Répondre avec un lien produit</Text></Pressable>
                <Pressable style={styles.modItem} onPress={() => mod && deleteComment(mod.id)}><Ionicons name="trash-outline" size={20} color={Afylo.live} /><Text style={[styles.modItemText, { color: Afylo.live }]}>Supprimer</Text></Pressable>
                <Pressable style={styles.modItem} onPress={() => mod && blockUser(mod.name)}><Ionicons name="ban-outline" size={20} color={Afylo.live} /><Text style={[styles.modItemText, { color: Afylo.live }]}>Bloquer {mod?.name}</Text></Pressable>
              </>
            ) : (
              <>
                <Pressable style={styles.modItem} onPress={() => mod && replyTo(mod.name)}><Ionicons name="return-up-back-outline" size={20} color={Afylo.text} /><Text style={styles.modItemText}>Répondre à {mod?.name}</Text></Pressable>
                <Pressable style={styles.modItem} onPress={() => mod && router.push({ pathname: '/creator/[id]', params: { id: mod.name, name: mod.name, avatar: mod.avatar } })}><Ionicons name="person-outline" size={20} color={Afylo.text} /><Text style={styles.modItemText}>Voir le profil</Text></Pressable>
                <Pressable style={styles.modItem} onPress={reportComment}><Ionicons name="flag-outline" size={20} color={Afylo.live} /><Text style={[styles.modItemText, { color: Afylo.live }]}>Signaler</Text></Pressable>
              </>
            )}
            <Pressable style={styles.modCancel} onPress={() => setMod(null)}><Text style={styles.modCancelText}>Annuler</Text></Pressable>
          </View>
        </Pressable>
      </Modal>

      {/* Ventes reçues en direct (vendeur) */}
      <Modal visible={salesOpen} transparent animationType="slide" onRequestClose={() => setSalesOpen(false)}>
        <Pressable style={styles.mOverlay} onPress={() => setSalesOpen(false)}>
          <Pressable style={[styles.mSheet, { maxHeight: height * 0.52 }]} onPress={(e) => e.stopPropagation?.()}>
            <View style={styles.mHandle} />
            <Text style={styles.mTitle}>Ventes en direct</Text>

            <View style={styles.salesStats}>
              <View style={styles.salesStat}>
                <Text style={styles.salesStatValue}>{sales.length}</Text>
                <Text style={styles.salesStatLabel}>ventes</Text>
              </View>
              <View style={styles.salesDivider} />
              <View style={styles.salesStat}>
                <Text style={[styles.salesStatValue, { color: '#37D67A' }]}>{fmtF(sales.reduce((s, x) => s + priceNum(x.price), 0))}</Text>
                <Text style={styles.salesStatLabel}>encaissé</Text>
              </View>
            </View>

            {sales.length === 0 ? (
              <View style={styles.salesEmpty}>
                <Ionicons name="cart-outline" size={40} color="#ffffff55" />
                <Text style={styles.salesEmptyText}>Aucune vente pour l'instant.</Text>
                <Text style={styles.salesEmptySub}>{sell.length === 0 ? 'Ajoute des produits avec l’icône 🏷️ pour vendre en live.' : 'Anime ton live, les ventes s’afficheront ici en temps réel.'}</Text>
              </View>
            ) : (
              <ScrollView style={{ maxHeight: height * 0.52 - 190 }} showsVerticalScrollIndicator={false}>
                {sales.map((s) => (
                  <View key={s.id} style={styles.saleRow}>
                    <Avatar uri={s.avatar} size={38} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.saleTitle} numberOfLines={1}>{s.title}</Text>
                      <Text style={styles.saleBuyer}>{s.buyer}</Text>
                    </View>
                    <Text style={styles.salePrice}>{s.price}</Text>
                  </View>
                ))}
              </ScrollView>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Confirmation avant de terminer le live (vendeur) */}
      <Modal visible={endConfirm} transparent animationType="fade" onRequestClose={() => setEndConfirm(false)}>
        <View style={styles.chooserOverlay}>
          <View style={styles.chooserCard}>
            <View style={[styles.chooserIcon, { backgroundColor: Afylo.live }]}><Ionicons name="stop" size={24} color="#fff" /></View>
            <Text style={styles.chooserTitle}>Terminer le live ?</Text>
            <Text style={styles.chooserSub}>{Math.max(1, viewers)} spectateur(s) te regardent{sales.length > 0 ? ` · ${sales.length} vente(s)` : ''}. Cette action arrête la diffusion.</Text>
            <Pressable onPress={() => { setEndConfirm(false); leave(); }} style={styles.endBtn}>
              <Text style={styles.endBtnText}>Terminer le live</Text>
            </Pressable>
            <Pressable onPress={() => setEndConfirm(false)} style={styles.endCancel}><Text style={styles.chooserCancel}>Continuer le live</Text></Pressable>
          </View>
        </View>
      </Modal>

      <PaymentSheet visible={payOpen} items={payProducts} onClose={() => setPayOpen(false)} />
      <GiftSheet visible={giftOpen} host={name} onClose={() => setGiftOpen(false)} onSent={onGiftSent} />
    </View>
  );
}

/* ---------------- Intervenant : pip audio / vidéo ---------------- */
function GuestPip({ g, facing, onFlip, onToggleCam, onLeave }: { g: Guest; facing: 'front' | 'back'; onFlip?: () => void; onToggleCam?: () => void; onLeave?: () => void }) {
  return (
    <View style={styles.guestPip}>
      {g.mode === 'video'
        ? (g.local ? <CameraView key={facing} style={StyleSheet.absoluteFill} facing={facing} mirror={facing === 'front'} /> : <RemoteVideoPip />)
        : <AudioPip avatar={g.avatar} />}

      {/* Contrôles de MON intervention (co-host) — façon TikTok */}
      {g.local && (
        <View style={styles.pipControls}>
          <Pressable onPress={onToggleCam} style={styles.pipBtn}>
            <Ionicons name={g.mode === 'video' ? 'videocam' : 'videocam-off'} size={13} color="#fff" />
          </Pressable>
          {g.mode === 'video' && (
            <Pressable onPress={onFlip} style={styles.pipBtn}><Ionicons name="camera-reverse" size={13} color="#fff" /></Pressable>
          )}
          <Pressable onPress={onLeave} style={[styles.pipBtn, { backgroundColor: '#E11D48' }]}><Ionicons name="exit" size={13} color="#fff" /></Pressable>
        </View>
      )}

      <View style={styles.guestNameBar}>
        <Ionicons name={g.mode === 'video' ? 'videocam' : 'mic'} size={9} color="#fff" />
        <Text style={styles.guestName} numberOfLines={1}>{g.name}{g.local ? ' (toi)' : ''}</Text>
      </View>
    </View>
  );
}

/** Tuile audio : avatar + anneau qui pulse (indique la prise de parole). */
function AudioPip({ avatar }: { avatar: string }) {
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 700, easing: Easing.in(Easing.ease), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);
  return (
    <View style={styles.guestAudio}>
      <Animated.View style={[styles.audioRing, { opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.15, 0.5] }), transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.35] }) }] }]} />
      <Avatar uri={avatar} size={54} ring />
    </View>
  );
}

function RemoteVideoPip() {
  const player = useVideoPlayer(video(6), (p) => { p.loop = true; p.muted = true; p.play(); });
  return <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="cover" nativeControls={false} />;
}

/* ---------------- Likes animés ---------------- */
function FloatingHeart({ heart, onDone }: { heart: Heart; onDone: () => void }) {
  const t = useRef(new Animated.Value(0)).current;
  const pop = useRef(new Animated.Value(0)).current;
  const rise = useRef(-220 - Math.random() * 160).current;
  const drift = useRef((Math.random() * 2 - 1) * 60).current;
  const dur = useRef(1600 + Math.random() * 1000).current;
  const spin = useRef((Math.random() * 2 - 1) * 24).current;
  useEffect(() => {
    Animated.spring(pop, { toValue: 1, friction: 4, tension: 120, useNativeDriver: true }).start();
    Animated.timing(t, { toValue: 1, duration: dur, easing: Easing.out(Easing.quad), useNativeDriver: true }).start(onDone);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const translateY = t.interpolate({ inputRange: [0, 1], outputRange: [0, rise] });
  const translateX = t.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, drift, drift * 0.3] });
  const opacity = t.interpolate({ inputRange: [0, 0.65, 1], outputRange: [1, 1, 0] });
  const rotate = t.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${spin}deg`] });
  const scale = pop.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] });
  return (
    <Animated.View style={{ position: 'absolute', left: heart.x, top: heart.y, opacity, transform: [{ translateY }, { translateX }, { rotate }, { scale }] }}>
      <Ionicons name="heart" size={heart.size} color={heart.color} style={styles.heartShadow} />
    </Animated.View>
  );
}

function BigPop({ x, y }: { x: number; y: number }) {
  const s = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.sequence([
      Animated.spring(s, { toValue: 1, friction: 3, tension: 90, useNativeDriver: true }),
      Animated.timing(s, { toValue: 2, duration: 320, easing: Easing.in(Easing.quad), useNativeDriver: true }),
    ]).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const scale = s.interpolate({ inputRange: [0, 1, 2], outputRange: [0.2, 1.15, 1.6] });
  const opacity = s.interpolate({ inputRange: [0, 1, 2], outputRange: [0.9, 1, 0] });
  const rotate = s.interpolate({ inputRange: [0, 1], outputRange: ['-18deg', '-8deg'] });
  return (
    <Animated.View style={{ position: 'absolute', left: x - 45, top: y - 45, opacity, transform: [{ scale }, { rotate }] }}>
      <Ionicons name="heart" size={90} color="#FF2D55" style={styles.heartShadow} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000', overflow: 'hidden' },
  permWrap: { alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: '#111' },
  permBtn: { backgroundColor: Afylo.violet, paddingHorizontal: 18, paddingVertical: 10, borderRadius: Radius.pill },
  permBtnText: { color: '#fff', fontFamily: Font.semibold },

  setupDim: { ...StyleSheet.absoluteFillObject, backgroundColor: '#00000066' },
  setupHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingTop: 8 },
  setupTitle: { color: '#fff', fontFamily: Font.bold, fontSize: 17 },
  setupPanel: { backgroundColor: '#15151C', margin: 12, borderRadius: 20, padding: 16 },
  panelHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  panelTitle: { color: '#fff', fontFamily: Font.bold, fontSize: 17 },
  optTag: { color: '#ffffffcc', fontFamily: Font.semibold, fontSize: 11, backgroundColor: '#ffffff1f', paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.pill, overflow: 'hidden' },
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
  close: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#00000055', alignItems: 'center', justifyContent: 'center' },
  reqBadge: { position: 'absolute', top: -3, right: -3, minWidth: 18, height: 18, paddingHorizontal: 4, borderRadius: 9, backgroundColor: Afylo.live, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#000' },
  reqBadgeText: { color: '#fff', fontFamily: Font.bold, fontSize: 10 },

  pinned: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#00000066', marginHorizontal: 12, marginTop: 10, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: '#FFD98A55' },
  pinnedText: { color: '#fff', fontSize: 13, flex: 1 },

  guestStrip: { flexDirection: 'row', gap: 10, paddingHorizontal: 14, marginTop: 12 },
  guestPip: { width: 86, height: 116, borderRadius: 16, overflow: 'hidden', backgroundColor: '#111', borderWidth: 2, borderColor: Afylo.violet },
  guestAudio: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#1a1a22' },
  audioRing: { position: 'absolute', width: 54, height: 54, borderRadius: 27, backgroundColor: Afylo.violet2 },
  pipControls: { position: 'absolute', top: 5, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 5 },
  pipBtn: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#00000088', alignItems: 'center', justifyContent: 'center' },
  guestNameBar: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 5, paddingVertical: 3, backgroundColor: '#00000088' },
  guestName: { color: '#fff', fontFamily: Font.semibold, fontSize: 10, flex: 1 },

  commentsScroll: { maxHeight: 260, marginBottom: 8 },
  commentsContent: { paddingHorizontal: 12, gap: 8, paddingTop: 20 },
  comment: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, maxWidth: '86%' },
  commentBubble: { backgroundColor: '#00000066', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 7 },
  commentName: { color: '#ffffffcc', fontFamily: Font.semibold, fontSize: 13 },
  commentText: { color: '#fff', fontSize: 14, lineHeight: 19 },
  linkChip: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 7, backgroundColor: '#ffffff1f', borderWidth: 1, borderColor: '#ffffff33', borderRadius: Radius.pill, paddingLeft: 10, paddingRight: 5, paddingVertical: 5 },
  linkChipTitle: { color: '#fff', fontFamily: Font.semibold, fontSize: 12, maxWidth: 120 },
  linkChipPrice: { color: '#FFD98A', fontFamily: Font.bold, fontSize: 12 },
  linkChipCta: { backgroundColor: Afylo.violet, borderRadius: Radius.pill, paddingHorizontal: 12, paddingVertical: 5 },
  linkChipCtaText: { color: '#fff', fontFamily: Font.semibold, fontSize: 12 },
  linkHint: { color: '#ffffff99', fontSize: 13, marginBottom: 10, marginTop: -4 },
  giftBubble: { backgroundColor: '#B8791Fee', borderWidth: 1, borderColor: '#FFD98A' },
  giftText: { color: '#fff', fontFamily: Font.bold },
  sysRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingLeft: 4 },
  sysText: { color: '#ffffffcc', fontSize: 13 },

  bottom: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingBottom: 8 },
  inputBar: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#00000066', borderRadius: Radius.pill, borderWidth: 1, borderColor: '#ffffff33', paddingHorizontal: 16, height: 44, overflow: 'hidden' },
  input: { flex: 1, color: '#fff', fontSize: 15, height: '100%' },
  circleBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#00000055', alignItems: 'center', justifyContent: 'center' },
  sellBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Afylo.violet, paddingHorizontal: 16, height: 44, borderRadius: Radius.pill, marginLeft: 'auto' },
  sellText: { color: '#fff', fontFamily: Font.semibold, fontSize: 14 },
  heartShadow: { textShadowColor: '#00000066', textShadowRadius: 6, textShadowOffset: { width: 0, height: 1 } },

  toast: { position: 'absolute', top: 90, alignSelf: 'center', backgroundColor: '#000000cc', paddingHorizontal: 16, paddingVertical: 10, borderRadius: Radius.pill },
  toastText: { color: '#fff', fontFamily: Font.semibold, fontSize: 13 },

  mOverlay: { flex: 1, backgroundColor: '#00000088', justifyContent: 'flex-end' },
  mSheet: { backgroundColor: '#15151C', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 16, paddingBottom: 28 },
  mHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#ffffff33', alignSelf: 'center', marginBottom: 12 },
  mTitle: { color: '#fff', fontFamily: Font.bold, fontSize: 17, marginBottom: 8 },
  emptyReq: { color: '#ffffff88', fontSize: 14, paddingVertical: 16, textAlign: 'center' },
  salesStats: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff10', borderRadius: 16, paddingVertical: 16, marginBottom: 10 },
  salesStat: { flex: 1, alignItems: 'center' },
  salesStatValue: { color: '#fff', fontFamily: Font.bold, fontSize: 22 },
  salesStatLabel: { color: '#ffffff99', fontSize: 12, marginTop: 2 },
  salesDivider: { width: 1, height: 34, backgroundColor: '#ffffff1f' },
  salesEmpty: { alignItems: 'center', paddingVertical: 30, gap: 8 },
  salesEmptyText: { color: '#fff', fontFamily: Font.semibold, fontSize: 15 },
  salesEmptySub: { color: '#ffffff88', fontSize: 13, textAlign: 'center', paddingHorizontal: 20 },
  saleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: '#ffffff12' },
  saleTitle: { color: '#fff', fontFamily: Font.semibold, fontSize: 14 },
  saleBuyer: { color: '#ffffff99', fontSize: 12, marginTop: 1 },
  salePrice: { color: '#37D67A', fontFamily: Font.bold, fontSize: 14 },
  reqRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  reqName: { color: '#fff', fontFamily: Font.semibold, fontSize: 14 },
  reqSub: { color: '#ffffff99', fontSize: 12, marginTop: 1 },
  reqIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#ffffff22', alignItems: 'center', justifyContent: 'center' },
  reqIconGhost: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#ffffff12', alignItems: 'center', justifyContent: 'center' },
  reqRemove: { paddingHorizontal: 14, height: 34, borderRadius: 17, backgroundColor: '#ffffff18', alignItems: 'center', justifyContent: 'center' },
  reqRemoveText: { color: '#fff', fontFamily: Font.semibold, fontSize: 13 },

  chooserOverlay: { flex: 1, backgroundColor: '#000000aa', alignItems: 'center', justifyContent: 'center', padding: 30 },
  chooserCard: { backgroundColor: Afylo.bg, borderRadius: 24, padding: 24, alignItems: 'center', width: '100%', maxWidth: 360 },
  chooserIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: Afylo.green, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  chooserTitle: { color: Afylo.text, fontFamily: Font.bold, fontSize: 20 },
  chooserSub: { color: Afylo.textDim, fontSize: 14, textAlign: 'center', marginTop: 6, marginBottom: 20 },
  chooserRow: { flexDirection: 'row', gap: 12, alignSelf: 'stretch' },
  chooserBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 20, borderRadius: Radius.lg, backgroundColor: Afylo.surfaceAlt, borderWidth: 1, borderColor: Afylo.border },
  chooserBtnVideo: { backgroundColor: Afylo.violet, borderColor: Afylo.violet },
  chooserBtnText: { color: Afylo.text, fontFamily: Font.bold, fontSize: 15 },
  chooserCancel: { color: Afylo.textDim, fontFamily: Font.semibold, fontSize: 15, marginTop: 18 },
  endBtn: { alignSelf: 'stretch', backgroundColor: Afylo.live, borderRadius: Radius.pill, paddingVertical: 15, alignItems: 'center', marginTop: 22 },
  endBtnText: { color: '#fff', fontFamily: Font.bold, fontSize: 16 },
  endCancel: { marginTop: 4 },

  modOverlay: { flex: 1, backgroundColor: '#00000088', justifyContent: 'center', paddingHorizontal: 30 },
  modSheet: { backgroundColor: Afylo.surface, borderRadius: 20, padding: 16 },
  modWho: { color: Afylo.text, fontFamily: Font.bold, fontSize: 15 },
  modMsg: { color: Afylo.textDim, fontSize: 14, marginTop: 2, marginBottom: 10 },
  modItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  modItemText: { color: Afylo.text, fontFamily: Font.semibold, fontSize: 15 },
  modCancel: { alignItems: 'center', paddingVertical: 12, marginTop: 4 },
  modCancelText: { color: Afylo.textDim, fontFamily: Font.semibold, fontSize: 15 },
});
