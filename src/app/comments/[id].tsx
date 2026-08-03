import { Ionicons } from '@expo/vector-icons';
import { AudioModule, RecordingPresets, useAudioPlayer, useAudioRecorder } from 'expo-audio';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/ui-kit';
import { GiftSheet } from '@/components/gift-sheet';
import { REACTIONS } from '@/components/rate-sheet';
import { Afryko, Font, Radius, Type } from '@/constants/brand';
import { useAuthGate } from '@/lib/auth-gate';
import { useMe } from '@/lib/me';

type Comment = {
  id: string;
  name: string;
  handle: string;
  avatar: string;
  text: string;
  voice?: string;
  time: string;
  likes: number;
  liked: boolean;
  mine?: boolean; // commentaire de l'utilisateur connecté
  gift?: number; // cadeau offert (FCFA) — l'argent va au créateur (5% Afryko)
  voiceDur?: string; // durée affichée du vocal (voice = uri du fichier audio)
  replies: Comment[];
};

let cid = 0;
const nid = () => `c${++cid}`;

export default function Comments() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string; owner?: string; image?: string; name?: string }>();
  const gate = useAuthGate();
  const authorName = params.name || 'le créateur';
  const [giftOpen, setGiftOpen] = useState(false);
  const meP = useMe();
  const isOwner = params.owner === '1'; // le propriétaire du post peut supprimer n'importe quel commentaire

  const [comments, setComments] = useState<Comment[]>([]);
  const [text, setText] = useState('');
  const [replyTo, setReplyTo] = useState<{ id: string; handle: string } | null>(null);
  const [recording, setRecording] = useState(false);

  const close = () => (router.canGoBack() ? router.back() : router.replace('/accueil'));
  const deleteComment = (id: string) => {
    const rec = (list: Comment[]): Comment[] => list.filter((c) => c.id !== id).map((c) => ({ ...c, replies: rec(c.replies) }));
    setComments(rec);
  };

  // Vrai vocal : maintiens le micro pour enregistrer, relâche pour envoyer.
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recStart = useRef(0);
  const startRec = async () => {
    if (!gate('commenter')) return;
    try {
      const perm = await AudioModule.requestRecordingPermissionsAsync();
      if (!perm.granted) return;
      await recorder.prepareToRecordAsync();
      recorder.record();
      recStart.current = Date.now();
      setRecording(true);
    } catch {}
  };
  const stopRecAndSend = async () => {
    if (!recording) return;
    setRecording(false);
    const secs = Math.max(1, Math.round((Date.now() - recStart.current) / 1000));
    try {
      await recorder.stop();
      const uri = recorder.uri;
      if (!uri) return;
      const me: Comment = { id: nid(), name: meP.name, handle: `@${meP.handle}`, avatar: meP.avatar, text: '', voice: uri, voiceDur: `0:${String(secs).padStart(2, '0')}`, time: 'à l\'instant', likes: 0, liked: false, mine: true, replies: [] };
      setComments((prev) => [me, ...prev]);
    } catch {}
  };

  const toggleLike = (id: string) => {
    if (!gate('réagir')) return;
    const rec = (list: Comment[]): Comment[] =>
      list.map((c) => ({
        ...c,
        liked: c.id === id ? !c.liked : c.liked,
        likes: c.id === id ? c.likes + (c.liked ? -1 : 1) : c.likes,
        replies: rec(c.replies),
      }));
    setComments(rec);
  };

  // Cadeau : l'argent va au créateur (5% Afryko). Apparaît dans le fil.
  const sendGift = (amount: number) => {
    setGiftOpen(false);
    const g: Comment = { id: nid(), name: meP.name, handle: `@${meP.handle}`, avatar: meP.avatar, text: `a offert ${amount.toLocaleString('fr-FR')} FCFA à ${authorName}`, gift: amount, time: 'à l\'instant', likes: 0, liked: false, mine: true, replies: [] };
    setComments((prev) => [g, ...prev]);
  };

  const send = () => {
    if (!text.trim()) return;
    if (!gate('commenter')) return;
    const me: Comment = { id: nid(), name: meP.name, handle: `@${meP.handle}`, avatar: meP.avatar, text: text.trim(), time: 'à l\'instant', likes: 0, liked: false, mine: true, replies: [] };
    if (replyTo) {
      setComments((prev) => prev.map((c) => (c.id === replyTo.id ? { ...c, replies: [...c.replies, me] } : c)));
    } else {
      setComments((prev) => [me, ...prev]);
    }
    setText('');
    setReplyTo(null);
  };

  return (
    <View style={styles.overlay}>
      {/* Façon TikTok : sur mobile l'écran du dessous (la vidéo) reste visible ET
          en lecture derrière le panneau transparent. Sur le web (pas de
          compositing inter-écrans), on affiche l'image du post en repli. */}
      {/* Zone du haut : l'image reste ENTIÈREMENT visible (contain, pas de rognage/zoom).
          Tap = fermer. Sur mobile (transparent), l'écran du dessous reste visible. */}
      {Platform.OS === 'web' && params.image ? (
        <Pressable style={styles.topMedia} onPress={close}>
          <Image source={{ uri: params.image }} style={StyleSheet.absoluteFill} contentFit="contain" transition={150} />
        </Pressable>
      ) : (
        <Pressable style={{ flex: 1 }} onPress={close} />
      )}

      <View style={styles.sheet}>
        <View style={styles.grip} />
        <View style={styles.header}>
          <Text style={styles.title}>{comments.length} commentaires</Text>
          <Ionicons name="close" size={24} color={Afryko.text} onPress={() => (router.canGoBack() ? router.back() : router.replace('/accueil'))} />
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 12 }} showsVerticalScrollIndicator={false}>
          {comments.map((c) => (
            <CommentRow key={c.id} c={c} isOwner={isOwner} onLike={toggleLike} onReply={(t) => setReplyTo(t)} onDelete={deleteComment} />
          ))}
        </ScrollView>

        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <SafeAreaView edges={['bottom']} style={styles.inputSheet}>
            {replyTo && (
              <View style={styles.replyBanner}>
                <Text style={styles.replyText}>Réponse à {replyTo.handle}</Text>
                <Ionicons name="close" size={18} color={Afryko.textDim} onPress={() => setReplyTo(null)} />
              </View>
            )}
            {recording && (
              <View style={styles.recBanner}>
                <View style={styles.recDot} />
                <Text style={styles.recText}>Enregistrement… relâche pour envoyer</Text>
              </View>
            )}
            <View style={styles.inputBar}>
              <Avatar uri={meP.avatar} size={34} />
              <TextInput
                style={styles.input}
                value={text}
                onChangeText={setText}
                placeholder={replyTo ? `Répondre à ${replyTo.handle}` : 'Ajoute un commentaire...'}
                placeholderTextColor={Afryko.textFaint}
                onSubmitEditing={send}
              />
              <Pressable onPress={() => { if (gate('offrir un cadeau')) setGiftOpen(true); }} style={styles.giftBtn}>
                <Ionicons name="gift" size={22} color={Afryko.gold} />
              </Pressable>
              {text.trim() ? (
                <Pressable onPress={send} style={styles.send}>
                  <Ionicons name="send" size={18} color="#fff" />
                </Pressable>
              ) : (
                <Pressable onLongPress={startRec} delayLongPress={200} onPressOut={stopRecAndSend} style={[styles.send, recording && { backgroundColor: Afryko.live }]}>
                  <Ionicons name={recording ? 'radio-button-on' : 'mic'} size={20} color="#fff" />
                </Pressable>
              )}
            </View>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </View>

      <GiftSheet visible={giftOpen} host={authorName} onClose={() => setGiftOpen(false)} onSent={sendGift} />
    </View>
  );
}

