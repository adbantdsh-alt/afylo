import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/ui-kit';
import { Afylo, Font, Radius, Type } from '@/constants/brand';
import { face, myProducts } from '@/lib/mock';

type Kind = 'text' | 'image' | 'video' | 'voice' | 'product';
type Product = { id: string; title: string; price: string; image: string };
type Msg = {
  id: string;
  mine: boolean;
  kind: Kind;
  text?: string;
  uri?: string;
  duration?: string;
  product?: Product;
  time: string;
};

let counter = 0;
const uid = () => `m${++counter}`;

export default function Chat() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string; name?: string; avatar?: string }>();
  const name = params.name || 'Discussion';
  const avatar = params.avatar || face(params.id ?? 'afylo');

  const [messages, setMessages] = useState<Msg[]>([
    { id: uid(), mine: false, kind: 'text', text: 'Salut ! Le coffret est toujours dispo ?', time: '10:02' },
    { id: uid(), mine: true, kind: 'text', text: 'Oui bien sûr 😊 je t\'envoie ça', time: '10:03' },
  ]);
  const [text, setText] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [recording, setRecording] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const push = (m: Omit<Msg, 'id' | 'time' | 'mine'> & { mine?: boolean }) => {
    setMessages((prev) => [...prev, { id: uid(), mine: true, time: 'now', ...m }]);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
  };

  const sendText = () => {
    if (!text.trim()) return;
    push({ kind: 'text', text: text.trim() });
    setText('');
  };

  const attach = async (kind: 'image' | 'video') => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: kind === 'video' ? ['videos'] : ['images'],
      quality: 0.7,
    });
    if (!res.canceled) push({ kind, uri: res.assets[0].uri });
  };

  const toggleVoice = () => {
    if (recording) {
      setRecording(false);
      push({ kind: 'voice', duration: "0:0" + (3 + (messages.length % 6)) });
    } else {
      setRecording(true);
    }
  };

  const sendProduct = (p: (typeof myProducts)[number]) => {
    setPickerOpen(false);
    push({ kind: 'product', product: { id: p.id, title: p.title, price: `${p.price} FCFA`, image: p.image } });
  };

  return (
    <View style={styles.root}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: Afylo.surface }}>
        <View style={styles.header}>
          <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/accueil'))} style={styles.back}>
            <Ionicons name="chevron-back" size={26} color={Afylo.text} />
          </Pressable>
          <Avatar uri={avatar} size={38} />
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={styles.name}>{name}</Text>
            <Text style={styles.status}>En ligne</Text>
          </View>
          <Ionicons name="call-outline" size={22} color={Afylo.text} style={{ marginRight: 16 }} />
          <Ionicons name="videocam-outline" size={24} color={Afylo.text} />
        </View>
      </SafeAreaView>

      <ScrollView ref={scrollRef} contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {messages.map((m) => (
          <Bubble key={m.id} m={m} />
        ))}
      </ScrollView>

      {/* Sélecteur de produit */}
      {pickerOpen && (
        <Pressable style={styles.overlay} onPress={() => setPickerOpen(false)}>
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Envoyer un produit</Text>
            <ScrollView>
              {myProducts.map((p) => (
                <Pressable key={p.id} onPress={() => sendProduct(p)} style={styles.pickRow}>
                  <Image source={{ uri: p.image }} style={styles.pickImg} contentFit="cover" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.pickTitle} numberOfLines={1}>{p.title}</Text>
                    <Text style={styles.pickPrice}>{p.price} FCFA</Text>
                  </View>
                  <Ionicons name="send" size={18} color={Afylo.violet} />
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      )}

      {/* Barre de saisie */}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <SafeAreaView edges={['bottom']} style={{ backgroundColor: Afylo.surface }}>
          <View style={styles.inputBar}>
            <Pressable onPress={() => setPickerOpen(true)} style={styles.tool}>
              <Ionicons name="pricetag" size={22} color={Afylo.violet} />
            </Pressable>
            <Pressable onPress={() => attach('image')} style={styles.tool}>
              <Ionicons name="image-outline" size={23} color={Afylo.textDim} />
            </Pressable>
            <Pressable onPress={() => attach('video')} style={styles.tool}>
              <Ionicons name="videocam-outline" size={23} color={Afylo.textDim} />
            </Pressable>

            <TextInput
              style={styles.input}
              value={text}
              onChangeText={setText}
              placeholder={recording ? 'Enregistrement…' : 'Message'}
              placeholderTextColor={Afylo.textFaint}
              onSubmitEditing={sendText}
            />

            {text.trim() ? (
              <Pressable onPress={sendText} style={styles.send}>
                <Ionicons name="send" size={18} color="#fff" />
              </Pressable>
            ) : (
              <Pressable onPress={toggleVoice} style={[styles.send, recording && { backgroundColor: Afylo.live }]}>
                <Ionicons name={recording ? 'stop' : 'mic'} size={20} color="#fff" />
              </Pressable>
            )}
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </View>
  );
}

