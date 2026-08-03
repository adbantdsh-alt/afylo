import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { FlipType, manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image as RNImage, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Afylo, Font, Radius } from '@/constants/brand';

type Preset = { key: string; label: string; ratio: number | null }; // null = Original
const PRESETS: Preset[] = [
  { key: 'orig', label: 'Original', ratio: null },
  { key: 'sq', label: '1:1', ratio: 1 },
  { key: 'por', label: '4:5', ratio: 0.8 },
  { key: 'land', label: '1.91', ratio: 1.91 },
];

/** Recadrage réel : choix de proportion + rotation, appliqué via image-manipulator. */
export function CropModal({
  visible, uri, onClose, onDone,
}: {
  visible: boolean;
  uri: string | null;
  onClose: () => void;
  onDone: (newUri: string, ratio: number) => void;
}) {
  const [dims, setDims] = useState<{ w: number; h: number } | null>(null);
  const [preset, setPreset] = useState<Preset>(PRESETS[0]);
  const [rotation, setRotation] = useState(0); // 0 / 90 / 180 / 270
  const [flip, setFlip] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!visible || !uri) return;
    setPreset(PRESETS[0]); setRotation(0); setFlip(false); setDims(null);
    RNImage.getSize(uri, (w, h) => setDims({ w, h }), () => setDims({ w: 1, h: 1 }));
  }, [visible, uri]);

  // Dimensions après rotation (largeur/hauteur échangées à 90°/270°)
  const eff = dims ? (rotation % 180 === 0 ? dims : { w: dims.h, h: dims.w }) : null;
  const frameRatio = preset.ratio ?? (eff ? eff.w / eff.h : 1);

  const apply = async () => {
    if (!uri || !dims || !eff) return;
    setBusy(true);
    try {
      const actions: any[] = [];
      if (rotation) actions.push({ rotate: rotation });
      if (flip) actions.push({ flip: FlipType.Horizontal });
      let outRatio = eff.w / eff.h;
      if (preset.ratio) {
        // recadrage centré vers la proportion cible (sur l'image déjà tournée)
        const target = preset.ratio;
        let cw = eff.w, ch = eff.h;
        if (eff.w / eff.h > target) cw = Math.round(eff.h * target);
        else ch = Math.round(eff.w / target);
        const originX = Math.round((eff.w - cw) / 2);
        const originY = Math.round((eff.h - ch) / 2);
        actions.push({ crop: { originX, originY, width: cw, height: ch } });
        outRatio = cw / ch;
      }
      const res = await manipulateAsync(uri, actions, { compress: 0.9, format: SaveFormat.JPEG });
      onDone(res.uri, outRatio);
    } catch {
      // en cas d'échec, on garde l'image telle quelle
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.root}>
        <SafeAreaView edges={['top']}>
          <View style={styles.header}>
            <Pressable onPress={onClose} hitSlop={10}><Ionicons name="close" size={26} color="#fff" /></Pressable>
            <Text style={styles.title}>Recadrer</Text>
            <Pressable onPress={apply} hitSlop={10} disabled={busy}>
              {busy ? <ActivityIndicator color={Afylo.violet2} /> : <Text style={styles.done}>Terminé</Text>}
            </Pressable>
          </View>
        </SafeAreaView>

        {/* Aperçu du cadrage */}
        <View style={styles.stageWrap}>
          {uri && (
            <View style={[styles.frame, { aspectRatio: frameRatio }]}>
              <Image
                source={{ uri }}
                style={[StyleSheet.absoluteFill, { transform: [{ rotate: `${rotation}deg` }, { scaleX: flip ? -1 : 1 }] }]}
                contentFit="cover"
              />
            </View>
          )}
        </View>

        {/* Proportions */}
        <View style={styles.presets}>
          {PRESETS.map((p) => (
            <Pressable key={p.key} onPress={() => setPreset(p)} style={[styles.preset, preset.key === p.key && styles.presetOn]}>
              <Text style={[styles.presetText, preset.key === p.key && { color: '#fff' }]}>{p.label}</Text>
            </Pressable>
          ))}
        </View>

        {/* Outils */}
        <View style={styles.tools}>
          <Pressable onPress={() => setRotation((r) => (r + 90) % 360)} style={styles.tool}>
            <Ionicons name="refresh" size={20} color="#fff" />
            <Text style={styles.toolText}>Pivoter</Text>
          </Pressable>
          <Pressable onPress={() => setFlip((f) => !f)} style={styles.tool}>
            <Ionicons name="swap-horizontal" size={20} color="#fff" />
            <Text style={styles.toolText}>Miroir</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, height: 52 },
  title: { color: '#fff', fontSize: 17, fontFamily: Font.bold },
  done: { color: Afylo.violet2, fontSize: 16, fontFamily: Font.bold },
  stageWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  frame: { width: '100%', maxHeight: '100%', backgroundColor: '#111', borderRadius: 8, overflow: 'hidden' },
  presets: { flexDirection: 'row', justifyContent: 'center', gap: 10, paddingVertical: 14 },
  preset: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: Radius.pill, backgroundColor: '#ffffff1A' },
  presetOn: { backgroundColor: Afylo.violet },
  presetText: { color: '#ffffffcc', fontFamily: Font.semibold, fontSize: 14 },
  tools: { flexDirection: 'row', justifyContent: 'center', gap: 28, paddingBottom: 28, paddingTop: 4 },
  tool: { alignItems: 'center', gap: 4 },
  toolText: { color: '#fff', fontSize: 12, fontFamily: Font.medium },
});
