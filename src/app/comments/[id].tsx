import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/ui-kit';
import { Afylo, Font, Radius, Type } from '@/constants/brand';
import { useAuthGate } from '@/lib/auth-gate';
import { avatar, face } from '@/lib/mock';

type Comment = {
  id: string;
  name: string;
  handle: string;
  avatar: string;
  text: string;
  time: string;
  likes: number;
  liked: boolean;
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
  const params = useLocalSearchParams<{ id: string }>();
  const gate = useAuthGate();

  const [comments, setComments] = useState<Comment[]>(seed);
  const [text, setText] = useState('');
  const [replyTo, setReplyTo] = useState<{ id: string; handle: string } | null>(null);

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
    const me: Comment = { id: nid(), name: 'Toi', handle: '@toi', avatar: face('toi'), text: text.trim(), time: 'à l\'instant', likes: 0, liked: false, replies: [] };
    if (replyTo) {
      setComments((prev) => prev.map((c) => (c.id === replyTo.id ? { ...c, replies: [...c.replies, me] } : c)));
    } else {
      setComments((prev) => [me, ...prev]);
    }
    setText('');
    setReplyTo(null);
  };

  return (
    <View style={styles.root}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: Afylo.bg }}>
        <View style={styles.header}>
          <Ionicons name="chevron-back" size={26} color={Afylo.text} onPress={() => router.back()} />
          <Text style={styles.title}>Commentaires</Text>
          <View style={{ width: 26 }} />
        </View>
      </SafeAreaView>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 20 }} showsVerticalScrollIndicator={false}>
        {comments.map((c) => (
          <CommentRow key={c.id} c={c} onLike={toggleLike} onReply={(t) => setReplyTo(t)} />
        ))}
      </ScrollView>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <SafeAreaView edges={['bottom']} style={{ backgroundColor: Afylo.surface }}>
          {replyTo && (
            <View style={styles.replyBanner}>
              <Text style={styles.replyText}>Réponse à {replyTo.handle}</Text>
              <Ionicons name="close" size={18} color={Afylo.textDim} onPress={() => setReplyTo(null)} />
            </View>
          )}
          <View style={styles.inputBar}>
            <Avatar uri={face('toi')} size={34} />
            <TextInput
              style={styles.input}
              value={text}
              onChangeText={setText}
              placeholder={replyTo ? `Répondre à ${replyTo.handle}` : 'Ajoute un commentaire...'}
              placeholderTextColor={Afylo.textFaint}
              onSubmitEditing={send}
            />
            <Pressable onPress={send} disabled={!text.trim()} style={[styles.send, !text.trim() && { opacity: 0.4 }]}>
              <Ionicons name="send" size={18} color="#fff" />
            </Pressable>
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </View>
  );
}

function CommentRow({ c, onLike, onReply, depth = 0 }: { c: Comment; onLike: (id: string) => void; onReply: (t: { id: string; handle: string }) => void; depth?: number }) {
  return (
    <View style={{ marginLeft: depth * 44, marginBottom: 16 }}>
      <View style={{ flexDirection: 'row' }}>
        <Avatar uri={c.avatar} size={depth ? 30 : 38} />
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={styles.cName}>{c.name} <Text style={styles.cTime}>· {c.time}</Text></Text>
          <Text style={styles.cText}>{c.text}</Text>
          <View style={styles.cActions}>
            <Pressable onPress={() => onReply({ id: c.id, handle: c.handle })}>
              <Text style={styles.cReply}>Répondre</Text>
            </Pressable>
          </View>
        </View>
        <Pressable onPress={() => onLike(c.id)} style={styles.cLike}>
          <Ionicons name={c.liked ? 'heart' : 'heart-outline'} size={17} color={c.liked ? Afylo.live : Afylo.textDim} />
          {c.likes > 0 && <Text style={styles.cLikeCount}>{c.likes}</Text>}
        </Pressable>
      </View>
      {c.replies.map((r) => (
        <View key={r.id} style={{ marginTop: 14 }}>
          <CommentRow c={r} onLike={onLike} onReply={onReply} depth={depth + 1} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Afylo.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 8 },
  title: { ...Type.subtitle, color: Afylo.text },

  cName: { ...Type.small, fontFamily: Font.semibold, color: Afylo.text },
  cTime: { ...Type.caption, color: Afylo.textFaint, fontFamily: Font.regular },
  cText: { ...Type.body, fontSize: 15, color: Afylo.text, marginTop: 3 },
  cActions: { flexDirection: 'row', gap: 16, marginTop: 6 },
  cReply: { ...Type.caption, fontFamily: Font.semibold, color: Afylo.textDim },
  cLike: { alignItems: 'center', paddingLeft: 8, gap: 2 },
  cLikeCount: { ...Type.caption, color: Afylo.textDim },

  replyBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 8, backgroundColor: Afylo.bg, borderTopWidth: 1, borderTopColor: Afylo.border },
  replyText: { ...Type.caption, color: Afylo.textDim },
  inputBar: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 8, borderTopWidth: 1, borderTopColor: Afylo.border },
  input: { flex: 1, backgroundColor: Afylo.bg, borderRadius: Radius.pill, paddingHorizontal: 16, height: 40, ...Type.body, fontSize: 15, color: Afylo.text },
  send: { width: 40, height: 40, borderRadius: 20, backgroundColor: Afylo.violet, alignItems: 'center', justifyContent: 'center' },
});
