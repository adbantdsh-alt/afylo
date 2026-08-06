import { Ionicons } from '@expo/vector-icons';
import { AudioModule, RecordingPresets, useAudioPlayer, useAudioRecorder } from 'expo-audio';
import * as DocumentPicker from 'expo-document-picker';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/ui-kit';
import { Afylo, Font, Radius, Type } from '@/constants/brand';
import { canMessage, getProfileByHandle, getThread, listMyProducts, markThreadRead, sendMessage, uploadFile, uploadImage, type Message } from '@/lib/db';
import { useMe } from '@/lib/me';
import { face } from '@/lib/mock';
import type { Product } from '@/types/db';

const fmtTime = (iso: string) => {
  try { const d = new Date(iso); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; } catch { return ''; }
};

export default function Chat() {
  const router = useRouter();
  const me = useMe();
  const params = useLocalSearchParams<{ id: string; name?: string; avatar?: string }>();
  const rawId = params.id;
  const name = params.name || 'Discussion';
  const avatar = params.avatar || face(rawId ?? 'afylo');

  const [rid, setRid] = useState<string | null>(null); // id profil résolu (UUID)
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [blocked, setBlocked] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [myProducts, setMyProducts] = useState<Product[]>([]);
  const [sending, setSending] = useState(false);
  const [attachOpen, setAttachOpen] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  // Enregistrement vocal (expo-audio)
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [recording, setRecording] = useState(false);
  const [recSecs, setRecSecs] = useState(0);
  const recTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const recStart = useRef(0);

  // Résout l'id : un handle (ex. "khady.seck12") → l'UUID du profil
  useEffect(() => {
    if (!rawId) return;
    if (rawId.includes('-') && rawId.length >= 32) { setRid(rawId); return; }
    getProfileByHandle(rawId).then((p) => setRid(p?.id ?? null)).catch(() => setRid(null));
  }, [rawId]);

  const refresh = () => { if (rid) getThread(rid).then((m) => { setMessages(m); markThreadRead(rid).catch(() => {}); }).catch(() => {}); };

  // Chargement + vérif confidentialité + polling (temps réel léger)
  useEffect(() => {
    if (!rid) return;
    setLoading(true);
    canMessage(rid).then((r) => setBlocked(r.ok ? null : r.reason ?? 'Messages désactivés.'));
    refresh();
    setLoading(false);
    listMyProducts().then(setMyProducts).catch(() => {});
    const t = setInterval(refresh, 3500);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rid]);

  useEffect(() => { setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 60); }, [messages.length]);

  const doSend = async (input: { kind?: Message['kind']; text?: string; media_url?: string; product?: any; file_name?: string; duration?: number }) => {
    if (sending || !rid) return;
    setSending(true);
    // optimiste
    const temp: Message = { id: `tmp${Date.now()}`, sender_id: me.id ?? 'me', recipient_id: rid, kind: input.kind ?? 'text', text: input.text ?? null, media_url: input.media_url ?? null, product: input.product ?? null, file_name: input.file_name ?? null, duration: input.duration ?? null, created_at: new Date().toISOString(), read_at: null };
    setMessages((prev) => [...prev, temp]);
    const row = await sendMessage(rid, input);
    if (!row) {
      setMessages((prev) => prev.filter((m) => m.id !== temp.id));
      setBlocked((b) => b ?? "Message non envoyé — ce compte n'accepte pas tes messages.");
    } else {
      setMessages((prev) => prev.map((m) => (m.id === temp.id ? row : m)));
      setBlocked(null);
    }
    setSending(false);
  };

  const sendText = () => { const t = text.trim(); if (!t) return; setText(''); doSend({ kind: 'text', text: t }); };

  const attachImage = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 });
    if (res.canceled) return;
    try { const url = await uploadImage('media', res.assets[0].uri); doSend({ kind: 'image', media_url: url }); } catch {}
  };

  const sendProduct = (p: Product) => {
    setPickerOpen(false);
    doSend({ kind: 'product', product: { id: p.id, title: p.title, price: `${p.price_cfa.toLocaleString('fr-FR')} FCFA`, image: p.image_url || face(p.id) } });
  };

  const attachVideo = async () => {
    setAttachOpen(false);
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['videos'], quality: 0.7 });
    if (res.canceled) return;
    try { const url = await uploadFile(res.assets[0].uri, `video-${Date.now()}.mp4`); doSend({ kind: 'video', media_url: url }); } catch {}
  };

  const attachFile = async () => {
    setAttachOpen(false);
    const res = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });
    if (res.canceled || !res.assets?.[0]) return;
    const f = res.assets[0];
    try { const url = await uploadFile(f.uri, f.name); doSend({ kind: 'file', media_url: url, file_name: f.name }); } catch {}
  };

  // Vocal : appui = démarrer, stop = envoyer, corbeille = annuler
  const startRec = async () => {
    try {
      const perm = await AudioModule.requestRecordingPermissionsAsync();
      if (!perm.granted) return;
      await recorder.prepareToRecordAsync();
      recorder.record();
      recStart.current = Date.now();
      setRecSecs(0);
      setRecording(true);
      recTimer.current = setInterval(() => setRecSecs(Math.floor((Date.now() - recStart.current) / 1000)), 500);
    } catch {}
  };
  const cancelRec = async () => {
    if (recTimer.current) clearInterval(recTimer.current);
    setRecording(false);
    try { await recorder.stop(); } catch {}
  };
  const stopRecAndSend = async () => {
    if (recTimer.current) clearInterval(recTimer.current);
    setRecording(false);
    const dur = Math.max(1, Math.round((Date.now() - recStart.current) / 1000));
    try {
      await recorder.stop();
      const uri = recorder.uri;
      if (uri) { const url = await uploadFile(uri, `voice-${Date.now()}.m4a`); doSend({ kind: 'voice', media_url: url, duration: dur }); }
    } catch {}
  };

  return (
    <View style={styles.root}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: Afylo.surface }}>
        <View style={styles.header}>
          <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/messages'))} style={styles.back}>
            <Ionicons name="chevron-back" size={26} color={Afylo.text} />
          </Pressable>
          <Pressable onPress={() => router.push({ pathname: '/creator/[id]', params: { id: rid ?? rawId, name, avatar } })} style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            <Avatar uri={avatar} size={38} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.name} numberOfLines={1}>{name}</Text>
              <Text style={styles.status}>Appuie pour voir le profil</Text>
            </View>
          </Pressable>
        </View>
      </SafeAreaView>

      <ScrollView ref={scrollRef} contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {loading ? (
          <ActivityIndicator color={Afylo.violet} style={{ marginTop: 30 }} />
        ) : messages.length === 0 ? (
          <Text style={styles.hint}>Envoie le premier message à {name}.</Text>
        ) : (
          messages.map((m) => <Bubble key={m.id} m={m} mine={m.sender_id === me.id} />)
        )}
      </ScrollView>

      {/* Sélecteur de produit (mes vrais produits) */}
      {pickerOpen && (
        <Pressable style={styles.overlay} onPress={() => setPickerOpen(false)}>
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Envoyer un produit</Text>
            {myProducts.length === 0 ? (
              <Text style={styles.hint}>Tu n'as pas encore de produit.</Text>
            ) : (
              <ScrollView>
                {myProducts.map((p) => (
                  <Pressable key={p.id} onPress={() => sendProduct(p)} style={styles.pickRow}>
                    <Image source={{ uri: p.image_url || face(p.id) }} style={styles.pickImg} contentFit="cover" />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.pickTitle} numberOfLines={1}>{p.title}</Text>
                      <Text style={styles.pickPrice}>{p.price_cfa.toLocaleString('fr-FR')} FCFA</Text>
                    </View>
                    <Ionicons name="send" size={18} color={Afylo.violet} />
                  </Pressable>
                ))}
              </ScrollView>
            )}
          </View>
        </Pressable>
      )}

      {/* Menu pièces jointes (façon WhatsApp) */}
      {attachOpen && (
        <Pressable style={styles.overlay} onPress={() => setAttachOpen(false)}>
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <View style={styles.attachGrid}>
              <AttachOption icon="image" color="#8B5CF6" label="Photo" onPress={() => { setAttachOpen(false); attachImage(); }} />
              <AttachOption icon="videocam" color="#EF4444" label="Vidéo" onPress={attachVideo} />
              <AttachOption icon="document" color="#3B82F6" label="Fichier" onPress={attachFile} />
              {/* Envoi de lien produit : réservé aux comptes Pro (vendeurs) */}
              {me.isPro && <AttachOption icon="pricetag" color={Afylo.violet} label="Produit" onPress={() => { setAttachOpen(false); setPickerOpen(true); }} />}
            </View>
          </View>
        </Pressable>
      )}

      {/* Barre de saisie / bandeau confidentialité */}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <SafeAreaView edges={['bottom']} style={{ backgroundColor: Afylo.surface }}>
          {blocked ? (
            <View style={styles.blockedBar}><Ionicons name="lock-closed" size={15} color={Afylo.textDim} /><Text style={styles.blockedText}>{blocked}</Text></View>
          ) : recording ? (
            <View style={styles.inputBar}>
              <Pressable onPress={cancelRec} style={styles.tool}><Ionicons name="trash" size={22} color={Afylo.live} /></Pressable>
              <View style={styles.recPill}>
                <View style={styles.recDot} />
                <Text style={styles.recTime}>{Math.floor(recSecs / 60)}:{String(recSecs % 60).padStart(2, '0')}</Text>
                <Text style={styles.recLabel}>Enregistrement…</Text>
              </View>
              <Pressable onPress={stopRecAndSend} style={styles.send}><Ionicons name="send" size={18} color="#fff" /></Pressable>
            </View>
          ) : (
            <View style={styles.inputBar}>
              <Pressable onPress={() => setAttachOpen(true)} style={styles.tool}><Ionicons name="add-circle" size={28} color={Afylo.violet} /></Pressable>
              <TextInput style={styles.input} value={text} onChangeText={setText} placeholder="Message" placeholderTextColor={Afylo.textFaint} onSubmitEditing={sendText} returnKeyType="send" />
              {text.trim() ? (
                <Pressable onPress={sendText} disabled={sending} style={[styles.send, sending && { opacity: 0.4 }]}><Ionicons name="send" size={18} color="#fff" /></Pressable>
              ) : (
                <Pressable onPress={startRec} style={styles.send}><Ionicons name="mic" size={20} color="#fff" /></Pressable>
              )}
            </View>
          )}
        </SafeAreaView>
      </KeyboardAvoidingView>
    </View>
  );
}

