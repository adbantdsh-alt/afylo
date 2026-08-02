import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/ui-kit';
import { Afryko, Font, Radius, Type } from '@/constants/brand';
import { canMessage, getThread, listMyProducts, markThreadRead, sendMessage, uploadImage, type Message } from '@/lib/db';
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
  const otherId = params.id;
  const name = params.name || 'Discussion';
  const avatar = params.avatar || face(otherId ?? 'afryko');

  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [blocked, setBlocked] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [myProducts, setMyProducts] = useState<Product[]>([]);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const refresh = () => getThread(otherId).then((m) => { setMessages(m); markThreadRead(otherId).catch(() => {}); }).catch(() => {});

  // Chargement + vérif confidentialité + polling (temps réel léger)
  useEffect(() => {
    if (!otherId) return;
    setLoading(true);
    canMessage(otherId).then((r) => setBlocked(r.ok ? null : r.reason ?? 'Messages désactivés.'));
    refresh().finally(() => setLoading(false));
    listMyProducts().then(setMyProducts).catch(() => {});
    const t = setInterval(refresh, 3500);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otherId]);

  useEffect(() => { setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 60); }, [messages.length]);

  const doSend = async (input: { kind?: 'text' | 'image' | 'product'; text?: string; media_url?: string; product?: any }) => {
    if (sending) return;
    setSending(true);
    // optimiste
    const temp: Message = { id: `tmp${Date.now()}`, sender_id: me.id ?? 'me', recipient_id: otherId, kind: input.kind ?? 'text', text: input.text ?? null, media_url: input.media_url ?? null, product: input.product ?? null, created_at: new Date().toISOString(), read_at: null };
    setMessages((prev) => [...prev, temp]);
    const row = await sendMessage(otherId, input);
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

  return (
    <View style={styles.root}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: Afryko.surface }}>
        <View style={styles.header}>
          <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/messages'))} style={styles.back}>
            <Ionicons name="chevron-back" size={26} color={Afryko.text} />
          </Pressable>
          <Pressable onPress={() => router.push({ pathname: '/creator/[id]', params: { id: otherId, name, avatar } })} style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
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
          <ActivityIndicator color={Afryko.violet} style={{ marginTop: 30 }} />
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
                    <Ionicons name="send" size={18} color={Afryko.violet} />
                  </Pressable>
                ))}
              </ScrollView>
            )}
          </View>
        </Pressable>
      )}

      {/* Barre de saisie / bandeau confidentialité */}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <SafeAreaView edges={['bottom']} style={{ backgroundColor: Afryko.surface }}>
          {blocked ? (
            <View style={styles.blockedBar}><Ionicons name="lock-closed" size={15} color={Afryko.textDim} /><Text style={styles.blockedText}>{blocked}</Text></View>
          ) : (
            <View style={styles.inputBar}>
              <Pressable onPress={() => setPickerOpen(true)} style={styles.tool}><Ionicons name="pricetag" size={22} color={Afryko.violet} /></Pressable>
              <Pressable onPress={attachImage} style={styles.tool}><Ionicons name="image-outline" size={23} color={Afryko.textDim} /></Pressable>
              <TextInput style={styles.input} value={text} onChangeText={setText} placeholder="Message" placeholderTextColor={Afryko.textFaint} onSubmitEditing={sendText} returnKeyType="send" />
              <Pressable onPress={sendText} disabled={!text.trim() || sending} style={[styles.send, (!text.trim() || sending) && { opacity: 0.4 }]}>
                <Ionicons name="send" size={18} color="#fff" />
              </Pressable>
            </View>
          )}
        </SafeAreaView>
      </KeyboardAvoidingView>
    </View>
  );
}

