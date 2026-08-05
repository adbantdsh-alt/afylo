import { Ionicons } from '@expo/vector-icons';
import { useAudioPlayer } from 'expo-audio';
import { Image } from 'expo-image';
import { SaveFormat, manipulateAsync } from 'expo-image-manipulator';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEffect, useRef, useState } from 'react';
import { Animated, Image as RNImage, LayoutRectangle, Modal, PanResponder, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SoundPicker } from '@/components/sound-picker';
import { Afylo, Font, Radius } from '@/constants/brand';
import { photo } from '@/lib/mock';
import type { Sound } from '@/lib/sounds';
import type { Product } from '@/types/db';

export type Overlay = {
  id: string;
  kind: 'text' | 'link';
  text: string;
  x: number; // fraction 0..1 du cadre (centre du calque)
  y: number;
  color: string;
  url?: string;
};

export type EditResult = {
  uri: string;
  type: 'image' | 'video';
  overlays: Overlay[];
  muted: boolean;
  sound: Sound | null;
  product: Product | null; // produit attaché (achat direct) — facultatif, manuel
};

const COLORS = ['#FFFFFF', '#111111', '#FF2D55', '#FFD60A', '#34C759', '#0A84FF', '#AF52DE'];
let seq = 0;
const uid = () => `ov${++seq}`;

