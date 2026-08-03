import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, PanResponder, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { withTiming } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MediaEditor, type EditResult } from '@/components/media-editor';
import { Afryko, Font, Radius } from '@/constants/brand';
import { useAuthGate } from '@/lib/auth-gate';
import { listMyProducts, startLive } from '@/lib/db';
import { useMe } from '@/lib/me';
import { useStories } from '@/lib/stories';
import { useTabBar } from '@/lib/tabbar';
import { captureWebFrameDataUrl, captureWebPhoto, startWebRecording, stopWebRecording, unmirrorCameraVideo } from '@/lib/web-recorder';
import type { Product } from '@/types/db';

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
  const [flipFreeze, setFlipFreeze] = useState<string | null>(null); // frame figée pendant la bascule (web)
  const freezeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [media, setMedia] = useState<{ uri: string; type: 'image' | 'video' } | null>(null);
  const [recording, setRecording] = useState(false);
  const [locked, setLocked] = useState(false);
  const [recSecs, setRecSecs] = useState(0);
  const [myProds, setMyProds] = useState<Product[]>([]);

  // Charge les VRAIS produits de l'utilisateur (pour l'attache manuelle dans l'éditeur).
  useEffect(() => {
    listMyProducts().then(setMyProds).catch(() => setMyProds([]));
  }, []);

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

  // Bascule avant/arrière : sur web la caméra se remonte (écran noir) → on fige la dernière
  // frame par-dessus le temps de ré-init, retirée dès que la nouvelle caméra est prête.
  const flip = () => {
    if (Platform.OS === 'web') {
      const frame = captureWebFrameDataUrl();
      if (frame) {
        setFlipFreeze(frame);
        if (freezeTimer.current) clearTimeout(freezeTimer.current);
        freezeTimer.current = setTimeout(() => setFlipFreeze(null), 1500); // filet de sécurité
      }
    }
    setFacing((f) => (f === 'back' ? 'front' : 'back'));
  };
  const lastTap = useRef(0);
  const [focusPt, setFocusPt] = useState<{ x: number; y: number } | null>(null);
  const focusAnim = useRef(new Animated.Value(0)).current;
  const showFocus = (x: number, y: number) => {
    setFocusPt({ x, y });
    focusAnim.setValue(1);
    Animated.timing(focusAnim, { toValue: 0, duration: 700, delay: 300, useNativeDriver: true }).start();
  };
  const onCameraTap = (e: { nativeEvent: { locationX: number; locationY: number } }) => {
    const now = Date.now();
    const { locationX, locationY } = e.nativeEvent;
    showFocus(locationX, locationY); // tap = mise au point (autofocus déclenché + repère visuel)
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

  const takePhoto = async () => {
    // WEB : on capture la frame BRUTE du flux (image telle quelle, jamais en miroir),
    // exactement comme la caméra arrière. Repli sur expo si le flux n'est pas dispo.
    if (Platform.OS === 'web') {
      const shot = await captureWebPhoto();
      if (shot) { setMedia({ uri: shot, type: 'image' }); return; }
    }
    if (!camRef.current) return;
    try {
      const p = await camRef.current.takePictureAsync({ quality: 0.9 });
      if (p?.uri) setMedia({ uri: p.uri, type: 'image' });
    } catch {}
  };

  const beginRecord = async () => {
    if (recordingRef.current) return;
    // WEB : on filme réellement le flux caméra via MediaRecorder (recordAsync n'existe pas sur navigateur).
    if (Platform.OS === 'web') {
      const started = startWebRecording();
      if (!started) { pick('video'); return; } // pas de flux (caméra refusée) → repli galerie
      recordingRef.current = true;
      setRecording(true);
      return;
    }
    if (!camRef.current) return;
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

  const endRecord = async () => {
    if (!recordingRef.current) return;
    if (Platform.OS === 'web') {
      const uri = await stopWebRecording();
      recordingRef.current = false;
      lockedRef.current = false;
      setRecording(false);
      setLocked(false);
      if (uri) setMedia({ uri, type: 'video' });
      return;
    }
    camRef.current?.stopRecording();
  };

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

  // Après l'éditeur : story → publie direct ; sinon → post-new (légende + produits) en transmettant les calques.
  const handleContinue = (res: EditResult) => {
    if (!gate(mode === 'Story' ? 'publier une story' : 'publier')) return;
    if (mode === 'Story') {
      const storyProduct = res.product ? { title: res.product.title, price: `${res.product.price_cfa.toLocaleString('fr-FR')} FCFA` } : undefined;
      addStory({ type: res.type, uri: res.uri }, storyProduct);
      router.replace('/accueil');
    } else {
      router.push({
        pathname: '/post-new',
        params: {
          kind: res.type === 'video' ? 'video' : 'image',
          uri: res.uri,
          overlays: res.overlays.length ? JSON.stringify(res.overlays) : '',
          muted: res.muted ? '1' : '',
          soundId: res.sound?.id ?? '',
          soundTitle: res.sound?.title ?? '',
        },
      });
    }
  };

  const camDenied = permission && !permission.granted;

  // Média capturé → éditeur plein écran (texte, son, musique, rogner, lien).
  if (media) {
    return (
      <View style={styles.root}>
        <MediaEditor
          media={media}
          onClose={() => setMedia(null)}
          onContinue={handleContinue}
          ctaLabel={mode === 'Story' ? 'Publier la story' : 'Continuer'}
          products={myProds}
          enableProduct={mode === 'Story'}
        />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {/* Caméra en PLEIN ÉCRAN */}
      {permission?.granted ? (
        <>
          {/* key={facing} nécessaire pour que le web réacquière bien le flux ; la frame figée
              ci-dessous masque l'écran noir de ré-init le temps que la caméra soit prête. */}
          <CameraView
            key={facing}
            ref={camRef}
            style={StyleSheet.absoluteFill}
            facing={facing}
            mode="video"
            mirror={false}
            autofocus="on"
            onCameraReady={() => {
              if (Platform.OS === 'web') { unmirrorCameraVideo(); setTimeout(unmirrorCameraVideo, 120); } // aperçu non-miroir (front = arrière)
              if (freezeTimer.current) clearTimeout(freezeTimer.current);
              setFlipFreeze(null);
            }}
          />
          {/* Frame figée pendant la bascule (pas d'écran noir) */}
          {flipFreeze && <Image source={{ uri: flipFreeze }} style={StyleSheet.absoluteFill} contentFit="cover" />}
          {/* Tap = focus · Double-tap = retourner la caméra */}
          <Pressable style={StyleSheet.absoluteFill} onPress={onCameraTap} />
          {focusPt && (
            <Animated.View
              pointerEvents="none"
              style={[styles.focusRing, { left: focusPt.x - 36, top: focusPt.y - 36, opacity: focusAnim, transform: [{ scale: focusAnim.interpolate({ inputRange: [0, 1], outputRange: [1.25, 1] }) }] }]}
            />
          )}
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
          <Pressable onPress={flip} style={styles.hIcon} hitSlop={10}>
            <Ionicons name="camera-reverse-outline" size={26} color="#fff" />
          </Pressable>
        </View>

        <View style={{ flex: 1 }} pointerEvents="box-none" />

        {/* ---- Bas : capture ---- */}
        {recording && !locked && (
          <View style={styles.lockHint} pointerEvents="none">
            <Ionicons name="chevron-up" size={16} color="#fff" />
            <Ionicons name="lock-closed" size={14} color="#fff" />
            <Text style={styles.lockHintText}>Glisse pour verrouiller</Text>
          </View>
        )}

        <Text style={styles.captureHint}>
          {mode === 'Live' ? 'Appuie pour passer en direct' : mode === 'Reel' ? 'Maintiens pour filmer ton reel' : 'Appuie = photo · Maintiens = vidéo'}
        </Text>

        <View style={styles.captureRow} pointerEvents="box-none">
          <Pressable style={styles.tool} onPress={() => pick('image')} hitSlop={8}>
            <Ionicons name="images" size={24} color="#fff" />
          </Pressable>

          {/* Déclencheur */}
          {locked ? (
            <Pressable style={[styles.shutterRing, { borderColor: Afryko.live }]} onPress={endRecord}>
              <View style={styles.stopCore} />
            </Pressable>
          ) : (
            <View
              {...shutterPan.panHandlers}
              style={[styles.shutterRing, mode === 'Live' && styles.shutterLive, recording && { borderColor: Afryko.live, transform: [{ scale: 1.15 }] }]}>
              <View style={[styles.shutterCore, mode === 'Live' && styles.shutterCoreLive, recording && styles.shutterCoreRec]} />
            </View>
          )}

          <Pressable style={styles.tool} onPress={() => pick('video')} hitSlop={8}>
            <Ionicons name="film" size={24} color="#fff" />
          </Pressable>
        </View>

        {/* Modes (segmentés) */}
        <View style={styles.modes} pointerEvents="box-none">
          {MODES.map((m) => (
            <Pressable key={m} onPress={() => setMode(m)} style={[styles.modePill, mode === m && styles.modePillOn]} hitSlop={6}>
              <Text style={[styles.mode, mode === m && styles.modeActive]}>{m.toUpperCase()}</Text>
            </Pressable>
          ))}
        </View>
      </SafeAreaView>
    </View>
  );
}

function fmtTime(s: number) {
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, '0')}`;
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

  focusRing: { position: 'absolute', width: 72, height: 72, borderRadius: 10, borderWidth: 1.5, borderColor: '#FFD60A' },

  lockHint: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'center', backgroundColor: '#00000066', paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.pill, marginBottom: 12 },
  lockHintText: { color: '#fff', fontSize: 12, fontFamily: Font.medium },

  captureRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingHorizontal: 40, marginTop: 10 },
  tool: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#00000055', alignItems: 'center', justifyContent: 'center' },
  shutterRing: { width: 82, height: 82, borderRadius: 41, borderWidth: 5, borderColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  shutterLive: { borderColor: Afryko.live },
  shutterCore: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#fff' },
  shutterCoreRec: { backgroundColor: Afryko.live },
  shutterCoreLive: { backgroundColor: Afryko.live },
  stopCore: { width: 30, height: 30, borderRadius: 8, backgroundColor: Afryko.live },
  captureHint: { color: '#ffffffcc', fontSize: 12, textAlign: 'center', marginBottom: 10 },

  modes: { flexDirection: 'row', justifyContent: 'center', gap: 8, paddingTop: 16, paddingBottom: 8 },
  modePill: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: Radius.pill },
  modePillOn: { backgroundColor: '#ffffff1f' },
  mode: { color: '#ffffff99', fontFamily: Font.semibold, fontSize: 12, letterSpacing: 0.5 },
  modeActive: { color: '#fff', fontFamily: Font.bold },
});
