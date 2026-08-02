import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import { Image } from 'expo-image';
import { FlipType, manipulateAsync } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Modal, PanResponder, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { withTiming } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Afryko, Font, Radius } from '@/constants/brand';
import { useAuthGate } from '@/lib/auth-gate';
import { startLive } from '@/lib/db';
import { useMe } from '@/lib/me';
import { myProducts } from '@/lib/mock';
import { useStories, type StoryProduct } from '@/lib/stories';
import { useTabBar } from '@/lib/tabbar';

type Mode = 'Publication' | 'Story' | 'Reel' | 'Live';
const MODES: Mode[] = ['Publication', 'Story', 'Reel', 'Live'];

export default function Creer() {
  const router = useRouter();
  const gate = useAuthGate();
  const me = useMe();
  const { addStory } = useStories();
  const { hidden } = useTabBar();

  const [permission, requestPermission] = useCameraPermissions();
  const [micPerm, requestMic] = useMicrophonePermissions();
  const camRef = useRef<CameraView>(null);

  // Autoriser caméra + micro ensemble (le micro est requis pour l'enregistrement vidéo)
  const allowCamera = async () => { await requestPermission(); await requestMic(); };

  const [mode, setMode] = useState<Mode>('Story');
  const [facing, setFacing] = useState<'front' | 'back'>('back');
  const [media, setMedia] = useState<{ uri: string; type: 'image' | 'video' } | null>(null);
  const [recording, setRecording] = useState(false);
  const [locked, setLocked] = useState(false);
  const [recSecs, setRecSecs] = useState(0);
  const [busy, setBusy] = useState(false);
  const [product, setProduct] = useState<StoryProduct | null>(null);
  const [productPicker, setProductPicker] = useState(false);

  // Refs pour les closures du geste (évite les valeurs périmées)
  const recordingRef = useRef(false);
  const lockedRef = useRef(false);
  const modeRef = useRef(mode);
  modeRef.current = mode;
  const pressStart = useRef(0);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Masquer la barre de nav + repartir d'un écran vierge à chaque ouverture
  useFocusEffect(
    useCallback(() => {
      hidden.value = withTiming(1, { duration: 150 });
      setMedia(null);
      return () => {
        hidden.value = withTiming(0, { duration: 150 });
      };
    }, [hidden]),
  );

  // Chrono d'enregistrement
  useEffect(() => {
    if (!recording) { setRecSecs(0); return; }
    const t = setInterval(() => setRecSecs((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [recording]);

  const flip = () => setFacing((f) => (f === 'back' ? 'front' : 'back'));
  const lastTap = useRef(0);
  const onCameraTap = () => {
    const now = Date.now();
    if (now - lastTap.current < 300) flip(); // double-tap = retourner la caméra
    lastTap.current = now;
  };

  const pick = async (kind: 'image' | 'video') => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: kind === 'video' ? ['videos'] : ['images'],
      allowsMultipleSelection: kind === 'image', // plusieurs photos = carrousel
      selectionLimit: 10,
      quality: 1,
    });
    if (res.canceled) return;
    if (kind === 'image' && res.assets.length > 1) {
      // Plusieurs photos → on saute directement à la composition (carrousel)
      const uris = res.assets.map((a) => a.uri).join('|');
      router.push({ pathname: '/post-new', params: { kind: 'image', uris } });
      return;
    }
    setMedia({ uri: res.assets[0].uri, type: kind });
  };

  // La caméra frontale rend un aperçu « miroir » (naturel comme un miroir), mais la photo
  // enregistrée doit rester à l'endroit. On dé-miroite donc la capture frontale sur le web
  // (où le rendu getUserMedia est capturé en miroir). Le natif enregistre déjà à l'endroit.
  const unmirrorIfNeeded = async (uri: string) => {
    if (facing !== 'front' || Platform.OS !== 'web') return uri;
    try {
      const r = await manipulateAsync(uri, [{ flip: FlipType.Horizontal }], { compress: 0.9 });
      return r.uri;
    } catch { return uri; }
  };

  const takePhoto = async () => {
    if (!camRef.current) return;
    try {
      const p = await camRef.current.takePictureAsync({ quality: 0.9 });
      if (p?.uri) setMedia({ uri: await unmirrorIfNeeded(p.uri), type: 'image' });
    } catch {}
  };

  const beginRecord = async () => {
    // Le navigateur ne sait pas filmer via la caméra expo — l'appui long ouvre alors la galerie vidéo.
    if (Platform.OS === 'web') { pick('video'); return; }
    if (!camRef.current || recordingRef.current) return;
    // Le micro est requis pour recordAsync — on le demande si besoin
    if (!micPerm?.granted) { const r = await requestMic(); if (!r?.granted) { /* on enregistre sans son si refusé */ } }
    recordingRef.current = true;
    setRecording(true);
    try {
      const v = await camRef.current.recordAsync({ maxDuration: 60 });
      if (v?.uri) setMedia({ uri: v.uri, type: 'video' });
    } catch {}
    recordingRef.current = false;
    lockedRef.current = false;
    setRecording(false);
    setLocked(false);
  };
  const endRecord = () => { if (recordingRef.current) camRef.current?.stopRecording(); };

  const goLive = async () => {
    if (!gate('passer en live')) return;
    const live = await startLive({ title: `Live · ${me.name}`, kind: me.isPro ? 'sell' : 'simple', thumbnail_url: me.avatar }).catch(() => null);
    router.push({ pathname: '/live', params: { role: 'host', liveId: live?.id ?? '', name: me.name, avatar: me.avatar } });
  };

  // Geste du déclencheur : tap = photo · appui long = vidéo · glisser haut = verrouiller
  const shutterPan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        if (modeRef.current === 'Live') return;
        pressStart.current = Date.now();
        holdTimer.current = setTimeout(() => beginRecord(), 260);
      },
      onPanResponderMove: (_e, g) => {
        if (recordingRef.current && !lockedRef.current && g.dy < -70) { lockedRef.current = true; setLocked(true); }
      },
      onPanResponderRelease: () => {
        if (modeRef.current === 'Live') { goLive(); return; }
        if (holdTimer.current) clearTimeout(holdTimer.current);
        const dur = Date.now() - pressStart.current;
        if (!recordingRef.current && dur < 260) { takePhoto(); return; } // tap rapide = photo
        if (recordingRef.current && !lockedRef.current) endRecord(); // relâché sans verrou = stop
        // verrouillé : l'enregistrement continue jusqu'au bouton Stop
      },
      onPanResponderTerminate: () => { if (holdTimer.current) clearTimeout(holdTimer.current); },
    }),
  ).current;

  const publish = async () => {
    if (!gate(mode === 'Story' ? 'publier une story' : 'publier')) return;
    if (!media) return;
    if (mode === 'Story') {
      setBusy(true);
      addStory({ type: media.type, uri: media.uri }, product ?? undefined);
      setBusy(false);
      router.replace('/accueil');
    } else {
      router.push({ pathname: '/post-new', params: { kind: media.type === 'video' ? 'video' : 'image', uri: media.uri } });
    }
  };

  const camDenied = permission && !permission.granted;

  return (
    <View style={styles.root}>
      {/* Caméra / média en PLEIN ÉCRAN */}
      {media ? (
        <PreviewMedia media={media} />
      ) : permission?.granted ? (
        <>
          <CameraView key={facing} ref={camRef} style={StyleSheet.absoluteFill} facing={facing} mode="video" mirror={facing === 'front'} />
          {/* Double-tap n'importe où = retourner la caméra */}
          <Pressable style={StyleSheet.absoluteFill} onPress={onCameraTap} />
        </>
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.stageEmpty]}>
          <View style={styles.cameraCircle}><Ionicons name="camera" size={34} color="#fff" /></View>
          <Text style={styles.stageHint}>{camDenied ? 'Caméra non autorisée' : 'Active la caméra'}</Text>
          <Pressable onPress={allowCamera} style={styles.allowBtn}><Text style={styles.allowText}>Autoriser caméra & micro</Text></Pressable>
          <Text style={styles.stageSub}>ou choisis depuis la galerie ci-dessous</Text>
        </View>
      )}

      <SafeAreaView style={StyleSheet.absoluteFill} pointerEvents="box-none">
        {/* En-tête */}
        <View style={styles.header} pointerEvents="box-none">
          <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/accueil'))} style={styles.hIcon} hitSlop={10}>
            <Ionicons name="close" size={28} color="#fff" />
          </Pressable>
          {recording ? (
            <View style={styles.recPill}><View style={styles.recDot} /><Text style={styles.recText}>{fmtTime(recSecs)}</Text></View>
          ) : (
            <View />
          )}
          {!media ? (
            <Pressable onPress={flip} style={styles.hIcon} hitSlop={10}>
              <Ionicons name="camera-reverse-outline" size={26} color="#fff" />
            </Pressable>
          ) : (
            <Pressable onPress={() => setMedia(null)} style={styles.hIcon} hitSlop={10}>
              <Ionicons name="refresh" size={24} color="#fff" />
            </Pressable>
          )}
        </View>

        <View style={{ flex: 1 }} pointerEvents="box-none" />

        {/* Produit attaché */}
        <Pressable onPress={() => setProductPicker(true)} style={styles.attachProduct}>
          <Ionicons name="pricetag" size={18} color={product ? Afryko.violet2 : '#ffffffcc'} />
          <Text style={[styles.attachText, product && { color: '#fff' }]} numberOfLines={1}>
            {product ? `${product.title} · ${product.price}` : 'Attacher un produit (achat direct)'}
          </Text>
          {product ? (
            <Ionicons name="close-circle" size={20} color="#ffffff88" onPress={() => setProduct(null)} />
          ) : (
            <Ionicons name="chevron-forward" size={18} color="#ffffff88" />
          )}
        </Pressable>

        {media ? (
          // ---- Aperçu : publier ----
          <View style={styles.previewBar} pointerEvents="box-none">
            <Pressable onPress={publish} style={[styles.publishBtn, mode === 'Live' && { backgroundColor: Afryko.live }]}>
              {busy ? <ActivityIndicator color="#fff" /> : (
                <>
                  <Text style={styles.publishText}>{mode === 'Story' ? 'Publier la story' : 'Continuer'}</Text>
                  <Ionicons name="arrow-forward" size={20} color="#fff" />
                </>
              )}
            </Pressable>
          </View>
        ) : (
          // ---- Capture ----
          <>
            {/* Indice verrouillage pendant l'enregistrement */}
            {recording && !locked && (
              <View style={styles.lockHint} pointerEvents="none">
                <Ionicons name="chevron-up" size={16} color="#fff" />
                <Ionicons name="lock-closed" size={14} color="#fff" />
                <Text style={styles.lockHintText}>Glisse pour verrouiller</Text>
              </View>
            )}

            <View style={styles.captureRow} pointerEvents="box-none">
              <Pressable style={styles.tool} onPress={() => pick('image')} hitSlop={8}>
                <Ionicons name="images" size={26} color="#fff" />
              </Pressable>

              {/* Déclencheur */}
              {locked ? (
                <Pressable style={[styles.shutterRing, { borderColor: Afryko.live }]} onPress={endRecord}>
                  <View style={styles.stopCore} />
                </Pressable>
              ) : (
                <View
                  {...shutterPan.panHandlers}
                  style={[styles.shutterRing, recording && { borderColor: Afryko.live, transform: [{ scale: 1.15 }] }]}>
                  <View style={[styles.shutterCore, recording && styles.shutterCoreRec]} />
                </View>
              )}

              <Pressable style={styles.tool} onPress={() => pick('video')} hitSlop={8}>
                <Ionicons name="film" size={26} color="#fff" />
              </Pressable>
            </View>

            <Text style={styles.captureHint}>
              {mode === 'Live' ? 'Appuie pour passer en direct' : 'Appuie = photo · Reste appuyé = vidéo'}
            </Text>

            {/* Onglets de mode */}
            <View style={styles.modes} pointerEvents="box-none">
              {MODES.map((m) => (
                <Pressable key={m} onPress={() => setMode(m)} hitSlop={6}>
                  <Text style={[styles.mode, mode === m && styles.modeActive]}>{m.toUpperCase()}</Text>
                </Pressable>
              ))}
            </View>
          </>
        )}
      </SafeAreaView>

      {/* Sélecteur de produit */}
      <Modal visible={productPicker} transparent animationType="slide" onRequestClose={() => setProductPicker(false)}>
        <Pressable style={styles.pmOverlay} onPress={() => setProductPicker(false)}>
          <View style={styles.pmSheet}>
            <View style={styles.pmHandle} />
            <Text style={styles.pmTitle}>Attacher un produit</Text>
            <ScrollView>
              {myProducts.map((p) => (
                <Pressable key={p.id} onPress={() => { setProduct({ title: p.title, price: `${p.price} FCFA` }); setProductPicker(false); }} style={styles.pmRow}>
                  <Image source={{ uri: p.image }} style={styles.pmImg} contentFit="cover" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.pmName} numberOfLines={1}>{p.title}</Text>
                    <Text style={styles.pmPrice}>{p.price} FCFA</Text>
                  </View>
                  <Ionicons name="add-circle" size={22} color={Afryko.violet} />
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

function fmtTime(s: number) {
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, '0')}`;
}

function PreviewMedia({ media }: { media: { uri: string; type: 'image' | 'video' } }) {
  if (media.type === 'video') return <PreviewVideo uri={media.uri} />;
  return <Image source={{ uri: media.uri }} style={StyleSheet.absoluteFill} contentFit="cover" />;
}
function PreviewVideo({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, (p) => { p.loop = true; p.play(); });
  return <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="cover" nativeControls={false} />;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000', overflow: 'hidden' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 8, height: 48 },
  hIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#00000055', alignItems: 'center', justifyContent: 'center' },

  stageEmpty: { alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#0B0B0F' },
  cameraCircle: { width: 74, height: 74, borderRadius: 37, backgroundColor: '#ffffff1A', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  stageHint: { color: '#fff', fontFamily: Font.semibold, fontSize: 16 },
  stageSub: { color: '#ffffff88', fontSize: 13, marginTop: 4 },
  allowBtn: { backgroundColor: Afryko.violet, paddingHorizontal: 18, paddingVertical: 10, borderRadius: Radius.pill, marginTop: 8 },
  allowText: { color: '#fff', fontFamily: Font.semibold, fontSize: 14 },

  recPill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#000000AA', paddingHorizontal: 12, paddingVertical: 5, borderRadius: Radius.pill },
  recDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Afryko.live },
  recText: { color: '#fff', fontFamily: Font.bold, fontSize: 12 },

  attachProduct: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 16, marginBottom: 12, backgroundColor: '#00000066', borderRadius: Radius.pill, paddingHorizontal: 16, height: 46 },
  attachText: { flex: 1, color: '#ffffffcc', fontFamily: Font.medium, fontSize: 14 },

  lockHint: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'center', backgroundColor: '#00000066', paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.pill, marginBottom: 12 },
  lockHintText: { color: '#fff', fontSize: 12, fontFamily: Font.medium },

  captureRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingHorizontal: 30 },
  tool: { width: 54, height: 54, borderRadius: 27, backgroundColor: '#00000055', alignItems: 'center', justifyContent: 'center' },
  shutterRing: { width: 82, height: 82, borderRadius: 41, borderWidth: 5, borderColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  shutterCore: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#fff' },
  shutterCoreRec: { backgroundColor: Afryko.live },
  stopCore: { width: 30, height: 30, borderRadius: 8, backgroundColor: Afryko.live },
  captureHint: { color: '#ffffffcc', fontSize: 12, textAlign: 'center', marginTop: 14 },

  modes: { flexDirection: 'row', justifyContent: 'center', gap: 22, paddingTop: 14, paddingBottom: 8 },
  mode: { color: '#ffffff88', fontFamily: Font.semibold, fontSize: 13, letterSpacing: 0.5 },
  modeActive: { color: '#fff', fontFamily: Font.bold },

  previewBar: { paddingHorizontal: 16, paddingBottom: 14 },
  publishBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 54, borderRadius: Radius.pill, backgroundColor: Afryko.violet },
  publishText: { color: '#fff', fontFamily: Font.bold, fontSize: 16 },

  pmOverlay: { flex: 1, backgroundColor: '#00000088', justifyContent: 'flex-end' },
  pmSheet: { backgroundColor: '#15151C', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 16, maxHeight: '60%' },
  pmHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#ffffff33', alignSelf: 'center', marginBottom: 12 },
  pmTitle: { color: '#fff', fontFamily: Font.bold, fontSize: 17, marginBottom: 12 },
  pmRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  pmImg: { width: 48, height: 48, borderRadius: 10, backgroundColor: '#222' },
  pmName: { color: '#fff', fontFamily: Font.semibold, fontSize: 15 },
  pmPrice: { color: '#ffffffaa', fontSize: 13, marginTop: 2 },
});