function Bubble({ m, mine }: { m: Message; mine: boolean }) {
  const align = mine ? styles.right : styles.left;

  if (m.kind === 'product' && m.product) {
    return (
      <View style={[styles.bubbleWrap, align]}>
        <View style={styles.productCard}>
          <Image source={{ uri: m.product.image }} style={styles.productImg} contentFit="cover" />
          <View style={styles.productBody}>
            <Text style={styles.productTitle} numberOfLines={2}>{m.product.title}</Text>
            <Text style={styles.productPrice}>{m.product.price}</Text>
            <Pressable style={styles.buyBtn}>
              <Ionicons name="bag-handle" size={15} color="#fff" />
              <Text style={styles.buyText}>Acheter maintenant</Text>
            </Pressable>
          </View>
        </View>
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

  return (
    <View style={[styles.bubbleWrap, align]}>
      <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}>
        <Text style={[styles.bubbleText, mine && { color: '#fff' }]}>{m.text}</Text>
        <Text style={[styles.bubbleTime, mine && { color: '#ffffffaa' }]}>{fmtTime(m.created_at)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Afryko.bg },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 6, backgroundColor: Afryko.surface, borderBottomWidth: 1, borderBottomColor: Afryko.border },
  back: { width: 36, height: 40, alignItems: 'center', justifyContent: 'center' },
  name: { ...Type.body, fontFamily: Font.semibold, color: Afryko.text },
  status: { ...Type.caption, color: Afryko.textDim, marginTop: 1 },

  list: { padding: 14, paddingBottom: 20, gap: 8 },
  hint: { color: Afryko.textDim, fontSize: 14, textAlign: 'center', marginTop: 24, paddingHorizontal: 20 },
  bubbleWrap: { maxWidth: '80%' },
  left: { alignSelf: 'flex-start' },
  right: { alignSelf: 'flex-end' },
  bubble: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20 },
  bubbleMine: { backgroundColor: Afryko.violet, borderBottomRightRadius: 6 },
  bubbleTheirs: { backgroundColor: Afryko.surface, borderBottomLeftRadius: 6, borderWidth: 1, borderColor: Afryko.border },
  bubbleText: { ...Type.body, fontSize: 15, color: Afryko.text },
  bubbleTime: { ...Type.caption, fontSize: 10, color: Afryko.textFaint, alignSelf: 'flex-end', marginTop: 3 },

  mediaBubble: { width: 200, height: 240, borderRadius: 20, overflow: 'hidden', backgroundColor: Afryko.surfaceAlt },

  productCard: { width: 240, backgroundColor: Afryko.surface, borderRadius: 18, overflow: 'hidden', borderWidth: 1, borderColor: Afryko.border },
  productImg: { width: '100%', height: 150, backgroundColor: Afryko.surfaceAlt },
  productBody: { padding: 12 },
  productTitle: { ...Type.body, fontSize: 15, fontFamily: Font.semibold, color: Afryko.text },
  productPrice: { fontFamily: Font.bold, fontSize: 17, color: Afryko.text, marginTop: 4 },
  buyBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: Afryko.violet, borderRadius: Radius.pill, paddingVertical: 11, marginTop: 10 },
  buyText: { fontFamily: Font.semibold, fontSize: 14, color: '#fff' },

  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: '#00000066', justifyContent: 'flex-end', zIndex: 10 },
  sheet: { backgroundColor: Afryko.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 16, maxHeight: '60%' },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: Afryko.border, alignSelf: 'center', marginBottom: 12 },
  sheetTitle: { ...Type.subtitle, color: Afryko.text, marginBottom: 12 },
  pickRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  pickImg: { width: 48, height: 48, borderRadius: 10, backgroundColor: Afryko.surfaceAlt },
  pickTitle: { ...Type.body, fontSize: 15, color: Afryko.text },
  pickPrice: { ...Type.small, color: Afryko.textDim, marginTop: 2 },

  inputBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 8, gap: 4, backgroundColor: Afryko.surface, borderTopWidth: 1, borderTopColor: Afryko.border },
  tool: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  input: { flex: 1, backgroundColor: Afryko.bg, borderRadius: Radius.pill, paddingHorizontal: 16, height: 42, ...Type.body, fontSize: 15, color: Afryko.text, marginHorizontal: 4 },
  send: { width: 42, height: 42, borderRadius: 21, backgroundColor: Afryko.violet, alignItems: 'center', justifyContent: 'center' },
  blockedBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 20, paddingVertical: 16, backgroundColor: Afryko.surface, borderTopWidth: 1, borderTopColor: Afryko.border },
  blockedText: { color: Afryko.textDim, fontSize: 13, textAlign: 'center', flexShrink: 1 },
});
