import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image as RNImage, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CropModal } from '@/components/crop-modal';
import { SoundPicker } from '@/components/sound-picker';
import { Avatar, PillButton } from '@/components/ui-kit';
import { Afylo, Font, Radius } from '@/constants/brand';
import { useAuth } from '@/lib/auth';
import { listMyProducts, searchProfiles } from '@/lib/db';
import { clampRatio } from '@/lib/feed-map';
import { face, photo } from '@/lib/mock';
import { classifyText } from '@/lib/moderation';
import { usePendingUpload } from '@/lib/pending-upload';
import { findSound, type Sound } from '@/lib/sounds';
import type { Product, Profile } from '@/types/db';

type Media = { uri: string; type: 'image' | 'video'; ratio?: number };
const MAX_MEDIA = 10;
const MAX_PRODUCTS = 5;
const ratioOf = (w?: number, h?: number) => (w && h ? clampRatio(w / h) : undefined);

export default function PostNew() {
  const router = useRouter();
  const { session } = useAuth();
  const params = useLocalSearchParams<{ kind?: string; uri?: string; uris?: string; soundId?: string; soundTitle?: string; overlays?: string; muted?: string }>();

  // Calques (texte/lien) venus de l'éditeur façon Snap.
  const overlays = (() => {
    try { return typeof params.overlays === 'string' && params.overlays ? JSON.parse(params.overlays) : []; } catch { return []; }
  })();
  const muted = params.muted === '1';

  // ---- Médias (carrousel) ----
  const seed: Media[] = (() => {
    const type: 'image' | 'video' = params.kind === 'video' ? 'video' : 'image';
    const raw = typeof params.uris === 'string' && params.uris ? params.uris.split('|') : typeof params.uri === 'string' && params.uri ? [params.uri] : [];
    return raw.filter(Boolean).map((uri) => ({ uri, type }));
  })();
  const [media, setMedia] = useState<Media[]>(seed);
  const [active, setActive] = useState(0);
  const [cropOpen, setCropOpen] = useState(false);
  const { publish: publishInBackground } = usePendingUpload();

  const [caption, setCaption] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Résout la proportion des médias qui n'en ont pas encore (venus de la caméra).
  useEffect(() => {
    media.forEach((m, i) => {
      if (m.ratio != null || m.type === 'video') return; // getSize ne marche pas sur une vidéo
      RNImage.getSize(
        m.uri,
        (w, h) => setMedia((cur) => cur.map((x, idx) => (idx === i && x.uri === m.uri ? { ...x, ratio: ratioOf(w, h) } : x))),
        () => {},
      );
    });
  }, [media]);
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
    const next = res.assets.map((a) => ({ uri: a.uri, type: 'image' as const, ratio: ratioOf(a.width, a.height) }));
    setMedia((cur) => [...cur, ...next].slice(0, MAX_MEDIA));
  };
  const addVideo = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['videos'], quality: 1 });
    if (res.canceled) return;
    const a = res.assets[0];
    setMedia((cur) => [...cur, { uri: a.uri, type: 'video' as const, ratio: ratioOf(a.width, a.height) }].slice(0, MAX_MEDIA));
  };
  // Recadrer l'image active (proportion + rotation)
  const cropActive = () => { if (media[active]?.type === 'image') setCropOpen(true); };
  const onCropDone = (uri: string, ratio: number) => {
    setMedia((cur) => cur.map((m, i) => (i === active ? { ...m, uri, ratio: clampRatio(ratio) } : m)));
    setCropOpen(false);
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

  const publish = () => {
    setError(null);
    if (!session) { setError('Connecte-toi avec un vrai compte pour publier (le mode invité ne peut pas).'); return; }
    if (!media.length) { setError('Ajoute au moins une photo ou une vidéo.'); return; }
    const verdict = classifyText(caption);
    if (verdict.level === 'blocked') { setError(`🚫 Publication refusée : ${verdict.reason}`); return; }
    const finalCaption = [sound ? `🎵 ${sound.title} · ${sound.artist}` : '', caption.trim()].filter(Boolean).join('\n');
    // Upload + création en tâche de fond : on revient tout de suite à l'accueil,
    // la barre de progression s'affiche dans le feed jusqu'à la fin de l'envoi.
    publishInBackground({
      media: media.map((m) => ({ uri: m.uri, type: m.type })),
      caption: finalCaption || undefined,
      aspect_ratio: media[0].ratio ?? null,
      productIds: [...selected],
      overlays,
      muted,
    });
    router.replace('/accueil');
  };

  const current = media[active];

  return (
    <View style={styles.root}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: Afylo.bg }}>
        <View style={styles.header}>
          <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/accueil'))} style={styles.hbtn}>
            <Ionicons name="close" size={26} color={Afylo.text} />
          </Pressable>
          <Text style={styles.title}>Nouvelle publication</Text>
          <View style={{ width: 40 }} />
        </View>
      </SafeAreaView>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
          {/* ---- Média / carrousel ---- */}
          {current ? (
            <View style={[styles.stage, { aspectRatio: current.ratio ?? 0.8 }]}>
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
              <Ionicons name="images-outline" size={34} color={Afylo.textFaint} />
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
                <Ionicons name="add" size={26} color={Afylo.violet} />
                <Text style={styles.addTileText}>Photos</Text>
              </Pressable>
            )}
            {media.length < MAX_MEDIA && (
              <Pressable onPress={addVideo} style={styles.addTile}>
                <Ionicons name="videocam" size={22} color={Afylo.violet} />
                <Text style={styles.addTileText}>Vidéo</Text>
              </Pressable>
            )}
          </ScrollView>

          {/* ---- Son (écoutable) ---- */}
          <Pressable onPress={() => setSoundOpen(true)} style={styles.soundBtn}>
            <Ionicons name="musical-notes" size={20} color={sound ? Afylo.violet : Afylo.textDim} />
            <Text style={[styles.soundBtnText, sound && { color: Afylo.text, fontFamily: Font.semibold }]} numberOfLines={1}>
              {sound ? `${sound.title} · ${sound.artist}` : 'Ajouter un son (écoute avant)'}
            </Text>
            {sound ? (
              <Ionicons name="close-circle" size={20} color={Afylo.textFaint} onPress={() => setSound(null)} />
            ) : (
              <Ionicons name="chevron-forward" size={18} color={Afylo.textFaint} />
            )}
          </Pressable>

          {/* ---- Légende + mentions ---- */}
          <TextInput
            style={[styles.input, styles.caption]}
            value={caption}
            onChangeText={onCaptionChange}
            placeholder="Écris une légende…  @ pour mentionner"
            placeholderTextColor={Afylo.textFaint}
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
                  <Ionicons name="at" size={18} color={Afylo.violet} />
                </Pressable>
              ))}
            </View>
          )}

          {/* ---- Produits (interrupteurs) ---- */}
          <View style={styles.sectionRow}>
            <Ionicons name="pricetags" size={18} color={Afylo.violet} />
            <Text style={styles.section}>Attacher des produits</Text>
            <Text style={styles.count}>{selected.size}/{MAX_PRODUCTS}</Text>
          </View>
          <Text style={styles.sectionHint}>Les produits liés affichent un bouton « Acheter » sur ta publication.</Text>

          {loadingProducts && <ActivityIndicator color={Afylo.violet} style={{ marginTop: 16 }} />}

          {session && !loadingProducts && products.length === 0 && (
            <Pressable onPress={() => router.push('/product-new')} style={styles.emptyProducts}>
              <Ionicons name="add-circle-outline" size={20} color={Afylo.violet} />
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
                    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
                      <Text style={styles.prodPrice}>{(p.promo_cfa ?? p.price_cfa).toLocaleString('fr-FR')} F</Text>
                      {p.promo_cfa && p.promo_cfa < p.price_cfa ? <Text style={styles.prodPriceOld}>{p.price_cfa.toLocaleString('fr-FR')} F</Text> : null}
                    </View>
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

          <PillButton label="Publier" icon="send" onPress={publish} style={{ marginTop: 22 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      <SoundPicker visible={soundOpen} onSelect={(s) => { setSound(s); setSoundOpen(false); }} onClose={() => setSoundOpen(false)} />
      <CropModal visible={cropOpen} uri={current?.type === 'image' ? current.uri : null} onClose={() => setCropOpen(false)} onDone={onCropDone} />
    </View>
  );
}

function StageVideo({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, (p) => { p.loop = true; p.muted = true; p.play(); });
  return <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="cover" nativeControls={false} />;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Afylo.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 8 },
  hbtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { color: Afylo.text, fontSize: 18, fontFamily: Font.bold },

  stage: { aspectRatio: 4 / 5, borderRadius: Radius.lg, backgroundColor: '#000', overflow: 'hidden' },
  counter: { position: 'absolute', top: 10, right: 10, backgroundColor: '#000000AA', borderRadius: Radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  counterText: { color: '#fff', fontSize: 12, fontFamily: Font.bold },
  stageActions: { position: 'absolute', bottom: 10, left: 10, flexDirection: 'row', gap: 8 },
  stageBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#000000AA', borderRadius: Radius.pill, paddingHorizontal: 12, height: 34 },
  stageBtnText: { color: '#fff', fontSize: 13, fontFamily: Font.semibold },

  empty: { aspectRatio: 4 / 5, borderRadius: Radius.lg, borderWidth: 1.5, borderStyle: 'dashed', borderColor: Afylo.border, backgroundColor: Afylo.surface, alignItems: 'center', justifyContent: 'center', gap: 8 },
  emptyHint: { color: Afylo.textDim, fontSize: 14 },

  film: { gap: 10, paddingVertical: 12 },
  thumb: { width: 62, height: 62, borderRadius: 12, overflow: 'hidden', borderWidth: 2, borderColor: 'transparent', backgroundColor: Afylo.surfaceAlt },
  thumbOn: { borderColor: Afylo.violet },
  thumbImg: { width: '100%', height: '100%' },
  thumbVideo: { position: 'absolute', left: 4, bottom: 4, width: 18, height: 18, borderRadius: 9, backgroundColor: '#000000AA', alignItems: 'center', justifyContent: 'center' },
  thumbX: { position: 'absolute', top: 2, right: 2, width: 18, height: 18, borderRadius: 9, backgroundColor: '#000000AA', alignItems: 'center', justifyContent: 'center' },
  addTile: { width: 62, height: 62, borderRadius: 12, borderWidth: 1.5, borderStyle: 'dashed', borderColor: Afylo.violet, alignItems: 'center', justifyContent: 'center', gap: 2 },
  addTileText: { color: Afylo.violet, fontSize: 11, fontFamily: Font.semibold },

  soundBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: Afylo.surface, borderWidth: 1, borderColor: Afylo.border, borderRadius: Radius.md, paddingHorizontal: 14, height: 50, marginTop: 4 },
  soundBtnText: { flex: 1, color: Afylo.textDim, fontSize: 15, fontFamily: Font.regular },

  input: { backgroundColor: Afylo.surface, borderRadius: Radius.md, borderWidth: 1, borderColor: Afylo.border, color: Afylo.text, fontSize: 15, paddingHorizontal: 14, marginTop: 12 },
  caption: { minHeight: 90, textAlignVertical: 'top', paddingTop: 12, paddingBottom: 12 },

  mentionBox: { backgroundColor: Afylo.surface, borderWidth: 1, borderColor: Afylo.border, borderRadius: Radius.md, marginTop: 6, overflow: 'hidden' },
  mentionRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Afylo.border },
  mentionName: { color: Afylo.text, fontSize: 14, fontFamily: Font.semibold },
  mentionHandle: { color: Afylo.textDim, fontSize: 12 },

  sectionRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 24 },
  section: { color: Afylo.text, fontSize: 16, fontFamily: Font.bold },
  count: { color: Afylo.violet, fontSize: 13, fontWeight: '700', marginLeft: 'auto' },
  sectionHint: { color: Afylo.textDim, fontSize: 13, marginTop: 4, lineHeight: 19 },

  emptyProducts: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Afylo.surface, borderRadius: Radius.md, padding: 14, marginTop: 12, borderWidth: 1, borderColor: Afylo.border },
  emptyProductsText: { color: Afylo.violet, fontWeight: '700', fontSize: 14 },

  prodList: { gap: 10, marginTop: 12 },
  prodChip: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: Afylo.surface, borderRadius: Radius.md, padding: 8, borderWidth: 1.5, borderColor: Afylo.border },
  prodChipOn: { borderColor: Afylo.violet, backgroundColor: '#FBEBE0' },
  prodThumb: { width: 44, height: 44, borderRadius: 8, backgroundColor: Afylo.surfaceAlt },
  prodTitle: { color: Afylo.text, fontSize: 14, fontWeight: '700' },
  prodPrice: { color: Afylo.gold, fontSize: 13, fontWeight: '800', marginTop: 1 },
  prodPriceOld: { color: Afylo.textFaint, fontSize: 11, fontWeight: '600', textDecorationLine: 'line-through' },
  switch: { width: 46, height: 28, borderRadius: 14, backgroundColor: Afylo.surfaceAlt, borderWidth: 1, borderColor: Afylo.border, padding: 3, justifyContent: 'center' },
  switchOn: { backgroundColor: Afylo.violet, borderColor: Afylo.violet },
  knob: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff', alignSelf: 'flex-start' },
  knobOn: { alignSelf: 'flex-end' },

  error: { color: Afylo.live, fontSize: 14, marginTop: 16, fontWeight: '600' },
});
