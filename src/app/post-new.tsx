import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SoundPicker } from '@/components/sound-picker';
import { Avatar, PillButton } from '@/components/ui-kit';
import { Afryko, Font, Radius } from '@/constants/brand';
import { useAuth } from '@/lib/auth';
import { createPost, listMyProducts, searchProfiles } from '@/lib/db';
import { face, photo } from '@/lib/mock';
import { classifyText } from '@/lib/moderation';
import { findSound, type Sound } from '@/lib/sounds';
import type { Product, Profile } from '@/types/db';

type Media = { uri: string; type: 'image' | 'video' };
const MAX_MEDIA = 10;
const MAX_PRODUCTS = 5;

export default function PostNew() {
  const router = useRouter();
  const { session } = useAuth();
  const params = useLocalSearchParams<{ kind?: string; uri?: string; uris?: string; soundId?: string; soundTitle?: string }>();

  // ---- Médias (carrousel) ----
  const seed: Media[] = (() => {
    const type: 'image' | 'video' = params.kind === 'video' ? 'video' : 'image';
    const raw = typeof params.uris === 'string' && params.uris ? params.uris.split('|') : typeof params.uri === 'string' && params.uri ? [params.uri] : [];
    return raw.filter(Boolean).map((uri) => ({ uri, type }));
  })();
  const [media, setMedia] = useState<Media[]>(seed);
  const [active, setActive] = useState(0);

  const [caption, setCaption] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sound, setSound] = useState<Sound | null>(
    params.soundId ? findSound(params.soundId) ?? (params.soundTitle ? ({ id: params.soundId, title: params.soundTitle, artist: 'Son', cover: '', duration: '', uses: '', audio: '' } as Sound) : null) : null,
  );
  const [soundOpen, setSoundOpen] = useState(false);

  // ---- Mentions (@) ----
  const [mentionResults, setMentionResults] = useState<Profile[]>([]);
  const mentionQ = useRef<string | null>(null);

  useEffect(() => {
    if (!session) return;
    setLoadingProducts(true);
    listMyProducts().then(setProducts).finally(() => setLoadingProducts(false));
  }, [session]);

  // Récupère les suggestions de mentions quand on tape « @… »
  const onCaptionChange = (text: string) => {
    setCaption(text);
    const m = text.match(/(?:^|\s)@([\w._]{0,20})$/); // @token en fin de saisie
    const q = m ? m[1] : null;
    mentionQ.current = q;
    if (q === null) { setMentionResults([]); return; }
    searchProfiles(q).then((rows) => { if (mentionQ.current === q) setMentionResults(rows.slice(0, 6)); });
  };
  const applyMention = (p: Profile) => {
    const handle = p.handle || (p.display_name || 'user').replace(/\s+/g, '').toLowerCase();
    setCaption((c) => c.replace(/(^|\s)@([\w._]{0,20})$/, `$1@${handle} `));
    mentionQ.current = null;
    setMentionResults([]);
  };

  // ---- Actions média ----
  const addImages = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: MAX_MEDIA - media.length,
      quality: 0.9,
    });
    if (res.canceled) return;
    const next = res.assets.map((a) => ({ uri: a.uri, type: 'image' as const }));
    setMedia((cur) => [...cur, ...next].slice(0, MAX_MEDIA));
  };
  const addVideo = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['videos'], quality: 1 });
    if (res.canceled) return;
    setMedia((cur) => [...cur, { uri: res.assets[0].uri, type: 'video' as const }].slice(0, MAX_MEDIA));
  };
  // Recadrer / remplacer l'image active (ouvre l'éditeur natif de recadrage)
  const cropActive = async () => {
    if (media[active]?.type !== 'image') return;
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, quality: 0.9 });
    if (res.canceled) return;
    setMedia((cur) => cur.map((m, i) => (i === active ? { uri: res.assets[0].uri, type: 'image' } : m)));
  };
  const removeAt = (i: number) => {
    setMedia((cur) => cur.filter((_, idx) => idx !== i));
    setActive((a) => (a >= i && a > 0 ? a - 1 : a));
  };

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < MAX_PRODUCTS) next.add(id);
      return next;
    });
  };

  const publish = async () => {
    setError(null);
    if (!session) { setError('Connecte-toi avec un vrai compte pour publier (le mode invité ne peut pas).'); return; }
    if (!media.length) { setError('Ajoute au moins une photo ou une vidéo.'); return; }
    const verdict = classifyText(caption);
    if (verdict.level === 'blocked') { setError(`🚫 Publication refusée : ${verdict.reason}`); return; }
    setPublishing(true);
    try {
      const finalCaption = [sound ? `🎵 ${sound.title} · ${sound.artist}` : '', caption.trim()].filter(Boolean).join('\n');
      const urls = media.map((m) => m.uri);
      await createPost({
        kind: media[0].type === 'video' ? 'video' : 'image',
        caption: finalCaption || undefined,
        media_url: urls[0],
        media_urls: urls,
        productIds: [...selected],
      });
      router.replace('/accueil');
    } catch (e: any) {
      setError(e.message ?? 'Erreur lors de la publication.');
    } finally {
      setPublishing(false);
    }
  };

  const current = media[active];

  return (
    <View style={styles.root}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: Afryko.bg }}>
        <View style={styles.header}>
          <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/accueil'))} style={styles.hbtn}>
            <Ionicons name="close" size={26} color={Afryko.text} />
          </Pressable>
          <Text style={styles.title}>Nouvelle publication</Text>
          <View style={{ width: 40 }} />
        </View>
      </SafeAreaView>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
          {/* ---- Média / carrousel ---- */}
          {current ? (
            <View style={styles.stage}>
              {current.type === 'video' ? (
                <StageVideo uri={current.uri} />
              ) : (
                <Image source={{ uri: current.uri }} style={StyleSheet.absoluteFill} contentFit="cover" />
              )}

              {media.length > 1 && <View style={styles.counter}><Text style={styles.counterText}>{active + 1}/{media.length}</Text></View>}

              {/* Actions sur l'image active */}
              <View style={styles.stageActions}>
                {current.type === 'image' && (
                  <Pressable onPress={cropActive} style={styles.stageBtn}>
                    <Ionicons name="crop" size={16} color="#fff" />
                    <Text style={styles.stageBtnText}>Recadrer</Text>
                  </Pressable>
                )}
                <Pressable onPress={() => removeAt(active)} style={styles.stageBtn}>
                  <Ionicons name="trash" size={16} color="#fff" />
                  <Text style={styles.stageBtnText}>Retirer</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <View style={styles.empty}>
              <Ionicons name="images-outline" size={34} color={Afryko.textFaint} />
              <Text style={styles.emptyHint}>Ajoute des photos ou une vidéo</Text>
            </View>
          )}

          {/* Pellicule : vignettes + ajouter */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.film}>
            {media.map((m, i) => (
              <Pressable key={`${m.uri}-${i}`} onPress={() => setActive(i)} style={[styles.thumb, i === active && styles.thumbOn]}>
                <Image source={{ uri: m.uri }} style={styles.thumbImg} contentFit="cover" />
                {m.type === 'video' && <View style={styles.thumbVideo}><Ionicons name="play" size={12} color="#fff" /></View>}
                <Pressable onPress={() => removeAt(i)} style={styles.thumbX} hitSlop={6}>
                  <Ionicons name="close" size={12} color="#fff" />
                </Pressable>
              </Pressable>
            ))}
            {media.length < MAX_MEDIA && (
              <Pressable onPress={addImages} style={styles.addTile}>
                <Ionicons name="add" size={26} color={Afryko.violet} />
                <Text style={styles.addTileText}>Photos</Text>
              </Pressable>
            )}
            {media.length < MAX_MEDIA && (
              <Pressable onPress={addVideo} style={styles.addTile}>
                <Ionicons name="videocam" size={22} color={Afryko.violet} />
                <Text style={styles.addTileText}>Vidéo</Text>
              </Pressable>
            )}
          </ScrollView>

          {/* ---- Son (écoutable) ---- */}
          <Pressable onPress={() => setSoundOpen(true)} style={styles.soundBtn}>
            <Ionicons name="musical-notes" size={20} color={sound ? Afryko.violet : Afryko.textDim} />
            <Text style={[styles.soundBtnText, sound && { color: Afryko.text, fontFamily: Font.semibold }]} numberOfLines={1}>
              {sound ? `${sound.title} · ${sound.artist}` : 'Ajouter un son (écoute avant)'}
            </Text>
            {sound ? (
              <Ionicons name="close-circle" size={20} color={Afryko.textFaint} onPress={() => setSound(null)} />
            ) : (
              <Ionicons name="chevron-forward" size={18} color={Afryko.textFaint} />
            )}
          </Pressable>

          {/* ---- Légende + mentions ---- */}
          <TextInput
            style={[styles.input, styles.caption]}
            value={caption}
            onChangeText={onCaptionChange}
            placeholder="Écris une légende…  @ pour mentionner"
            placeholderTextColor={Afryko.textFaint}
            multiline
          />
          {mentionResults.length > 0 && (
            <View style={styles.mentionBox}>
              {mentionResults.map((p) => (
                <Pressable key={p.id} onPress={() => applyMention(p)} style={styles.mentionRow}>
                  <Avatar uri={p.avatar_url || face(p.handle || p.id)} size={34} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.mentionName} numberOfLines={1}>{p.display_name || p.handle}</Text>
                    <Text style={styles.mentionHandle} numberOfLines={1}>@{p.handle}</Text>
                  </View>
                  <Ionicons name="at" size={18} color={Afryko.violet} />
                </Pressable>
              ))}
            </View>
          )}

          {/* ---- Produits (interrupteurs) ---- */}
          <View style={styles.sectionRow}>
            <Ionicons name="pricetags" size={18} color={Afryko.violet} />
            <Text style={styles.section}>Attacher des produits</Text>
            <Text style={styles.count}>{selected.size}/{MAX_PRODUCTS}</Text>
          </View>
          <Text style={styles.sectionHint}>Les produits liés affichent un bouton « Acheter » sur ta publication.</Text>

          {loadingProducts && <ActivityIndicator color={Afryko.violet} style={{ marginTop: 16 }} />}

          {session && !loadingProducts && products.length === 0 && (
            <Pressable onPress={() => router.push('/product-new')} style={styles.emptyProducts}>
              <Ionicons name="add-circle-outline" size={20} color={Afryko.violet} />
              <Text style={styles.emptyProductsText}>Aucun produit — crée-en un d'abord</Text>
            </Pressable>
          )}

          <View style={styles.prodList}>
            {products.map((p) => {
              const on = selected.has(p.id);
              return (
                <Pressable key={p.id} onPress={() => toggle(p.id)} style={[styles.prodChip, on && styles.prodChipOn]}>
                  <Image source={{ uri: p.image_url || photo(`p-${p.id}`, 100, 100) }} style={styles.prodThumb} contentFit="cover" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.prodTitle} numberOfLines={1}>{p.title}</Text>
                    <Text style={styles.prodPrice}>{p.price_cfa.toLocaleString('fr-FR')} F</Text>
                  </View>
                  {/* Interrupteur ON/OFF */}
                  <View style={[styles.switch, on && styles.switchOn]}>
                    <View style={[styles.knob, on && styles.knobOn]} />
                  </View>
                </Pressable>
              );
            })}
          </View>

          {error && <Text style={styles.error}>{error}</Text>}

          <PillButton label="Publier" icon="send" onPress={publish} loading={publishing} style={{ marginTop: 22 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      <SoundPicker visible={soundOpen} onSelect={(s) => { setSound(s); setSoundOpen(false); }} onClose={() => setSoundOpen(false)} />
    </View>
  );
}

