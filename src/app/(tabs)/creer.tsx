import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Afylo, Font, Radius } from '@/constants/brand';
import { useAuthGate } from '@/lib/auth-gate';
import { myProducts } from '@/lib/mock';
import { useStories, type StoryProduct } from '@/lib/stories';
import { useTabBar } from '@/lib/tabbar';

type Mode = 'Publication' | 'Story' | 'Reel' | 'Live';
const MODES: Mode[] = ['Publication', 'Story', 'Reel', 'Live'];

export default function Creer() {
  const router = useRouter();
  const gate = useAuthGate();
  const { addStory } = useStories();
  const { hidden } = useTabBar();

  const [permission, requestPermission] = useCameraPermissions();
  const camRef = useRef<CameraView>(null);

  const [mode, setMode] = useState<Mode>('Story');
  const [facing, setFacing] = useState<'front' | 'back'>('back');
  const [media, setMedia] = useState<{ uri: string; type: 'image' | 'video' } | null>(null);
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const [product, setProduct] = useState<StoryProduct | null>(null);
  const [productPicker, setProductPicker] = useState(false);

  // Masquer la barre de nav + repartir d'un écran vierge à chaque ouverture
  useFocusEffect(
    useCallback(() => {
      hidden.value = withTiming(1, { duration: 150 });
      setMedia(null); // ne pas garder l'ancienne capture
      return () => {
        hidden.value = withTiming(0, { duration: 150 });
      };
    }, [hidden]),
  );

  const barStyle = useAnimatedStyle(() => ({ opacity: 1 })); // (placeholder si besoin futur)

  const pick = async (kind: 'image' | 'video') => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: kind === 'video' ? ['videos'] : ['images'], quality: 1 });
    if (!res.canceled) setMedia({ uri: res.assets[0].uri, type: kind });
  };

  const takePhoto = async () => {
    if (!camRef.current) return;
    try {
      const p = await camRef.current.takePictureAsync({ quality: 0.9 });
      if (p?.uri) setMedia({ uri: p.uri, type: 'image' });
    } catch {}
  };

  const startRecord = async () => {
    if (!camRef.current || recording) return;
    setRecording(true);
    try {
      const v = await camRef.current.recordAsync();
      if (v?.uri) setMedia({ uri: v.uri, type: 'video' });
    } catch {}
    setRecording(false);
  };
  const stopRecord = () => {
    if (recording) camRef.current?.stopRecording();
  };

  const publish = async () => {
    if (!gate(mode === 'Story' ? 'publier une story' : mode === 'Live' ? 'passer en live' : 'publier')) return;
    if (mode === 'Live') {
      router.push({ pathname: '/live', params: { role: 'host' } });
      return;
    }
    if (!media) return;
    if (mode === 'Story') {
      setBusy(true);
      addStory({ type: media.type, uri: media.uri }, product ?? undefined);
      setBusy(false);
      router.replace('/accueil');
    } else {
      // Publication / Reel -> compositeur (légende + produits, jusqu'à 5) avec le média capturé
      router.push({ pathname: '/post-new', params: { kind: mode === 'Reel' ? 'video' : 'image', uri: media.uri } });
    }
  };

  const camDenied = permission && !permission.granted;

  return (
    <Animated.View style={[styles.root, barStyle]}>
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        {/* En-tête (sans "Suivant") */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <Ionicons name="close" size={28} color="#fff" />
          </Pressable>
          <Text style={styles.title}>Créer</Text>
          <Pressable onPress={() => setFacing((f) => (f === 'back' ? 'front' : 'back'))} hitSlop={10}>
            <Ionicons name="camera-reverse-outline" size={26} color="#fff" />
          </Pressable>
        </View>

        {/* Zone caméra / média */}
        <View style={styles.stage}>
          {media ? (
            <Image source={{ uri: media.uri }} style={StyleSheet.absoluteFill} contentFit="cover" />
          ) : permission?.granted ? (
            <CameraView key={facing} ref={camRef} style={StyleSheet.absoluteFill} facing={facing} mode="video" />
          ) : (
            <View style={styles.stageEmpty}>
              <View style={styles.cameraCircle}>
                <Ionicons name="camera" size={34} color="#fff" />
              </View>
              <Text style={styles.stageHint}>{camDenied ? 'Caméra non autorisée' : 'Active la caméra'}</Text>
              <Pressable onPress={requestPermission} style={styles.allowBtn}>
                <Text style={styles.allowText}>Autoriser la caméra</Text>
              </Pressable>
              <Text style={styles.stageSub}>ou choisis depuis la galerie ci-dessous</Text>
            </View>
          )}
          {recording && (
            <View style={styles.recPill}>
              <View style={styles.recDot} />
              <Text style={styles.recText}>REC</Text>
            </View>
          )}
          {media && (
            <Pressable onPress={() => setMedia(null)} style={styles.retake}>
              <Ionicons name="refresh" size={18} color="#fff" />
              <Text style={styles.retakeText}>Reprendre</Text>
            </Pressable>
          )}
        </View>

        {/* Barre de capture */}
        <View style={styles.tools}>
          <Pressable style={styles.tool} onPress={() => pick('image')}>
            <Ionicons name="images-outline" size={24} color="#fff" />
            <Text style={styles.toolText}>Galerie</Text>
          </Pressable>

          {media ? (
            <Pressable style={styles.shutter} onPress={publish}>
              {busy ? <ActivityIndicator color="#fff" /> : <Ionicons name="checkmark" size={34} color="#fff" />}
            </Pressable>
          ) : (
            <Pressable
              style={[styles.shutterRing, recording && { borderColor: Afylo.live }]}
              onPress={takePhoto}
              onLongPress={startRecord}
              onPressOut={stopRecord}
              delayLongPress={220}>
              <View style={[styles.shutterCore, recording && styles.shutterCoreRec]} />
            </Pressable>
          )}

          <Pressable style={styles.tool} onPress={() => pick('video')}>
            <Ionicons name="film-outline" size={24} color="#fff" />
            <Text style={styles.toolText}>Vidéo</Text>
          </Pressable>
        </View>
        <Text style={styles.captureHint}>Appuie = photo · Appui long = vidéo</Text>

        {/* Attacher un produit (story ou publication) */}
        <Pressable onPress={() => setProductPicker(true)} style={styles.attachProduct}>
          <Ionicons name="pricetag" size={18} color={product ? Afylo.violet2 : '#ffffffcc'} />
          <Text style={[styles.attachText, product && { color: '#fff' }]} numberOfLines={1}>
            {product ? `${product.title} · ${product.price}` : 'Attacher un produit (achat direct)'}
          </Text>
          {product ? (
            <Ionicons name="close-circle" size={20} color="#ffffff88" onPress={() => setProduct(null)} />
          ) : (
            <Ionicons name="chevron-forward" size={18} color="#ffffff88" />
          )}
        </Pressable>

        {/* Onglets de mode */}
        <View style={styles.modes}>
          {MODES.map((m) => (
            <Pressable key={m} onPress={() => setMode(m)}>
              <Text style={[styles.mode, mode === m && styles.modeActive]}>{m.toUpperCase()}</Text>
            </Pressable>
          ))}
        </View>

        {/* Action */}
        <View style={{ paddingHorizontal: 20, paddingBottom: 10 }}>
          <Pressable onPress={publish} disabled={!media && mode !== 'Live'} style={[styles.cta, (!media && mode !== 'Live') && { opacity: 0.4 }, mode === 'Live' && { backgroundColor: Afylo.live }]}>
            <Text style={styles.ctaText}>
              {mode === 'Live' ? 'Démarrer le live' : mode === 'Story' ? 'Publier la story' : 'Continuer'}
            </Text>
          </Pressable>
        </View>
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
                  <Ionicons name="add-circle" size={22} color={Afylo.violet} />
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0B0B0F' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10 },
  title: { color: '#fff', fontFamily: Font.bold, fontSize: 18 },

  stage: { flex: 1, marginHorizontal: 16, borderRadius: 24, overflow: 'hidden', backgroundColor: '#15151C', alignItems: 'center', justifyContent: 'center' },
  stageEmpty: { alignItems: 'center', paddingHorizontal: 24, gap: 8 },
  cameraCircle: { width: 74, height: 74, borderRadius: 37, backgroundColor: '#ffffff1A', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  stageHint: { color: '#fff', fontFamily: Font.semibold, fontSize: 16 },
  stageSub: { color: '#ffffff88', fontSize: 13, marginTop: 4 },
  allowBtn: { backgroundColor: Afylo.violet, paddingHorizontal: 18, paddingVertical: 10, borderRadius: Radius.pill, marginTop: 8 },
  allowText: { color: '#fff', fontFamily: Font.semibold, fontSize: 14 },
  recPill: { position: 'absolute', top: 12, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#000000AA', paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.pill },
  recDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Afylo.live },
  recText: { color: '#fff', fontFamily: Font.bold, fontSize: 11 },
  retake: { position: 'absolute', top: 12, right: 12, flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#000000AA', paddingHorizontal: 10, paddingVertical: 6, borderRadius: Radius.pill },
  retakeText: { color: '#fff', fontSize: 12, fontFamily: Font.medium },

  tools: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingTop: 16 },
  tool: { alignItems: 'center', gap: 4, width: 70 },
  toolText: { color: '#ffffffcc', fontSize: 12, fontFamily: Font.medium },
  shutter: { width: 72, height: 72, borderRadius: 36, backgroundColor: Afylo.violet, alignItems: 'center', justifyContent: 'center', borderWidth: 4, borderColor: '#ffffff44' },
  shutterRing: { width: 76, height: 76, borderRadius: 38, borderWidth: 5, borderColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  shutterCore: { width: 58, height: 58, borderRadius: 29, backgroundColor: '#fff' },
  shutterCoreRec: { width: 30, height: 30, borderRadius: 8, backgroundColor: Afylo.live },
  captureHint: { color: '#ffffff77', fontSize: 12, textAlign: 'center', marginTop: 10 },

  modes: { flexDirection: 'row', justifyContent: 'center', gap: 22, paddingVertical: 14 },
  mode: { color: '#ffffff77', fontFamily: Font.semibold, fontSize: 13, letterSpacing: 0.5 },
  modeActive: { color: '#fff', fontFamily: Font.bold },

  cta: { height: 52, borderRadius: Radius.pill, backgroundColor: Afylo.violet, alignItems: 'center', justifyContent: 'center' },
  ctaText: { color: '#fff', fontFamily: Font.semibold, fontSize: 16 },

  attachProduct: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 16, marginTop: 12, backgroundColor: '#ffffff14', borderRadius: Radius.pill, paddingHorizontal: 16, height: 46 },
  attachText: { flex: 1, color: '#ffffffcc', fontFamily: Font.medium, fontSize: 14 },

  pmOverlay: { flex: 1, backgroundColor: '#00000088', justifyContent: 'flex-end' },
  pmSheet: { backgroundColor: '#15151C', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 16, maxHeight: '60%' },
  pmHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#ffffff33', alignSelf: 'center', marginBottom: 12 },
  pmTitle: { color: '#fff', fontFamily: Font.bold, fontSize: 17, marginBottom: 12 },
  pmRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  pmImg: { width: 48, height: 48, borderRadius: 10, backgroundColor: '#222' },
  pmName: { color: '#fff', fontFamily: Font.semibold, fontSize: 15 },
  pmPrice: { color: '#ffffffaa', fontSize: 13, marginTop: 2 },
});
