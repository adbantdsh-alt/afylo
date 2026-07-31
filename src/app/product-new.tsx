import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PillButton } from '@/components/ui-kit';
import { Afylo, Font, Radius, Type } from '@/constants/brand';
import { useAuth } from '@/lib/auth';
import { createProduct, uploadImage } from '@/lib/db';

const MAX_IMAGES = 10;
const MIN_COMMISSION = 15; // % : 10 créateur + 5 Afylo

export default function ProductNew() {
  const router = useRouter();
  const { session } = useAuth();
  const { width } = useWindowDimensions();

  const [images, setImages] = useState<string[]>([]);
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [promo, setPromo] = useState('');
  const [stock, setStock] = useState('');
  const [affiliationOn, setAffiliationOn] = useState(false);
  const [commission, setCommission] = useState('15');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pickImages = async () => {
    const remaining = MAX_IMAGES - images.length;
    if (remaining <= 0) return;
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: remaining,
      quality: 0.7,
    });
    if (!res.canceled) {
      setImages((prev) => [...prev, ...res.assets.map((a) => a.uri)].slice(0, MAX_IMAGES));
    }
  };

  const removeImage = (uri: string) => setImages((prev) => prev.filter((u) => u !== uri));

  const submit = async () => {
    setError(null);
    if (!session) {
      setError('Connecte-toi avec un vrai compte pour vendre (le mode invité ne peut pas créer).');
      return;
    }
    if (!title.trim() || !price.trim()) {
      setError('Le nom et le prix sont obligatoires.');
      return;
    }
    const priceN = parseInt(price.replace(/\D/g, ''), 10) || 0;
    const promoN = promo.trim() ? parseInt(promo.replace(/\D/g, ''), 10) : null;
    if (promoN && promoN >= priceN) {
      setError('Le prix promo doit être inférieur au prix normal.');
      return;
    }
    // Affiliation : min 15% si activée, sinon 0 (pas d'affiliation)
    let commissionN = 0;
    if (affiliationOn) {
      commissionN = Math.max(MIN_COMMISSION, parseInt(commission.replace(/\D/g, ''), 10) || 0);
    }

    setLoading(true);
    try {
      // 1) Upload des images vers Supabase Storage
      const urls: string[] = [];
      for (const uri of images) urls.push(await uploadImage('products', uri));
      // 2) Création du produit
      await createProduct({
        title: title.trim(),
        price_cfa: priceN,
        promo_cfa: promoN,
        stock: parseInt(stock.replace(/\D/g, ''), 10) || 0,
        commission_pct: commissionN,
        description: description.trim() || undefined,
        image_url: urls[0] ?? null,
        images: urls,
      });
      router.back();
    } catch (e: any) {
      setError(e.message ?? 'Erreur lors de la création.');
    } finally {
      setLoading(false);
    }
  };

  const tile = Math.min(width - 40, 320);

  return (
    <View style={styles.root}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: Afylo.bg }}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.hbtn}>
            <Ionicons name="close" size={26} color={Afylo.text} />
          </Pressable>
          <Text style={styles.title}>Nouveau produit</Text>
          <View style={{ width: 40 }} />
        </View>
      </SafeAreaView>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
          {/* Carrousel d'images (swipe) */}
          <Text style={styles.label}>Photos ({images.length}/{MAX_IMAGES})</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} pagingEnabled contentContainerStyle={{ gap: 12 }}>
            {images.map((uri) => (
              <View key={uri} style={[styles.slide, { width: tile, height: tile }]}>
                <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="cover" />
                <Pressable onPress={() => removeImage(uri)} style={styles.removeBtn}>
                  <Ionicons name="close" size={16} color="#fff" />
                </Pressable>
              </View>
            ))}
            {images.length < MAX_IMAGES && (
              <Pressable onPress={pickImages} style={[styles.addTile, { width: tile, height: tile }]}>
                <Ionicons name="camera" size={30} color={Afylo.violet} />
                <Text style={styles.addText}>Ajouter des photos</Text>
                <Text style={styles.addHint}>jusqu'à {MAX_IMAGES} · glisse pour naviguer</Text>
              </Pressable>
            )}
          </ScrollView>

          <Label text="Nom du produit *" />
          <Input value={title} onChange={setTitle} placeholder="Ex : Ensemble wax premium" />

          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Label text="Prix (FCFA) *" />
              <Input value={price} onChange={setPrice} placeholder="18500" keyboardType="numeric" />
            </View>
            <View style={{ flex: 1 }}>
              <Label text="Prix promo" />
              <Input value={promo} onChange={setPromo} placeholder="14900" keyboardType="numeric" />
            </View>
          </View>

          <Label text="Stock" />
          <Input value={stock} onChange={setStock} placeholder="24" keyboardType="numeric" />

          {/* Affiliation */}
          <View style={styles.affHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.affTitle}>Activer l'affiliation</Text>
              <Text style={styles.affHint}>Des créateurs revendent ton produit et touchent une commission.</Text>
            </View>
            <Switch value={affiliationOn} onValueChange={setAffiliationOn} trackColor={{ true: Afylo.violet }} />
          </View>
          {affiliationOn && (
            <>
              <Label text="Commission (%) — min. 15" />
              <Input value={commission} onChange={setCommission} placeholder="15" keyboardType="numeric" />
              <Text style={styles.helper}>Sur {commission || '15'}% : le créateur qui revend touche {Math.max(0, (parseInt(commission, 10) || 15) - 5)}%, Afylo prélève 5%.</Text>
            </>
          )}

          <Label text="Description" />
          <Input value={description} onChange={setDescription} placeholder="Détails, tailles, livraison..." multiline />

          {error && <Text style={styles.error}>{error}</Text>}

          <PillButton label="Publier le produit" icon="checkmark" onPress={submit} loading={loading} style={{ marginTop: 20 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function Label({ text }: { text: string }) {
  return <Text style={styles.label}>{text}</Text>;
}

function Input({
  value,
  onChange,
  placeholder,
  keyboardType,
  multiline,
}: {
  value: string;
  onChange: (t: string) => void;
  placeholder: string;
  keyboardType?: 'numeric' | 'default';
  multiline?: boolean;
}) {
  return (
    <TextInput
      style={[styles.input, multiline && { height: 90, textAlignVertical: 'top', paddingTop: 12 }]}
      value={value}
      onChangeText={onChange}
      placeholder={placeholder}
      placeholderTextColor={Afylo.textFaint}
      keyboardType={keyboardType}
      multiline={multiline}
      autoCapitalize="sentences"
    />
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Afylo.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 8 },
  hbtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { ...Type.subtitle, color: Afylo.text },

  slide: { borderRadius: Radius.lg, overflow: 'hidden', backgroundColor: Afylo.surfaceAlt },
  removeBtn: { position: 'absolute', top: 8, right: 8, width: 28, height: 28, borderRadius: 14, backgroundColor: '#000000AA', alignItems: 'center', justifyContent: 'center' },
  addTile: { borderRadius: Radius.lg, borderWidth: 1.5, borderStyle: 'dashed', borderColor: Afylo.violet, backgroundColor: Afylo.surface, alignItems: 'center', justifyContent: 'center', gap: 6 },
  addText: { ...Type.small, color: Afylo.violet, fontFamily: Font.semibold },
  addHint: { ...Type.caption, color: Afylo.textFaint },

  label: { ...Type.small, color: Afylo.text, fontFamily: Font.semibold, marginTop: 18, marginBottom: 8 },
  input: { backgroundColor: Afylo.surface, borderRadius: Radius.md, borderWidth: 1, borderColor: Afylo.border, color: Afylo.text, ...Type.body, paddingHorizontal: 14, height: 50 },
  row: { flexDirection: 'row', gap: 12 },
  helper: { ...Type.caption, color: Afylo.textDim, marginTop: 6, lineHeight: 17 },

  affHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 22, backgroundColor: Afylo.surface, borderRadius: Radius.md, borderWidth: 1, borderColor: Afylo.border, padding: 14 },
  affTitle: { ...Type.body, fontFamily: Font.semibold, color: Afylo.text },
  affHint: { ...Type.caption, color: Afylo.textDim, marginTop: 2, lineHeight: 17 },

  error: { color: Afylo.live, ...Type.small, fontFamily: Font.semibold, marginTop: 16 },
});
