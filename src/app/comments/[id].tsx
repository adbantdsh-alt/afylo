import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/ui-kit';
import { REACTIONS } from '@/components/rate-sheet';
import { Afryko, Font, Radius, Type } from '@/constants/brand';
import { useAuthGate } from '@/lib/auth-gate';
import { useMe } from '@/lib/me';
import { avatar } from '@/lib/mock';

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
  replies: Comment[];
};

let cid = 0;
const nid = () => `c${++cid}`;

const seed: Comment[] = [
  { id: nid(), name: 'Awa Sow', handle: '@awa.sow', avatar: avatar(9), text: 'Trop belle cette tenue 😍 elle coûte combien ?', time: '12 min', likes: 24, liked: false, replies: [
    { id: nid(), name: 'Fatou Ndiaye', handle: '@fatou.style', avatar: avatar(5), text: '@awa.sow 18 500 FCFA, dispo en live ce soir !', time: '8 min', likes: 6, liked: false, replies: [] },
  ] },
  { id: nid(), name: 'Modou K.', handle: '@modouk', avatar: avatar(15), text: 'Livraison sur Thiès ?', time: '20 min', likes: 3, liked: false, replies: [] },
  { id: nid(), name: 'Mariama', handle: '@mariama.c', avatar: avatar(45), text: 'Je recommande cette créatrice 🔥', time: '35 min', likes: 12, liked: false, replies: [] },
];

export default function Comments() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string; owner?: string; image?: string }>();
  const gate = useAuthGate();
  const meP = useMe();
  const isOwner = params.owner === '1'; // le propriétaire du post peut supprimer n'importe quel commentaire

  const [comments, setComments] = useState<Comment[]>(seed);
  const [text, setText] = useState('');
  const [replyTo, setReplyTo] = useState<{ id: string; handle: string } | null>(null);
  const [recording, setRecording] = useState(false);

  const close = () => (router.canGoBack() ? router.back() : router.replace('/accueil'));
  const deleteComment = (id: string) => {
    const rec = (list: Comment[]): Comment[] => list.filter((c) => c.id !== id).map((c) => ({ ...c, replies: rec(c.replies) }));
    setComments(rec);
  };

  const addVoice = () => {
    if (!gate('commenter')) return;
    setRecording(false);
    const dur = `0:0${3 + (comments.length % 6)}`;
    const me: Comment = { id: nid(), name: meP.name, handle: `@${meP.handle}`, avatar: meP.avatar, text: '', voice: dur, time: 'à l\'instant', likes: 0, liked: false, mine: true, replies: [] };
    setComments((prev) => [me, ...prev]);
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
      {/* Média du post en fond — visible au-dessus du panneau (façon TikTok/Insta) */}
      {params.image ? (
        <Image source={{ uri: params.image }} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} />
      ) : null}
      <View style={[StyleSheet.absoluteFill, styles.scrim]} />
      {/* Tap sur la zone haute = fermer */}
      <Pressable style={StyleSheet.absoluteFill} onPress={close} />

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
              {text.trim() ? (
                <Pressable onPress={send} style={styles.send}>
                  <Ionicons name="send" size={18} color="#fff" />
                </Pressable>
              ) : (
                <Pressable onPress={addVoice} onLongPress={() => setRecording(true)} onPressOut={() => recording && addVoice()} style={[styles.send, recording && { backgroundColor: Afryko.live }]}>
                  <Ionicons name={recording ? 'stop' : 'mic'} size={20} color="#fff" />
                </Pressable>
              )}
            </View>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </View>
    </View>
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
            <View style={styles.voiceNote}>
              <Ionicons name="play" size={15} color="#fff" />
              <View style={styles.voiceWave} />
              <Text style={styles.voiceDur}>{c.voice}</Text>
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
          <Ionicons name={c.liked ? 'heart' : 'heart-outline'} size={17} color={c.liked ? Afryko.live : Afryko.textDim} />
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
  overlay: { flex: 1, backgroundColor: '#0B0B0F', justifyContent: 'flex-end' },
  scrim: { backgroundColor: '#00000040' },
  sheet: { height: '66%', backgroundColor: Afryko.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden' },
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