function Bubble({ m, mine }: { m: Message; mine: boolean }) {
  const router = useRouter();
  const align = mine ? styles.right : styles.left;

  if (m.kind === 'product' && m.product) {
    const openProduct = () => m.product?.id && router.push({ pathname: '/product/[id]', params: { id: m.product.id } });
    return (
      <View style={[styles.bubbleWrap, align]}>
        <Pressable style={styles.productCard} onPress={openProduct}>
          <Image source={{ uri: m.product.image }} style={styles.productImg} contentFit="cover" />
          <View style={styles.productBody}>
            <Text style={styles.productTitle} numberOfLines={2}>{m.product.title}</Text>
            <Text style={styles.productPrice}>{m.product.price}</Text>
            <Pressable style={styles.buyBtn} onPress={openProduct}>
              <Ionicons name="bag-handle" size={15} color="#fff" />
              <Text style={styles.buyText}>Acheter maintenant</Text>
            </Pressable>
          </View>
        </Pressable>
      </View>
    );
  }

  if (m.kind === 'image' && m.media_url) {
    return (
      <View style={[styles.bubbleWrap, align]}>
        <View style={styles.mediaBubble}>
          <Image source={{ uri: m.media_url }} style={StyleSheet.absoluteFill} contentFit="cover" />
        </View>
      </View>
    );
  }

  if (m.kind === 'voice' && m.media_url) return <VoiceBubble m={m} mine={mine} />;

  if (m.kind === 'video' && m.media_url) {
    return (
      <View style={[styles.bubbleWrap, align]}>
        <Pressable style={styles.mediaBubble} onPress={() => Linking.openURL(m.media_url!)}>
          <View style={styles.videoBox}><Ionicons name="play-circle" size={54} color="#fff" /></View>
        </Pressable>
      </View>
    );
  }

  if (m.kind === 'file' && m.media_url) {
    return (
      <View style={[styles.bubbleWrap, align]}>
        <Pressable style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs, styles.fileRow]} onPress={() => Linking.openURL(m.media_url!)}>
          <Ionicons name="document" size={26} color={mine ? '#fff' : Afylo.violet} />
          <Text style={[styles.fileName, mine && { color: '#fff' }]} numberOfLines={1}>{m.file_name || 'Fichier'}</Text>
          <Ionicons name="download-outline" size={18} color={mine ? '#ffffffcc' : Afylo.textDim} />
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.bubbleWrap, align]}>
      <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}>
        <Text style={[styles.bubbleText, mine && { color: '#fff' }]}>{m.text}</Text>
        <Text style={[styles.bubbleTime, mine && { color: '#ffffffaa' }]}>{fmtTime(m.created_at)}</Text>
      </View>
    </View>
  );
}