export function MediaEditor({
  media,
  onClose,
  onContinue,
  ctaLabel = 'Continuer',
  products = [],
  enableProduct = false,
}: {
  media: { uri: string; type: 'image' | 'video' };
  onClose: () => void;
  onContinue: (r: EditResult) => void;
  ctaLabel?: string;
  products?: Product[];
  enableProduct?: boolean;
}) {
  const [uri, setUri] = useState(media.uri);
  const [overlays, setOverlays] = useState<Overlay[]>([]);
  const [muted, setMuted] = useState(false);
  const [sound, setSound] = useState<Sound | null>(null);
  const [soundOpen, setSoundOpen] = useState(false);
  const [product, setProduct] = useState<Product | null>(null);
  const [productOpen, setProductOpen] = useState(false);

  // Édition de texte en cours
  const [draft, setDraft] = useState<{ id: string | null; text: string; color: string; kind: 'text' | 'link'; url: string } | null>(null);
  const [frame, setFrame] = useState<LayoutRectangle | null>(null);
  const [busy, setBusy] = useState(false);

  const isVideo = media.type === 'video';

  // Son ajouté : joué EN BOUCLE par-dessus l'audio original de la vidéo (mixage, on ne coupe pas la vidéo).
  const soundPlayer = useAudioPlayer(sound?.audio ? { uri: sound.audio } : null);
  useEffect(() => {
    if (!sound?.audio) return;
    try { soundPlayer.loop = true; soundPlayer.seekTo(0); soundPlayer.play(); } catch {}
    return () => { try { soundPlayer.pause(); } catch {} };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sound?.audio]);

  const addText = () => setDraft({ id: null, text: '', color: '#FFFFFF', kind: 'text', url: '' });
  const addLink = () => setDraft({ id: null, text: '', color: '#0A84FF', kind: 'link', url: '' });
  const editOverlay = (o: Overlay) => setDraft({ id: o.id, text: o.text, color: o.color, kind: o.kind, url: o.url ?? '' });

  const commitDraft = () => {
    if (!draft) return;
    const text = draft.text.trim();
    if (!text && draft.kind === 'text') { setDraft(null); return; }
    if (draft.kind === 'link' && !draft.url.trim()) { setDraft(null); return; }
    setOverlays((cur) => {
      if (draft.id) return cur.map((o) => (o.id === draft.id ? { ...o, text: text || draft.url, color: draft.color, url: draft.url.trim() || undefined } : o));
      return [...cur, { id: uid(), kind: draft.kind, text: text || draft.url.trim(), x: 0.24, y: 0.4, color: draft.color, url: draft.kind === 'link' ? draft.url.trim() : undefined }];
    });
    setDraft(null);
  };
  const removeOverlay = (id: string) => setOverlays((cur) => cur.filter((o) => o.id !== id));
  const moveOverlay = (id: string, x: number, y: number) => setOverlays((cur) => cur.map((o) => (o.id === id ? { ...o, x, y } : o)));

  // Rogner (image) : recadre centré au ratio choisi
  const crop = async (ratio: number) => {
    if (isVideo) return;
    setBusy(true);
    try {
      const { width, height } = await getSize(uri);
      let cw = width, ch = Math.round(width / ratio);
      if (ch > height) { ch = height; cw = Math.round(height * ratio); }
      const ox = Math.round((width - cw) / 2), oy = Math.round((height - ch) / 2);
      const r = await manipulateAsync(uri, [{ crop: { originX: ox, originY: oy, width: cw, height: ch } }], { compress: 0.9, format: SaveFormat.JPEG });
      setUri(r.uri);
    } catch {}
    setBusy(false);
  };
  const rotate = async () => {
    if (isVideo) return;
    setBusy(true);
    try { const r = await manipulateAsync(uri, [{ rotate: 90 }], { compress: 0.9, format: SaveFormat.JPEG }); setUri(r.uri); } catch {}
    setBusy(false);
  };

  const done = () => onContinue({ uri, type: media.type, overlays, muted, sound, product });

  return (
    <View style={styles.root}>
      {/* Média + calques */}
      <View style={styles.stage} onLayout={(e) => setFrame(e.nativeEvent.layout)}>
        {isVideo ? <EditorVideo uri={uri} muted={muted} onToggleMute={() => setMuted((m) => !m)} /> : <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="contain" />}

        {frame &&
          overlays.map((o) => (
            <DraggableOverlay key={o.id} overlay={o} frame={frame} onMove={moveOverlay} onEdit={() => editOverlay(o)} onRemove={() => removeOverlay(o.id)} />
          ))}
      </View>

      {/* Barre haut : son + fermer */}
      <SafeAreaView edges={['top']} style={styles.top} pointerEvents="box-none">
        <Pressable onPress={onClose} style={styles.topIcon}><Ionicons name="close" size={26} color="#fff" /></Pressable>
        <Pressable onPress={() => setSoundOpen(true)} style={styles.soundChip}>
          <Ionicons name="musical-notes" size={16} color="#fff" />
          <Text style={styles.soundChipText} numberOfLines={1}>{sound ? `${sound.title}` : 'Ajouter un son'}</Text>
        </Pressable>
        <View style={{ width: 44 }} />
      </SafeAreaView>

      {/* Barre outils droite (façon Snap) */}
      <SafeAreaView edges={['top']} style={styles.tools} pointerEvents="box-none">
        <Tool icon="text" onPress={addText} />
        {!isVideo && <Tool icon="crop" onPress={() => crop(1)} label="1:1" />}
        {!isVideo && <Tool icon="crop" onPress={() => crop(4 / 5)} label="4:5" />}
        {!isVideo && <Tool icon="refresh" onPress={rotate} />}
        <Tool icon="musical-note" onPress={() => setSoundOpen(true)} />
        {isVideo && <Tool icon={muted ? 'volume-mute' : 'volume-high'} onPress={() => setMuted((m) => !m)} active={muted} />}
        <Tool icon="link" onPress={addLink} />
        {enableProduct && <Tool icon="pricetag" onPress={() => setProductOpen(true)} active={!!product} />}
      </SafeAreaView>

      {/* Chip produit attaché (achat direct) */}
      {enableProduct && product && (
        <SafeAreaView edges={['bottom']} style={styles.prodChipWrap} pointerEvents="box-none">
          <Pressable onPress={() => setProductOpen(true)} style={styles.prodChip}>
            <Image source={{ uri: product.image_url || photo(`p-${product.id}`, 80, 80) }} style={styles.prodChipImg} contentFit="cover" />
            <Text style={styles.prodChipText} numberOfLines={1}>{product.title} · {(product.promo_cfa ?? product.price_cfa).toLocaleString('fr-FR')} F</Text>
            <Ionicons name="close-circle" size={18} color="#ffffffaa" onPress={() => setProduct(null)} />
          </Pressable>
        </SafeAreaView>
      )}

      {/* CTA */}
      <SafeAreaView edges={['bottom']} style={styles.bottom} pointerEvents="box-none">
        <Pressable onPress={done} style={styles.cta} disabled={busy}>
          <Text style={styles.ctaText}>{ctaLabel}</Text>
          <Ionicons name="arrow-forward" size={20} color="#fff" />
        </Pressable>
      </SafeAreaView>

      {/* Éditeur de texte / lien */}
      {draft && (
        <View style={styles.editorSheet}>
          <SafeAreaView edges={['top']} style={{ flex: 1 }}>
            <View style={styles.editorTop}>
              <Pressable onPress={() => setDraft(null)}><Text style={styles.editorCancel}>Annuler</Text></Pressable>
              <Pressable onPress={commitDraft} style={styles.editorOk}><Text style={styles.editorOkText}>OK</Text></Pressable>
            </View>
            <View style={styles.editorCenter}>
              {draft.kind === 'link' && (
                <TextInput
                  style={styles.linkInput}
                  value={draft.url}
                  onChangeText={(t) => setDraft((d) => (d ? { ...d, url: t } : d))}
                  placeholder="https://…  (lien cliquable)"
                  placeholderTextColor="#ffffff88"
                  autoCapitalize="none"
                  autoFocus
                />
              )}
              <TextInput
                style={[styles.textInput, { color: draft.color }]}
                value={draft.text}
                onChangeText={(t) => setDraft((d) => (d ? { ...d, text: t } : d))}
                placeholder={draft.kind === 'link' ? 'Texte du lien (option)' : 'Écris quelque chose'}
                placeholderTextColor="#ffffff66"
                autoFocus={draft.kind === 'text'}
                multiline
              />
            </View>
            <View style={styles.colorRow}>
              {COLORS.map((c) => (
                <Pressable key={c} onPress={() => setDraft((d) => (d ? { ...d, color: c } : d))} style={[styles.swatch, { backgroundColor: c }, draft.color === c && styles.swatchOn]} />
              ))}
            </View>
          </SafeAreaView>
        </View>
      )}

      <SoundPicker visible={soundOpen} onSelect={(s) => { setSound(s); setSoundOpen(false); }} onClose={() => setSoundOpen(false)} />

      {/* Sélecteur de produit (manuel) — les vrais produits de l'utilisateur */}
      <Modal visible={productOpen} transparent animationType="slide" onRequestClose={() => setProductOpen(false)}>
        <Pressable style={styles.sheetOverlay} onPress={() => setProductOpen(false)}>
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Attacher un produit</Text>
            {products.length === 0 ? (
              <Text style={styles.sheetEmpty}>Aucun produit — crée-en un depuis ta boutique.</Text>
            ) : (
              <ScrollView>
                {products.map((p) => {
                  const on = product?.id === p.id;
                  return (
                    <Pressable key={p.id} onPress={() => { setProduct(on ? null : p); setProductOpen(false); }} style={styles.sheetRow}>
                      <Image source={{ uri: p.image_url || photo(`p-${p.id}`, 80, 80) }} style={styles.sheetImg} contentFit="cover" />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.sheetName} numberOfLines={1}>{p.title}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
                          <Text style={styles.sheetPrice}>{(p.promo_cfa ?? p.price_cfa).toLocaleString('fr-FR')} F</Text>
                          {p.promo_cfa && p.promo_cfa < p.price_cfa ? <Text style={styles.sheetPriceOld}>{p.price_cfa.toLocaleString('fr-FR')} F</Text> : null}
                        </View>
                      </View>
                      <Ionicons name={on ? 'checkmark-circle' : 'add-circle-outline'} size={24} color={on ? Afylo.violet2 : '#fff'} />
                    </Pressable>
                  );
                })}
              </ScrollView>
            )}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

function Tool({ icon, onPress, label, active }: { icon: any; onPress: () => void; label?: string; active?: boolean }) {
  return (
    <Pressable onPress={onPress} style={styles.tool}>
      <Ionicons name={icon} size={24} color={active ? Afylo.violet2 : '#fff'} />
      {label ? <Text style={styles.toolLabel}>{label}</Text> : null}
    </Pressable>
  );
}

function DraggableOverlay({ overlay, frame, onMove, onEdit, onRemove }: { overlay: Overlay; frame: LayoutRectangle; onMove: (id: string, x: number, y: number) => void; onEdit: () => void; onRemove: () => void }) {
  const pan = useRef(new Animated.ValueXY({ x: overlay.x * frame.width, y: overlay.y * frame.height })).current;
  const start = useRef({ x: overlay.x * frame.width, y: overlay.y * frame.height });
  const moved = useRef(false);
  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dx) > 3 || Math.abs(g.dy) > 3,
      onPanResponderGrant: () => { moved.current = false; start.current = { x: (pan.x as any)._value, y: (pan.y as any)._value }; },
      onPanResponderMove: (_e, g) => {
        moved.current = true;
        pan.setValue({ x: clamp(start.current.x + g.dx, 0, frame.width), y: clamp(start.current.y + g.dy, 0, frame.height) });
      },
      onPanResponderRelease: () => {
        const x = clamp((pan.x as any)._value, 0, frame.width) / frame.width;
        const y = clamp((pan.y as any)._value, 0, frame.height) / frame.height;
        onMove(overlay.id, x, y);
        if (!moved.current) onEdit();
      },
    }),
  ).current;

  return (
    <Animated.View style={[styles.overlayBox, { transform: pan.getTranslateTransform() }]} {...responder.panHandlers}>
      <View style={overlay.kind === 'link' ? styles.linkChip : undefined}>
        {overlay.kind === 'link' && <Ionicons name="link" size={14} color="#fff" style={{ marginRight: 4 }} />}
        <Text style={[styles.overlayText, { color: overlay.kind === 'link' ? '#fff' : overlay.color }]}>{overlay.text}</Text>
      </View>
      <Pressable onPress={onRemove} style={styles.overlayX} hitSlop={8}><Ionicons name="close" size={12} color="#fff" /></Pressable>
    </Animated.View>
  );
}