function Bubble({ m }: { m: Msg }) {
  const align = m.mine ? styles.right : styles.left;

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

  if (m.kind === 'image' || m.kind === 'video') {
    return (
      <View style={[styles.bubbleWrap, align]}>
        <View style={styles.mediaBubble}>
          <Image source={{ uri: m.uri }} style={StyleSheet.absoluteFill} contentFit="cover" />
          {m.kind === 'video' && (
            <View style={styles.playOverlay}>
              <Ionicons name="play" size={26} color="#fff" />
            </View>
          )}
        </View>
      </View>
    );
  }

  if (m.kind === 'voice') {
    return (
      <View style={[styles.bubbleWrap, align]}>
        <View style={[styles.bubble, m.mine ? styles.bubbleMine : styles.bubbleTheirs, styles.voiceRow]}>
          <Ionicons name="play" size={20} color={m.mine ? '#fff' : Afylo.violet} />
          <View style={[styles.waveform, { backgroundColor: m.mine ? '#ffffff66' : Afylo.border }]} />
          <Text style={[styles.voiceTime, { color: m.mine ? '#fff' : Afylo.textDim }]}>{m.duration}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.bubbleWrap, align]}>
      <View style={[styles.bubble, m.mine ? styles.bubbleMine : styles.bubbleTheirs]}>
        <Text style={[styles.bubbleText, m.mine && { color: '#fff' }]}>{m.text}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Afylo.bg },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 6, backgroundColor: Afylo.surface, borderBottomWidth: 1, borderBottomColor: Afylo.border },
  back: { width: 36, height: 40, alignItems: 'center', justifyContent: 'center' },
  name: { ...Type.body, fontFamily: Font.semibold, color: Afylo.text },
  status: { ...Type.caption, color: Afylo.green, marginTop: 1 },

  list: { padding: 14, paddingBottom: 20, gap: 8 },
  bubbleWrap: { maxWidth: '80%' },
  left: { alignSelf: 'flex-start' },
  right: { alignSelf: 'flex-end' },
  bubble: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20 },
  bubbleMine: { backgroundColor: Afylo.violet, borderBottomRightRadius: 6 },
  bubbleTheirs: { backgroundColor: Afylo.surface, borderBottomLeftRadius: 6, borderWidth: 1, borderColor: Afylo.border },
  bubbleText: { ...Type.body, fontSize: 15, color: Afylo.text },

  mediaBubble: { width: 200, height: 240, borderRadius: 20, overflow: 'hidden', backgroundColor: Afylo.surfaceAlt },
  playOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', backgroundColor: '#00000033' },

  voiceRow: { flexDirection: 'row', alignItems: 'center', gap: 10, minWidth: 160 },
  waveform: { flex: 1, height: 4, borderRadius: 2 },
  voiceTime: { ...Type.caption },

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
});
