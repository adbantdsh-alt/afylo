import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Afylo, Font, Radius } from '@/constants/brand';
import { useAuthGate } from '@/lib/auth-gate';
import { useStories } from '@/lib/stories';

type Mode = 'Publication' | 'Story' | 'Reel' | 'Live';
const MODES: Mode[] = ['Publication', 'Story', 'Reel', 'Live'];

export default function Creer() {
  const router = useRouter();
  const gate = useAuthGate();
  const { addStory } = useStories();

  const [mode, setMode] = useState<Mode>('Publication');
  const [media, setMedia] = useState<{ uri: string; type: 'image' | 'video' } | null>(null);
  const [busy, setBusy] = useState(false);

  const pick = async (kind: 'image' | 'video') => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: kind === 'video' ? ['videos'] : ['images'],
      quality: 1,
    });
    if (!res.canceled) setMedia({ uri: res.assets[0].uri, type: kind });
  };

  const primary = async () => {
    if (!gate(mode === 'Story' ? 'publier une story' : 'publier')) return;
    if (mode === 'Live') {
      // Live à venir (streaming)
      return;
    }
    if (mode === 'Story') {
      if (!media) return pick('image');
      setBusy(true);
      addStory({ type: media.type, uri: media.uri });
      setBusy(false);
      router.replace('/accueil');
      return;
    }
    // Publication / Reel -> compositeur complet (légende + produits)
    router.push(mode === 'Reel' ? '/post-new?kind=video' : '/post-new');
  };

  const isVideoMode = mode === 'Reel';
  const primaryLabel =
    mode === 'Story' ? (media ? 'Publier la story' : 'Choisir un média') : mode === 'Live' ? 'Démarrer le live' : 'Continuer';

  return (
    <View style={styles.root}>
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        {/* En-tête */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <Ionicons name="close" size={28} color="#fff" />
          </Pressable>
          <Text style={styles.title}>Créer</Text>
          <Pressable onPress={primary} hitSlop={10}>
            <Text style={styles.next}>{mode === 'Story' && media ? 'Publier' : mode === 'Publication' || mode === 'Reel' ? 'Suivant' : ''}</Text>
          </Pressable>
        </View>

        {/* Zone média */}
        <Pressable style={styles.stage} onPress={() => pick(isVideoMode ? 'video' : 'image')}>
          {media ? (
            <Image source={{ uri: media.uri }} style={StyleSheet.absoluteFill} contentFit="contain" />
          ) : (
            <View style={styles.stageEmpty}>
              <View style={styles.cameraCircle}>
                <Ionicons name={isVideoMode ? 'videocam' : 'camera'} size={34} color="#fff" />
              </View>
              <Text style={styles.stageHint}>Appuie pour choisir depuis la galerie</Text>
              <Text style={styles.stageSub}>{isVideoMode ? 'Vidéo verticale (Reel)' : mode === 'Story' ? 'Photo ou vidéo · visible 10 h' : 'Photo ou vidéo'}</Text>
            </View>
          )}
        </Pressable>

        {/* Outils galerie / caméra */}
        <View style={styles.tools}>
          <Pressable style={styles.tool} onPress={() => pick('image')}>
            <Ionicons name="images-outline" size={22} color="#fff" />
            <Text style={styles.toolText}>Galerie</Text>
          </Pressable>
          <Pressable style={styles.shutter} onPress={primary}>
            {busy ? <ActivityIndicator color="#fff" /> : media ? <Ionicons name="checkmark" size={30} color="#fff" /> : <Ionicons name="add" size={32} color="#fff" />}
          </Pressable>
          <Pressable style={styles.tool} onPress={() => pick('video')}>
            <Ionicons name="film-outline" size={22} color="#fff" />
            <Text style={styles.toolText}>Vidéo</Text>
          </Pressable>
        </View>

        {/* Onglets de mode */}
        <View style={styles.modes}>
          {MODES.map((m) => (
            <Pressable key={m} onPress={() => setMode(m)}>
              <Text style={[styles.mode, mode === m && styles.modeActive]}>{m.toUpperCase()}</Text>
            </Pressable>
          ))}
        </View>

        {/* Bouton principal */}
        <View style={{ paddingHorizontal: 20 }}>
          <Pressable onPress={primary} style={[styles.cta, mode === 'Live' && { backgroundColor: Afylo.live }]}>
            <Text style={styles.ctaText}>{primaryLabel}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0B0B0F' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10 },
  title: { color: '#fff', fontFamily: Font.bold, fontSize: 18 },
  next: { color: Afylo.violet2, fontFamily: Font.semibold, fontSize: 16, minWidth: 60, textAlign: 'right' },

  stage: { flex: 1, marginHorizontal: 16, borderRadius: 24, overflow: 'hidden', backgroundColor: '#15151C', alignItems: 'center', justifyContent: 'center' },
  stageEmpty: { alignItems: 'center', paddingHorizontal: 24, gap: 8 },
  cameraCircle: { width: 74, height: 74, borderRadius: 37, backgroundColor: '#ffffff1A', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  stageHint: { color: '#fff', fontFamily: Font.semibold, fontSize: 16 },
  stageSub: { color: '#ffffff88', fontSize: 13 },

  tools: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingVertical: 18 },
  tool: { alignItems: 'center', gap: 4, width: 70 },
  toolText: { color: '#ffffffcc', fontSize: 12, fontFamily: Font.medium },
  shutter: { width: 66, height: 66, borderRadius: 33, backgroundColor: Afylo.violet, alignItems: 'center', justifyContent: 'center', borderWidth: 4, borderColor: '#ffffff33' },

  modes: { flexDirection: 'row', justifyContent: 'center', gap: 22, paddingBottom: 14 },
  mode: { color: '#ffffff77', fontFamily: Font.semibold, fontSize: 13, letterSpacing: 0.5 },
  modeActive: { color: '#fff', fontFamily: Font.bold },

  cta: { height: 52, borderRadius: Radius.pill, backgroundColor: Afylo.violet, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  ctaText: { color: '#fff', fontFamily: Font.semibold, fontSize: 16 },
});