function EditorVideo({ uri, muted, onToggleMute }: { uri: string; muted: boolean; onToggleMute: () => void }) {
  const { width: W, height: H } = useWindowDimensions();
  const player = useVideoPlayer(uri, (p) => { p.loop = true; p.muted = true; p.play(); });
  const [playing, setPlaying] = useState(true);
  const [pos, setPos] = useState(0); // progression 0..1
  const [aspect, setAspect] = useState(9 / 16); // proportion réelle de la vidéo (défaut portrait)
  const [soundOn, setSoundOn] = useState(false); // reflète l'état son réel du player (pour l'icône)
  // web : l'autoplay impose le mute jusqu'à la 1re interaction ; ensuite on respecte le choix son.
  const [interacted, setInteracted] = useState(Platform.OS !== 'web');
  const barW = useRef(0);

  useEffect(() => { try { player.muted = interacted ? muted : true; } catch {} }, [muted, interacted, player]);

  // Suit la progression pour le curseur (polling léger).
  useEffect(() => {
    const t = setInterval(() => {
      try {
        const d = player.duration || 0;
        setPos(d > 0 ? Math.min(1, (player.currentTime || 0) / d) : 0);
        setPlaying(player.playing);
        setSoundOn(!player.muted);
      } catch {}
    }, 150);
    return () => clearInterval(t);
  }, [player]);

  // Web : expo-video ne dimensionne pas toujours la <video> → on lit sa vraie proportion
  // et on force l'élément à remplir son cadre en "contain" (sinon il s'affiche recadré/zoomé).
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    const apply = () => {
      // Cible UNIQUEMENT la vidéo de l'éditeur (les vidéos du feed restent montées en arrière-plan).
      const el = document.querySelector('#afylo-editor-video video') as HTMLVideoElement | null;
      if (el) {
        el.style.width = '100%';
        el.style.height = '100%';
        el.style.objectFit = 'contain';
        if (el.videoWidth > 0 && el.videoHeight > 0) setAspect(el.videoWidth / el.videoHeight);
      }
    };
    apply();
    const t = setInterval(apply, 300);
    return () => clearInterval(t);
  }, []);

  const toggle = () => { setInteracted(true); try { player.playing ? player.pause() : player.play(); } catch {} };
  // 1er tap (web muet par autoplay) → active le son sans inverser le réglage ; ensuite bascule muet/son.
  const tapSound = () => { if (!interacted) { setInteracted(true); return; } onToggleMute(); };
  const seek = (frac: number) => {
    try {
      const d = player.duration || 0;
      if (d > 0) player.currentTime = Math.max(0, Math.min(d, frac * d));
      setPos(Math.max(0, Math.min(1, frac)));
    } catch {}
  };
  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => barW.current > 0 && seek(e.nativeEvent.locationX / barW.current),
      onPanResponderMove: (e) => barW.current > 0 && seek(e.nativeEvent.locationX / barW.current),
    }),
  ).current;

  // Cadre vidéo de taille EXPLICITE (calculée depuis la fenêtre + proportion) → la vidéo tient
  // toujours entière dans la zone dégagée, indépendamment des aléas de layout d'expo-video.
  const TOP = 60, BOTTOM = 104;
  const availH = Math.max(120, H - TOP - BOTTOM);
  const frameW = Math.min(W, availH * aspect);
  const frameH = frameW / aspect;
  const left = (W - frameW) / 2;
  const top = TOP + (availH - frameH) / 2;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Pressable nativeID="afylo-editor-video" onPress={toggle} style={{ position: 'absolute', left, top, width: frameW, height: frameH, backgroundColor: '#000', overflow: 'hidden', borderRadius: 8 }}>
        <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="contain" nativeControls={false} />
        {!playing && (
          <View style={styles.playOverlay} pointerEvents="none">
            <View style={styles.playCircle}><Ionicons name="play" size={34} color="#fff" /></View>
          </View>
        )}
        <Pressable onPress={tapSound} style={styles.soundToggle} hitSlop={8}>
          <Ionicons name={soundOn ? 'volume-high' : 'volume-mute'} size={18} color="#fff" />
        </Pressable>
      </Pressable>
      {/* Curseur de lecture (scrubber) — au-dessus du bouton Continuer */}
      <View style={styles.scrubWrap} pointerEvents="box-none">
        <View style={styles.scrubTrack} onLayout={(e) => (barW.current = e.nativeEvent.layout.width)} {...responder.panHandlers}>
          <View style={[styles.scrubFill, { width: `${pos * 100}%` }]} />
          <View style={[styles.scrubThumb, { left: `${pos * 100}%` }]} />
        </View>
      </View>
    </View>
  );
}