function StageVideo({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, (p) => { p.loop = true; p.muted = true; p.play(); });
  return <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="cover" nativeControls={false} />;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Afryko.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 8 },
  hbtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { color: Afryko.text, fontSize: 18, fontFamily: Font.bold },

  stage: { aspectRatio: 4 / 5, borderRadius: Radius.lg, backgroundColor: '#000', overflow: 'hidden' },
  counter: { position: 'absolute', top: 10, right: 10, backgroundColor: '#000000AA', borderRadius: Radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  counterText: { color: '#fff', fontSize: 12, fontFamily: Font.bold },
  stageActions: { position: 'absolute', bottom: 10, left: 10, flexDirection: 'row', gap: 8 },
  stageBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#000000AA', borderRadius: Radius.pill, paddingHorizontal: 12, height: 34 },
  stageBtnText: { color: '#fff', fontSize: 13, fontFamily: Font.semibold },

  empty: { aspectRatio: 4 / 5, borderRadius: Radius.lg, borderWidth: 1.5, borderStyle: 'dashed', borderColor: Afryko.border, backgroundColor: Afryko.surface, alignItems: 'center', justifyContent: 'center', gap: 8 },
  emptyHint: { color: Afryko.textDim, fontSize: 14 },

  film: { gap: 10, paddingVertical: 12 },
  thumb: { width: 62, height: 62, borderRadius: 12, overflow: 'hidden', borderWidth: 2, borderColor: 'transparent', backgroundColor: Afryko.surfaceAlt },
  thumbOn: { borderColor: Afryko.violet },
  thumbImg: { width: '100%', height: '100%' },
  thumbVideo: { position: 'absolute', left: 4, bottom: 4, width: 18, height: 18, borderRadius: 9, backgroundColor: '#000000AA', alignItems: 'center', justifyContent: 'center' },
  thumbX: { position: 'absolute', top: 2, right: 2, width: 18, height: 18, borderRadius: 9, backgroundColor: '#000000AA', alignItems: 'center', justifyContent: 'center' },
  addTile: { width: 62, height: 62, borderRadius: 12, borderWidth: 1.5, borderStyle: 'dashed', borderColor: Afryko.violet, alignItems: 'center', justifyContent: 'center', gap: 2 },
  addTileText: { color: Afryko.violet, fontSize: 11, fontFamily: Font.semibold },

  soundBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: Afryko.surface, borderWidth: 1, borderColor: Afryko.border, borderRadius: Radius.md, paddingHorizontal: 14, height: 50, marginTop: 4 },
  soundBtnText: { flex: 1, color: Afryko.textDim, fontSize: 15, fontFamily: Font.regular },

  input: { backgroundColor: Afryko.surface, borderRadius: Radius.md, borderWidth: 1, borderColor: Afryko.border, color: Afryko.text, fontSize: 15, paddingHorizontal: 14, marginTop: 12 },
  caption: { minHeight: 90, textAlignVertical: 'top', paddingTop: 12, paddingBottom: 12 },

  mentionBox: { backgroundColor: Afryko.surface, borderWidth: 1, borderColor: Afryko.border, borderRadius: Radius.md, marginTop: 6, overflow: 'hidden' },
  mentionRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Afryko.border },
  mentionName: { color: Afryko.text, fontSize: 14, fontFamily: Font.semibold },
  mentionHandle: { color: Afryko.textDim, fontSize: 12 },

  sectionRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 24 },
  section: { color: Afryko.text, fontSize: 16, fontFamily: Font.bold },
  count: { color: Afryko.violet, fontSize: 13, fontWeight: '700', marginLeft: 'auto' },
  sectionHint: { color: Afryko.textDim, fontSize: 13, marginTop: 4, lineHeight: 19 },

  emptyProducts: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Afryko.surface, borderRadius: Radius.md, padding: 14, marginTop: 12, borderWidth: 1, borderColor: Afryko.border },
  emptyProductsText: { color: Afryko.violet, fontWeight: '700', fontSize: 14 },

  prodList: { gap: 10, marginTop: 12 },
  prodChip: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: Afryko.surface, borderRadius: Radius.md, padding: 8, borderWidth: 1.5, borderColor: Afryko.border },
  prodChipOn: { borderColor: Afryko.violet, backgroundColor: '#FBEBE0' },
  prodThumb: { width: 44, height: 44, borderRadius: 8, backgroundColor: Afryko.surfaceAlt },
  prodTitle: { color: Afryko.text, fontSize: 14, fontWeight: '700' },
  prodPrice: { color: Afryko.gold, fontSize: 13, fontWeight: '800', marginTop: 1 },
  switch: { width: 46, height: 28, borderRadius: 14, backgroundColor: Afryko.surfaceAlt, borderWidth: 1, borderColor: Afryko.border, padding: 3, justifyContent: 'center' },
  switchOn: { backgroundColor: Afryko.violet, borderColor: Afryko.violet },
  knob: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff', alignSelf: 'flex-start' },
  knobOn: { alignSelf: 'flex-end' },

  error: { color: Afryko.live, fontSize: 14, marginTop: 16, fontWeight: '600' },
});
