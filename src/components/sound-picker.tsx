import { Ionicons } from '@expo/vector-icons';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import * as DocumentPicker from 'expo-document-picker';
import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Afylo, Font, Radius, Type } from '@/constants/brand';
import { searchSounds, type Sound } from '@/lib/sounds';

export function SoundPicker({ visible, onSelect, onClose }: { visible: boolean; onSelect: (s: Sound) => void; onClose: () => void }) {
  const [q, setQ] = useState('');
  const [previewId, setPreviewId] = useState<string | null>(null);
  const list = searchSounds(q);

  // Un seul lecteur partagé : on change sa source selon le son écouté.
  const preview = list.find((s) => s.id === previewId) ?? null;
  const player = useAudioPlayer(preview?.audio ? { uri: preview.audio } : null);
  const status = useAudioPlayerStatus(player);

  useEffect(() => {
    if (preview?.audio) { player.seekTo(0); player.play(); }
    return () => { try { player.pause(); } catch {} };
  }, [previewId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Coupe le son quand la feuille se ferme.
  useEffect(() => { if (!visible) { setPreviewId(null); try { player.pause(); } catch {} } }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  const togglePreview = (s: Sound) => setPreviewId((id) => (id === s.id ? null : s.id));

  const close = () => { setPreviewId(null); onClose(); };

  // Importer un son depuis le téléphone (fichier audio local).
  const importLocal = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({ type: 'audio/*', copyToCacheDirectory: true });
      if (res.canceled || !res.assets?.[0]) return;
      const a = res.assets[0];
      const name = (a.name || 'Mon son').replace(/\.[^.]+$/, '');
      onSelect({ id: `local-${Date.now()}`, title: name, artist: 'Depuis mon téléphone', cover: '', duration: '', uses: '', audio: a.uri });
    } catch {}
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={close}>
      <View style={styles.root}>
        <SafeAreaView edges={['top']} style={{ backgroundColor: Afylo.bg }}>
          <View style={styles.header}>
            <Ionicons name="close" size={26} color={Afylo.text} onPress={close} />
            <Text style={styles.title}>Ajouter un son</Text>
            <View style={{ width: 26 }} />
          </View>
          <View style={styles.searchBox}>
            <Ionicons name="search" size={18} color={Afylo.textDim} />
            <TextInput style={styles.searchInput} value={q} onChangeText={setQ} placeholder="Rechercher un son, un artiste" placeholderTextColor={Afylo.textFaint} autoFocus />
          </View>
        </SafeAreaView>

        <ScrollView contentContainerStyle={{ padding: 12 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {/* Importer un son depuis le téléphone */}
          <Pressable onPress={importLocal} style={styles.importBtn}>
            <View style={styles.importIcon}><Ionicons name="cloud-upload-outline" size={20} color={Afylo.violet} /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>Importer depuis mon téléphone</Text>
              <Text style={styles.meta}>Choisis un fichier audio de ton appareil</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={Afylo.textDim} />
          </Pressable>
          {!q && <Text style={styles.section}>Sons populaires · appuie sur ▶ pour écouter</Text>}
          {list.map((s) => {
            const playing = previewId === s.id;
            return (
              <View key={s.id} style={styles.row}>
                {/* Pochette = bouton écoute */}
                <Pressable onPress={() => togglePreview(s)} style={styles.coverWrap}>
                  <Image source={{ uri: s.cover }} style={styles.cover} contentFit="cover" />
                  <View style={styles.playOverlay}>
                    <Ionicons name={playing && status.playing ? 'pause' : 'play'} size={20} color="#fff" />
                  </View>
                </Pressable>
                <Pressable style={{ flex: 1 }} onPress={() => togglePreview(s)}>
                  <Text style={styles.name} numberOfLines={1}>{s.title}</Text>
                  <Text style={styles.meta} numberOfLines={1}>{s.artist} · {s.duration} · {s.uses}</Text>
                  {playing && <View style={styles.bar}><View style={[styles.barFill, { width: `${Math.min(100, ((status.currentTime || 0) / (status.duration || 1)) * 100)}%` }]} /></View>}
                </Pressable>
                <Pressable onPress={() => onSelect(s)} style={styles.useBtn}><Text style={styles.useText}>Utiliser</Text></Pressable>
              </View>
            );
          })}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Afylo.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 8 },
  title: { ...Type.subtitle, color: Afylo.text },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Afylo.surfaceAlt, borderRadius: Radius.pill, paddingHorizontal: 14, height: 44, marginHorizontal: 12, marginBottom: 6 },
  searchInput: { flex: 1, ...Type.body, fontSize: 15, color: Afylo.text, height: '100%' },
  section: { ...Type.small, fontFamily: Font.semibold, color: Afylo.textDim, marginBottom: 8, marginLeft: 4 },
  importBtn: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 4, marginBottom: 6, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Afylo.border },
  importIcon: { width: 44, height: 44, borderRadius: 10, backgroundColor: Afylo.violet + '18', alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  coverWrap: { width: 52, height: 52, borderRadius: 10, overflow: 'hidden' },
  cover: { width: 52, height: 52, backgroundColor: Afylo.surfaceAlt },
  playOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: '#00000055' },
  name: { ...Type.body, fontFamily: Font.semibold, color: Afylo.text },
  meta: { ...Type.caption, color: Afylo.textDim, marginTop: 2 },
  bar: { height: 3, borderRadius: 2, backgroundColor: Afylo.surfaceAlt, marginTop: 6, overflow: 'hidden' },
  barFill: { height: 3, borderRadius: 2, backgroundColor: Afylo.violet },
  useBtn: { backgroundColor: Afylo.violet, paddingHorizontal: 14, paddingVertical: 8, borderRadius: Radius.pill },
  useText: { color: '#fff', fontFamily: Font.semibold, fontSize: 13 },
});