async function getSize(uri: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    RNImage.getSize(uri, (width, height) => resolve({ width, height }), () => resolve({ width: 1080, height: 1080 }));
  });
}
const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  stage: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  videoBox: { position: 'absolute', top: 64, left: 0, right: 0, bottom: 108, backgroundColor: '#000' },
  soundToggle: { position: 'absolute', left: 12, bottom: 12, width: 38, height: 38, borderRadius: 19, backgroundColor: '#00000088', alignItems: 'center', justifyContent: 'center' },
  playOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  playCircle: { width: 68, height: 68, borderRadius: 34, backgroundColor: '#00000066', alignItems: 'center', justifyContent: 'center', paddingLeft: 4 },
  scrubWrap: { position: 'absolute', left: 16, right: 16, bottom: 84, height: 24, justifyContent: 'center' },
  scrubTrack: { height: 4, borderRadius: 2, backgroundColor: '#ffffff44', justifyContent: 'center' },
  scrubFill: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: '#fff', borderRadius: 2 },
  scrubThumb: { position: 'absolute', width: 14, height: 14, borderRadius: 7, backgroundColor: '#fff', marginLeft: -7, shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 3 },
  top: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, gap: 8 },
  topIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#00000055', alignItems: 'center', justifyContent: 'center' },
  soundChip: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, alignSelf: 'center', backgroundColor: '#00000088', borderRadius: Radius.pill, height: 40, paddingHorizontal: 14, maxWidth: 240, marginHorizontal: 'auto' },
  soundChipText: { color: '#fff', fontFamily: Font.semibold, fontSize: 14 },

  tools: { position: 'absolute', top: 64, right: 8, gap: 18, alignItems: 'center' },
  tool: { alignItems: 'center', gap: 2 },
  toolLabel: { color: '#fff', fontSize: 9, fontFamily: Font.semibold },

  prodChipWrap: { position: 'absolute', bottom: 70, left: 0, right: 0, paddingHorizontal: 16, alignItems: 'flex-start' },
  prodChip: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#00000099', borderRadius: Radius.pill, paddingLeft: 6, paddingRight: 12, height: 40, maxWidth: '85%' },
  prodChipImg: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#333' },
  prodChipText: { color: '#fff', fontFamily: Font.semibold, fontSize: 13, flexShrink: 1 },

  sheetOverlay: { flex: 1, backgroundColor: '#00000088', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#15151C', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 16, maxHeight: '60%' },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#ffffff33', alignSelf: 'center', marginBottom: 12 },
  sheetTitle: { color: '#fff', fontFamily: Font.bold, fontSize: 17, marginBottom: 12 },
  sheetEmpty: { color: '#ffffff99', fontSize: 14, paddingVertical: 16 },
  sheetRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  sheetImg: { width: 48, height: 48, borderRadius: 10, backgroundColor: '#222' },
  sheetName: { color: '#fff', fontFamily: Font.semibold, fontSize: 15 },
  sheetPrice: { color: Afylo.gold, fontSize: 13, fontFamily: Font.bold, marginTop: 2 },
  sheetPriceOld: { color: '#ffffff77', fontSize: 11, fontFamily: Font.semibold, textDecorationLine: 'line-through' },

  bottom: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 16, alignItems: 'flex-end' },
  cta: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 50, paddingHorizontal: 22, borderRadius: Radius.pill, backgroundColor: Afylo.violet },
  ctaText: { color: '#fff', fontFamily: Font.bold, fontSize: 16 },

  overlayBox: { position: 'absolute', top: 0, left: 0, minWidth: 40, maxWidth: '80%', alignItems: 'flex-start' },
  overlayText: { fontSize: 24, fontFamily: Font.bold, textShadowColor: '#00000066', textShadowRadius: 4, textAlign: 'center' },
  linkChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0A84FFdd', borderRadius: Radius.pill, paddingHorizontal: 12, paddingVertical: 6 },
  overlayX: { position: 'absolute', top: -10, right: -10, width: 20, height: 20, borderRadius: 10, backgroundColor: '#000000AA', alignItems: 'center', justifyContent: 'center' },

  editorSheet: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#000000E6' },
  editorTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, height: 48 },
  editorCancel: { color: '#fff', fontSize: 16, fontFamily: Font.medium },
  editorOk: { backgroundColor: Afylo.violet, borderRadius: Radius.pill, paddingHorizontal: 18, paddingVertical: 8 },
  editorOkText: { color: '#fff', fontFamily: Font.bold, fontSize: 15 },
  editorCenter: { flex: 1, justifyContent: 'center', paddingHorizontal: 24, gap: 14 },
  textInput: { fontSize: 26, fontFamily: Font.bold, textAlign: 'center' },
  linkInput: { color: '#fff', fontSize: 16, borderBottomWidth: 1, borderBottomColor: '#ffffff44', paddingVertical: 8, textAlign: 'center' },
  colorRow: { flexDirection: 'row', justifyContent: 'center', gap: 12, paddingBottom: 20 },
  swatch: { width: 30, height: 30, borderRadius: 15, borderWidth: 2, borderColor: '#ffffff55' },
  swatchOn: { borderColor: '#fff', transform: [{ scale: 1.15 }] },
});