/** Note vocale jouable (vrai enregistrement). */
function VoiceNote({ uri, dur }: { uri: string; dur: string }) {
  const player = useAudioPlayer(uri);
  const [playing, setPlaying] = useState(false);
  const toggle = () => {
    if (playing) { player.pause(); setPlaying(false); }
    else { try { player.seekTo(0); } catch {} player.play(); setPlaying(true); }
  };
  return (
    <Pressable style={styles.voiceNote} onPress={toggle}>
      <Ionicons name={playing ? 'pause' : 'play'} size={15} color="#fff" />
      <View style={styles.voiceWave} />
      <Text style={styles.voiceDur}>{dur}</Text>
    </Pressable>
  );
}

function CommentRow({ c, isOwner, onLike, onReply, onDelete, depth = 0 }: { c: Comment; isOwner: boolean; onLike: (id: string) => void; onReply: (t: { id: string; handle: string }) => void; onDelete: (id: string) => void; depth?: number }) {
  const [reaction, setReaction] = useState<string | null>(null);
  const [picker, setPicker] = useState(false);
  const canDelete = isOwner || !!c.mine; // propriétaire du post OU auteur du commentaire

  return (
    <View style={{ marginLeft: depth * 44, marginBottom: 16 }}>
      <View style={{ flexDirection: 'row' }}>
        <Avatar uri={c.avatar} size={depth ? 30 : 38} />
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={styles.cName}>{c.name} <Text style={styles.cTime}>· {c.time}</Text></Text>
          {c.voice ? (
            <VoiceNote uri={c.voice} dur={c.voiceDur ?? ''} />
          ) : c.gift ? (
            <View style={styles.giftNote}>
              <Ionicons name="gift" size={15} color={Afryko.gold} />
              <Text style={styles.giftNoteText}>{c.text}</Text>
            </View>
          ) : (
            <Text style={styles.cText}>{c.text}</Text>
          )}
          <View style={styles.cActions}>
            <Pressable onPress={() => onReply({ id: c.id, handle: c.handle })}>
              <Text style={styles.cReply}>Répondre</Text>
            </Pressable>
            <Pressable onPress={() => setPicker((p) => !p)}>
              <Text style={styles.cReply}>Réagir</Text>
            </Pressable>
            {canDelete && (
              <Pressable onPress={() => onDelete(c.id)}>
                <Text style={[styles.cReply, { color: Afryko.live }]}>Supprimer</Text>
              </Pressable>
            )}
            {reaction && <Text style={{ fontSize: 15 }}>{reaction}</Text>}
          </View>
          {picker && (
            <View style={styles.picker}>
              {REACTIONS.map((e) => (
                <Pressable key={e} onPress={() => { setReaction((r) => (r === e ? null : e)); setPicker(false); onLike(c.id); }}>
                  <Text style={styles.pickerEmoji}>{e}</Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>
        <Pressable onPress={() => onLike(c.id)} style={styles.cLike}>
          <Ionicons name={c.liked ? 'star' : 'star-outline'} size={17} color={c.liked ? Afryko.gold : Afryko.textDim} />
          {c.likes > 0 && <Text style={styles.cLikeCount}>{c.likes}</Text>}
        </Pressable>
      </View>
      {c.replies.map((r) => (
        <View key={r.id} style={{ marginTop: 14 }}>
          <CommentRow c={r} isOwner={isOwner} onLike={onLike} onReply={onReply} onDelete={onDelete} depth={depth + 1} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  giftBtn: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  giftNote: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Afryko.gold + '1A', borderWidth: 1, borderColor: Afryko.gold + '55', borderRadius: Radius.md, paddingHorizontal: 10, paddingVertical: 7, marginTop: 4, alignSelf: 'flex-start' },
  giftNoteText: { color: Afryko.gold, fontFamily: Font.bold, fontSize: 13 },
  overlay: { flex: 1, backgroundColor: 'transparent', justifyContent: 'flex-end' },
  topMedia: { flex: 1 },
  sheet: { height: '60%', backgroundColor: Afryko.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden' },
  grip: { width: 40, height: 4, borderRadius: 2, backgroundColor: Afryko.border, alignSelf: 'center', marginTop: 10 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Afryko.border },
  title: { ...Type.subtitle, color: Afryko.text },
  recBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 8 },
  recDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: Afryko.live },
  recText: { ...Type.small, color: Afryko.live, fontFamily: Font.semibold },
  voiceNote: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: Afryko.violet, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 9, marginTop: 4, alignSelf: 'flex-start', minWidth: 150 },
  voiceWave: { flex: 1, height: 3, borderRadius: 2, backgroundColor: '#ffffff66' },
  voiceDur: { color: '#fff', ...Type.caption, fontFamily: Font.semibold },

  cName: { ...Type.small, fontFamily: Font.semibold, color: Afryko.text },
  cTime: { ...Type.caption, color: Afryko.textFaint, fontFamily: Font.regular },
  cText: { ...Type.body, fontSize: 15, color: Afryko.text, marginTop: 3 },
  cActions: { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 6 },
  cReply: { ...Type.caption, fontFamily: Font.semibold, color: Afryko.textDim },
  picker: { flexDirection: 'row', gap: 10, marginTop: 8, backgroundColor: Afryko.surface, borderWidth: 1, borderColor: Afryko.border, borderRadius: Radius.pill, paddingHorizontal: 12, paddingVertical: 6, alignSelf: 'flex-start' },
  pickerEmoji: { fontSize: 22 },
  cLike: { alignItems: 'center', paddingLeft: 8, gap: 2 },
  cLikeCount: { ...Type.caption, color: Afryko.textDim },

  replyBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 8, backgroundColor: Afryko.bg, borderTopWidth: 1, borderTopColor: Afryko.border },
  replyText: { ...Type.caption, color: Afryko.textDim },
  inputSheet: { backgroundColor: Afryko.glass, overflow: 'hidden', borderTopWidth: 1, borderTopColor: Afryko.glassBorder },
  inputBar: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 8 },
  input: { flex: 1, backgroundColor: Afryko.bg, borderRadius: Radius.pill, paddingHorizontal: 16, height: 40, ...Type.body, fontSize: 15, color: Afryko.text },
  send: { width: 40, height: 40, borderRadius: 20, backgroundColor: Afryko.violet, alignItems: 'center', justifyContent: 'center' },
});
