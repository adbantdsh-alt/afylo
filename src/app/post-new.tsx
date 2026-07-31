import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PillButton } from '@/components/ui-kit';
import { SoundPicker } from '@/components/sound-picker';
import { Afylo, Font, Radius } from '@/constants/brand';
import { useAuth } from '@/lib/auth';
import { createPost, listMyProducts } from '@/lib/db';
import { photo } from '@/lib/mock';
import { findSound, type Sound } from '@/lib/sounds';
import type { Product } from '@/types/db';

const KINDS = [
  { key: 'image', label: 'Photo', icon: 'image' },
  { key: 'video', label: 'Vidéo', icon: 'videocam' },
  { key: 'story', label: 'Story', icon: 'aperture' },
] as const;

export default function PostNew() {
  const router = useRouter();
  const { session } = useAuth();
  const params = useLocalSearchParams<{ kind?: string; uri?: string; soundId?: string; soundTitle?: string }>();

  const [kind, setKind] = useState<'image' | 'video' | 'story'>(
    (params.kind as any) === 'video' ? 'video' : 'image',
  );
  const [caption, setCaption] = useState('');
  const [mediaUrl, setMediaUrl] = useState(typeof params.uri === 'string' ? params.uri : '');
  const [products, setProducts] = useState<Product[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sound, setSound] = useState<Sound | null>(
    params.soundId ? findSound(params.soundId) ?? (params.soundTitle ? ({ id: params.soundId, title: params.soundTitle, artist: 'Son', cover: '', duration: '', uses: '' } as Sound) : null) : null,
  );
  const [soundOpen, setSoundOpen] = useState(false);

  useEffect(() => {
    if (!session) return;
    setLoadingProducts(true);
    listMyProducts()
      .then(setProducts)
      .finally(() => setLoadingProducts(false));
  }, [session]);

  const MAX_PRODUCTS = 5;
  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < MAX_PRODUCTS) next.add(id); // max 5 produits attachés
      return next;
    });
  };

  const publish = async () => {
    setError(null);
    if (!session) {
      setError('Connecte-toi avec un vrai compte pour publier (le mode invité ne peut pas).');
      return;
    }
    setPublishing(true);
    try {
      const finalCaption = [sound ? `🎵 ${sound.title} · ${sound.artist}` : '', caption.trim()].filter(Boolean).join('\n');
      await createPost({
        kind,
        caption: finalCaption || undefined,
        media_url: mediaUrl.trim() || null,
        productIds: [...selected],
      });
      router.replace('/accueil');
    } catch (e: any) {
      setError(e.message ?? 'Erreur lors de la publication.');
    } finally {
      setPublishing(false);
    }
  };

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
          {/* Type */}
          <View style={styles.kindRow}>
            {KINDS.map((k) => (
              <Pressable key={k.key} onPress={() => setKind(k.key)} style={[styles.kind, kind === k.key && styles.kindOn]}>
                <Ionicons name={k.icon as any} size={18} color={kind === k.key ? '#fff' : Afylo.textDim} />
                <Text style={[styles.kindText, kind === k.key && { color: '#fff' }]}>{k.label}</Text>
              </Pressable>
            ))}
          </View>

          {/* Son */}
          <Pressable onPress={() => setSoundOpen(true)} style={styles.soundBtn}>
            <Ionicons name="musical-notes" size={20} color={sound ? Afylo.violet : Afylo.textDim} />
            <Text style={[styles.soundBtnText, sound && { color: Afylo.text, fontFamily: Font.semibold }]} numberOfLines={1}>
              {sound ? `${sound.title} · ${sound.artist}` : 'Ajouter un son'}
            </Text>
            {sound ? (
              <Ionicons name="close-circle" size={20} color={Afylo.textFaint} onPress={() => setSound(null)} />
            ) : (
              <Ionicons name="chevron-forward" size={18} color={Afylo.textFaint} />
            )}
          </Pressable>

          {/* Média */}
          <View style={styles.mediaBox}>
            {mediaUrl ? (
              <Image source={{ uri: mediaUrl }} style={StyleSheet.absoluteFill} contentFit="cover" />
            ) : (
              <>
                <Ionicons name="cloud-upload-outline" size={30} color={Afylo.textFaint} />
                <Text style={styles.mediaHint}>Colle une URL d'image/vidéo</Text>
                <Text style={styles.mediaHintSmall}>(upload depuis le téléphone ensuite)</Text>
              </>
            )}
          </View>
          <TextInput
            style={styles.input}
            value={mediaUrl}
            onChangeText={setMediaUrl}
            placeholder="https://..."
            placeholderTextColor={Afylo.textFaint}
            autoCapitalize="none"
          />

          {/* Légende */}
          <TextInput
            style={[styles.input, styles.caption]}
            value={caption}
            onChangeText={setCaption}
            placeholder="Écris une légende..."
            placeholderTextColor={Afylo.textFaint}
            multiline
          />

          {/* Attacher des produits → active « Acheter » */}
          <View style={styles.sectionRow}>
            <Ionicons name="pricetags" size={18} color={Afylo.violet} />
            <Text style={styles.section}>Attacher des produits</Text>
            <Text style={styles.count}>{selected.size}/5</Text>
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
                    <Text style={styles.prodPrice}>{p.price_cfa.toLocaleString('fr-FR')} F</Text>
                  </View>
                  <Ionicons name={on ? 'checkmark-circle' : 'ellipse-outline'} size={22} color={on ? Afylo.violet : Afylo.textFaint} />
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

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Afylo.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 8 },
  hbtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { color: Afylo.text, fontSize: 18, fontFamily: Font.bold },
  soundBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: Afylo.surface, borderWidth: 1, borderColor: Afylo.border, borderRadius: Radius.md, paddingHorizontal: 14, height: 50, marginBottom: 12 },
  soundBtnText: { flex: 1, color: Afylo.textDim, fontSize: 15, fontFamily: Font.regular },

  kindRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  kind: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 11, borderRadius: Radius.pill, backgroundColor: Afylo.surface, borderWidth: 1, borderColor: Afylo.border },
  kindOn: { backgroundColor: Afylo.violet, borderColor: Afylo.violet },
  kindText: { color: Afylo.textDim, fontWeight: '700', fontSize: 13 },

  mediaBox: { height: 150, borderRadius: Radius.lg, borderWidth: 1.5, borderStyle: 'dashed', borderColor: Afylo.border, backgroundColor: Afylo.surface, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  mediaHint: { color: Afylo.textDim, fontSize: 13, marginTop: 8 },
  mediaHintSmall: { color: Afylo.textFaint, fontSize: 11, marginTop: 2 },

  input: { backgroundColor: Afylo.surface, borderRadius: Radius.md, borderWidth: 1, borderColor: Afylo.border, color: Afylo.text, fontSize: 15, paddingHorizontal: 14, height: 50, marginTop: 12 },
  caption: { height: 90, textAlignVertical: 'top', paddingTop: 12 },

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

  error: { color: Afylo.live, fontSize: 14, marginTop: 16, fontWeight: '600' },
});
