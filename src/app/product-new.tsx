import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Afylo, Font, Radius, Type } from '@/constants/brand';
import { useAuthGate } from '@/lib/auth-gate';
import { createProduct, uploadImage } from '@/lib/db';

const MAX_IMAGES = 10;
const MIN_COMMISSION = 15;
const CONDITIONS = ['Neuf', 'Comme neuf', 'Occasion', 'Fait main'];

export default function ProductNew() {
  const router = useRouter();
  const gate = useAuthGate();

  const [images, setImages] = useState<string[]>([]);
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [promo, setPromo] = useState('');
  const [stock, setStock] = useState('');
  const [condition, setCondition] = useState<string | null>(null);
  const [quality, setQuality] = useState(false);
  const [affiliationOn, setAffiliationOn] = useState(false);
  const [commission, setCommission] = useState('15');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pickImages = async () => {
    const remaining = MAX_IMAGES - images.length;
    if (remaining <= 0) return;
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: true, selectionLimit: remaining, quality: 1 });
    if (!res.canceled) setImages((prev) => [...prev, ...res.assets.map((a) => a.uri)].slice(0, MAX_IMAGES));
  };
  const removeImage = (uri: string) => setImages((prev) => prev.filter((u) => u !== uri));

  const submit = async () => {
    setError(null);
    if (!gate('vendre')) return;
    if (!title.trim() || !price.trim()) return setError('Le nom et le prix sont obligatoires.');
    const priceN = parseInt(price.replace(/\D/g, ''), 10) || 0;
    const promoN = promo.trim() ? parseInt(promo.replace(/\D/g, ''), 10) : null;
    if (promoN && promoN >= priceN) return setError('Le prix promo doit être inférieur au prix normal.');
    let commissionN = 0;
    if (affiliationOn) commissionN = Math.max(MIN_COMMISSION, parseInt(commission.replace(/\D/g, ''), 10) || 0);

    // Offre de qualité intégrée à la description (persistée sans migration)
    const extras: string[] = [];
    if (condition) extras.push(`État : ${condition}`);
    if (quality) extras.push('✓ Garantie qualité Afylo — satisfait ou remboursé (via séquestre XaalisPay)');
    const finalDesc = [description.trim(), extras.join('\n')].filter(Boolean).join('\n\n');

    setLoading(true);
    try {
      const urls: string[] = [];
      for (const uri of images) urls.push(await uploadImage('products', uri));
      await createProduct({
        title: title.trim(),
        price_cfa: priceN,
        promo_cfa: promoN,
        stock: parseInt(stock.replace(/\D/g, ''), 10) || 0,
        commission_pct: commissionN,
        description: finalDesc || undefined,
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
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 30 }} keyboardShouldPersistTaps="handled">
          {/* Photos */}
          <Text style={styles.section}>Photos</Text>
          <Text style={styles.hint}>La 1ʳᵉ photo est la couverture · jusqu'à {MAX_IMAGES}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingVertical: 12 }}>
            {images.map((uri, i) => (
              <View key={uri} style={styles.thumb}>
                <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="cover" />
                {i === 0 && <View style={styles.coverTag}><Text style={styles.coverText}>Couverture</Text></View>}
                <Pressable onPress={() => removeImage(uri)} style={styles.thumbX}>
                  <Ionicons name="close" size={14} color="#fff" />
                </Pressable>
              </View>
            ))}
            {images.length < MAX_IMAGES && (
              <Pressable onPress={pickImages} style={styles.addThumb}>
                <Ionicons name="camera" size={26} color={Afylo.violet} />
                <Text style={styles.addThumbText}>Ajouter</Text>
              </Pressable>
            )}
          </ScrollView>

          {/* Infos */}
          <Card>
            <Field label="Nom du produit *" value={title} onChange={setTitle} placeholder="Ex : Ensemble wax premium" />
            <View style={styles.row}>
              <View style={{ flex: 1 }}><Field label="Prix (FCFA) *" value={price} onChange={setPrice} placeholder="18500" numeric /></View>
              <View style={{ flex: 1 }}><Field label="Prix promo" value={promo} onChange={setPromo} placeholder="14900" numeric /></View>
            </View>
            <Field label="Stock disponible" value={stock} onChange={setStock} placeholder="24" numeric />
          </Card>

          {/* Offre de qualité */}
          <Card>
            <Text style={styles.cardTitle}>Offre de qualité</Text>
            <Text style={styles.subLabel}>État du produit</Text>
            <View style={styles.chips}>
              {CONDITIONS.map((c) => (
                <Pressable key={c} onPress={() => setCondition((v) => (v === c ? null : c))} style={[styles.chip, condition === c && styles.chipOn]}>
                  <Text style={[styles.chipText, condition === c && { color: '#fff' }]}>{c}</Text>
                </Pressable>
              ))}
            </View>
            <View style={styles.switchRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.switchTitle}>Garantie qualité Afylo</Text>
                <Text style={styles.switchHint}>Satisfait ou remboursé via le séquestre XaalisPay — rassure l'acheteur.</Text>
              </View>
              <Switch value={quality} onValueChange={setQuality} trackColor={{ true: Afylo.green }} />
            </View>
          </Card>

          {/* Affiliation */}
          <Card>
            <View style={styles.switchRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.switchTitle}>Activer l'affiliation</Text>
                <Text style={styles.switchHint}>Des créateurs revendent ton produit contre commission.</Text>
              </View>
              <Switch value={affiliationOn} onValueChange={setAffiliationOn} trackColor={{ true: Afylo.violet }} />
            </View>
            {affiliationOn && (
              <>
                <Field label="Commission (%) — min. 15" value={commission} onChange={setCommission} placeholder="15" numeric />
                <Text style={styles.hint}>Sur {commission || '15'}% : le créateur touche {Math.max(0, (parseInt(commission, 10) || 15) - 5)}%, Afylo 5%.</Text>
              </>
            )}
          </Card>

          {/* Description */}
          <Card>
            <Field label="Description" value={description} onChange={setDescription} placeholder="Détails, tailles, livraison..." multiline />
          </Card>

          {error && <Text style={styles.error}>{error}</Text>}

          <Pressable onPress={submit} disabled={loading} style={[styles.publish, loading && { opacity: 0.6 }]}>
            <Ionicons name="checkmark-circle" size={20} color="#fff" />
            <Text style={styles.publishText}>{loading ? 'Publication…' : 'Publier le produit'}</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function Card({ children }: { children: ReactNode }) {
  return <View style={styles.card}>{children}</View>;
}

function Field({ label, value, onChange, placeholder, numeric, multiline }: { label: string; value: string; onChange: (t: string) => void; placeholder: string; numeric?: boolean; multiline?: boolean }) {
  return (
    <View style={{ marginBottom: 4 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && { height: 88, textAlignVertical: 'top', paddingTop: 12 }]}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={Afylo.textFaint}
        keyboardType={numeric ? 'numeric' : 'default'}
        multiline={multiline}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Afylo.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 8 },
  hbtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { ...Type.subtitle, color: Afylo.text },

  section: { ...Type.body, fontFamily: Font.semibold, color: Afylo.text },
  hint: { ...Type.caption, color: Afylo.textDim, marginTop: 4, lineHeight: 17 },
  thumb: { width: 88, height: 88, borderRadius: Radius.md, overflow: 'hidden', backgroundColor: Afylo.surfaceAlt },
  coverTag: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#000000AA', paddingVertical: 2, alignItems: 'center' },
  coverText: { color: '#fff', fontSize: 9, fontFamily: Font.semibold },
  thumbX: { position: 'absolute', top: 4, right: 4, width: 22, height: 22, borderRadius: 11, backgroundColor: '#000000AA', alignItems: 'center', justifyContent: 'center' },
  addThumb: { width: 88, height: 88, borderRadius: Radius.md, borderWidth: 1.5, borderStyle: 'dashed', borderColor: Afylo.violet, backgroundColor: Afylo.surface, alignItems: 'center', justifyContent: 'center', gap: 4 },
  addThumbText: { ...Type.caption, color: Afylo.violet, fontFamily: Font.semibold },

  card: { backgroundColor: Afylo.surface, borderRadius: Radius.lg, borderWidth: 1, borderColor: Afylo.border, padding: 14, marginTop: 14 },
  cardTitle: { ...Type.body, fontFamily: Font.semibold, color: Afylo.text, marginBottom: 10 },
  label: { ...Type.small, fontFamily: Font.semibold, color: Afylo.text, marginBottom: 8, marginTop: 8 },
  subLabel: { ...Type.small, color: Afylo.textDim, marginBottom: 8 },
  input: { backgroundColor: Afylo.bg, borderRadius: Radius.md, borderWidth: 1, borderColor: Afylo.border, color: Afylo.text, ...Type.body, paddingHorizontal: 14, height: 50 },
  row: { flexDirection: 'row', gap: 12 },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 6 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: Radius.pill, backgroundColor: Afylo.bg, borderWidth: 1, borderColor: Afylo.border },
  chipOn: { backgroundColor: Afylo.violet, borderColor: Afylo.violet },
  chipText: { ...Type.small, color: Afylo.text },

  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 12 },
  switchTitle: { ...Type.body, fontFamily: Font.semibold, color: Afylo.text },
  switchHint: { ...Type.caption, color: Afylo.textDim, marginTop: 2, lineHeight: 17 },

  error: { color: Afylo.live, ...Type.small, fontFamily: Font.semibold, marginTop: 16 },
  publish: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 54, borderRadius: Radius.pill, backgroundColor: Afylo.violet, marginTop: 20 },
  publishText: { color: '#fff', fontFamily: Font.semibold, fontSize: 16 },
});