function VoiceBubble({ m, mine }: { m: Message; mine: boolean }) {
  const player = useAudioPlayer(m.media_url ?? undefined);
  const [playing, setPlaying] = useState(false);
  const dur = m.duration ?? 0;
  const toggle = () => {
    if (playing) { try { player.pause(); } catch {} setPlaying(false); }
    else { try { player.seekTo(0); player.play(); } catch {} setPlaying(true); setTimeout(() => setPlaying(false), Math.max(1000, dur * 1000 + 300)); }
  };
  return (
    <View style={[styles.bubbleWrap, mine ? styles.right : styles.left]}>
      <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs, styles.voiceRow]}>
        <Pressable onPress={toggle}><Ionicons name={playing ? 'pause' : 'play'} size={22} color={mine ? '#fff' : Afylo.violet} /></Pressable>
        <View style={[styles.waveform, { backgroundColor: mine ? '#ffffff55' : Afylo.border }]} />
        <Text style={[styles.voiceTime, { color: mine ? '#fff' : Afylo.textDim }]}>{Math.floor(dur / 60)}:{String(Math.round(dur) % 60).padStart(2, '0')}</Text>
      </View>
    </View>
  );
}

function AttachOption({ icon, color, label, onPress }: { icon: keyof typeof Ionicons.glyphMap; color: string; label: string; onPress: () => void }) {
  return (
    <Pressable style={styles.attachOpt} onPress={onPress}>
      <View style={[styles.attachIcon, { backgroundColor: color }]}><Ionicons name={icon} size={24} color="#fff" /></View>
      <Text style={styles.attachLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Afylo.bg },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 6, backgroundColor: Afylo.surface, borderBottomWidth: 1, borderBottomColor: Afylo.border },
  back: { width: 36, height: 40, alignItems: 'center', justifyContent: 'center' },
  name: { ...Type.body, fontFamily: Font.semibold, color: Afylo.text },
  status: { ...Type.caption, color: Afylo.textDim, marginTop: 1 },

  list: { padding: 14, paddingBottom: 20, gap: 8 },
  hint: { color: Afylo.textDim, fontSize: 14, textAlign: 'center', marginTop: 24, paddingHorizontal: 20 },
  bubbleWrap: { maxWidth: '80%' },
  left: { alignSelf: 'flex-start' },
  right: { alignSelf: 'flex-end' },
  bubble: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20 },
  bubbleMine: { backgroundColor: Afylo.violet, borderBottomRightRadius: 6 },
  bubbleTheirs: { backgroundColor: Afylo.surface, borderBottomLeftRadius: 6, borderWidth: 1, borderColor: Afylo.border },
  bubbleText: { ...Type.body, fontSize: 15, color: Afylo.text },
  bubbleTime: { ...Type.caption, fontSize: 10, color: Afylo.textFaint, alignSelf: 'flex-end', marginTop: 3 },

  mediaBubble: { width: 200, height: 240, borderRadius: 20, overflow: 'hidden', backgroundColor: Afylo.surfaceAlt },
  videoBox: { ...StyleSheet.absoluteFillObject, backgroundColor: '#111', alignItems: 'center', justifyContent: 'center' },
  voiceRow: { flexDirection: 'row', alignItems: 'center', gap: 10, minWidth: 170 },
  waveform: { flex: 1, height: 4, borderRadius: 2 },
  voiceTime: { ...Type.caption, fontSize: 11 },
  fileRow: { flexDirection: 'row', alignItems: 'center', gap: 10, minWidth: 180, maxWidth: 240 },
  fileName: { ...Type.body, fontSize: 14, color: Afylo.text, flex: 1 },

  attachGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 18, paddingVertical: 8, justifyContent: 'space-around' },
  attachOpt: { alignItems: 'center', gap: 8, width: 72 },
  attachIcon: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  attachLabel: { ...Type.small, color: Afylo.text },
  recPill: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: Afylo.bg, borderRadius: Radius.pill, paddingHorizontal: 16, height: 42, marginHorizontal: 4 },
  recDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Afylo.live },
  recTime: { ...Type.body, fontSize: 15, color: Afylo.text, fontFamily: Font.semibold },
  recLabel: { ...Type.small, color: Afylo.textDim },

  productCard: { width: 240, backgroundColor: Afylo.surface, borderRadius: 18, overflow: 'hidden', borderWidth: 1, borderColor: Afylo.border },
  productImg: { width: '100%', height: 150, backgroundColor: Afylo.surfaceAlt },
  productBody: { padding: 12 },
  productTitle: { ...Type.body, fontSize: 15, fontFamily: Font.semibold, color: Afylo.text },
  productPrice: { fontFamily: Font.bold, fontSize: 17, color: Afylo.text, marginTop: 4 },
  buyBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: Afylo.violet, borderRadius: Radius.pill, paddingVertical: 11, marginTop: 10 },
  buyText: { fontFamily: Font.semibold, fontSize: 14, color: '#fff' },

  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: '#00000066', justifyContent: 'flex-end', zIndex: 10 },
  sheet: { backgroundColor: Afylo.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 16, maxHeight: '60%' },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: Afylo.border, alignSelf: 'center', marginBottom: 12 },
  sheetTitle: { ...Type.subtitle, color: Afylo.text, marginBottom: 12 },
  pickRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  pickImg: { width: 48, height: 48, borderRadius: 10, backgroundColor: Afylo.surfaceAlt },
  pickTitle: { ...Type.body, fontSize: 15, color: Afylo.text },
  pickPrice: { ...Type.small, color: Afylo.textDim, marginTop: 2 },

  inputBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 8, gap: 4, backgroundColor: Afylo.surface, borderTopWidth: 1, borderTopColor: Afylo.border },
  tool: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  input: { flex: 1, backgroundColor: Afylo.bg, borderRadius: Radius.pill, paddingHorizontal: 16, height: 42, ...Type.body, fontSize: 15, color: Afylo.text, marginHorizontal: 4 },
  send: { width: 42, height: 42, borderRadius: 21, backgroundColor: Afylo.violet, alignItems: 'center', justifyContent: 'center' },
  blockedBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 20, paddingVertical: 16, backgroundColor: Afylo.surface, borderTopWidth: 1, borderTopColor: Afylo.border },
  blockedText: { color: Afylo.textDim, fontSize: 13, textAlign: 'center', flexShrink: 1 },
});
