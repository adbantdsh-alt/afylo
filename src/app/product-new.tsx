import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState, type ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Afylo, Font, Radius, Type } from '@/constants/brand';
import { useAuthGate } from '@/lib/auth-gate';
import { PRODUCT_CATEGORIES } from '@/lib/categories';
import { createProduct, getProduct, updateProduct, uploadFile, uploadImage } from '@/lib/db';
import { classifyProduct } from '@/lib/moderation';

const MIN_COMMISSION = 5; // commission minimale versée à l'affilié (Afylo prélève 5% en plus)
const CONDITIONS = ['Neuf', 'Comme neuf', 'Occasion', 'Fait main'];

export default function ProductNew() {
  const router = useRouter();
  const gate = useAuthGate();
  const params = useLocalSearchParams<{ id?: string }>();
  const editId = params.id || null; // présent = mode édition

  const [kind, setKind] = useState<'physical' | 'digital'>('physical');
  const [images, setImages] = useState<string[]>([]);
  const [file, setFile] = useState<{ uri: string; name: string } | null>(null);
  const [hadFile, setHadFile] = useState(false); // le produit digital a déjà un fichier (édition)
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [promo, setPromo] = useState('');
  const [stock, setStock] = useState('');
  const [condition, setCondition] = useState<string | null>(null);
  const [category, setCategory] = useState<string | null>(null);
  const [tiers, setTiers] = useState<{ qty: string; price: string }[]>([]);
  const [affiliationOn, setAffiliationOn] = useState(false);
  const [commission, setCommission] = useState('15');
  const [free, setFree] = useState(false); // produit digital gratuit (téléchargement gratuit)
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Édition : précharge le produit existant
  useEffect(() => {
    if (!editId) return;
    getProduct(editId)
      .then((p) => {
        if (!p) return;
        setKind(p.kind);
        setTitle(p.title);
        setPrice(String(p.price_cfa));
        setPromo(p.promo_cfa ? String(p.promo_cfa) : '');
        setStock(String(p.stock));
        setImages(p.images?.length ? p.images : p.image_url ? [p.image_url] : []);
        setHadFile(!!p.digital_file_url);
        if (p.digital_file_url) setFile({ uri: p.digital_file_url, name: 'Fichier actuel' });
        setDescription(p.description ?? '');
        if (p.commission_pct > 0) { setAffiliationOn(true); setCommission(String(p.commission_pct)); }
        if (p.kind === 'digital' && p.price_cfa === 0) setFree(true);
        setCategory(p.category ?? null);
        setTiers((p.quantity_tiers ?? []).map((t) => ({ qty: String(t.qty), price: String(t.price_cfa) })));
      })
      .catch(() => {});
  }, [editId]);

  const maxImages = kind === 'digital' ? 1 : 10;

  const pickImages = async () => {
    const remaining = maxImages - images.length;
    if (remaining <= 0) return;
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: kind === 'physical', selectionLimit: remaining, quality: 1 });
    if (!res.canceled) setImages((prev) => [...prev, ...res.assets.map((a) => a.uri)].slice(0, maxImages));
  };
  const removeImage = (uri: string) => setImages((prev) => prev.filter((u) => u !== uri));

  const pickFile = async () => {
    const res = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });
    if (!res.canceled && res.assets?.[0]) setFile({ uri: res.assets[0].uri, name: res.assets[0].name });
  };

  const addTier = () => setTiers((t) => [...t, { qty: '', price: '' }]);
  const updateTier = (i: number, f: 'qty' | 'price', v: string) => setTiers((t) => t.map((row, idx) => (idx === i ? { ...row, [f]: v } : row)));
  const removeTier = (i: number) => setTiers((t) => t.filter((_, idx) => idx !== i));

  const submit = async () => {
    setError(null);
    if (!gate('vendre')) return;
    const isFree = kind === 'digital' && free;
    if (!title.trim() || (!isFree && !price.trim())) return setError('Le nom et le prix sont obligatoires.');
    const modo = classifyProduct(title, description);
    if (modo.level === 'blocked') return setError(`🚫 Produit refusé : ${modo.reason}`);
    if (kind === 'digital' && !file && !hadFile) return setError('Ajoute le fichier que recevra l\'acheteur.');
    const priceN = isFree ? 0 : parseInt(price.replace(/\D/g, ''), 10) || 0;
    const promoN = isFree ? null : promo.trim() ? parseInt(promo.replace(/\D/g, ''), 10) : null;
    if (promoN && promoN >= priceN) return setError('Le prix promo doit être inférieur au prix normal.');
    let commissionN = 0;
    if (affiliationOn) commissionN = Math.max(MIN_COMMISSION, parseInt(commission.replace(/\D/g, ''), 10) || 0);

    const quantity_tiers = tiers
      .map((t) => ({ qty: parseInt(t.qty, 10) || 0, price_cfa: parseInt(t.price.replace(/\D/g, ''), 10) || 0 }))
      .filter((t) => t.qty > 0 && t.price_cfa > 0);

    const extras = condition && kind === 'physical' ? `État : ${condition}` : '';
    const finalDesc = [description.trim(), extras].filter(Boolean).join('\n\n');

    setLoading(true);
    try {
      // Conserve les images déjà en ligne (http), n'uploade que les nouvelles (locales)
      const urls: string[] = [];
      for (const uri of images) urls.push(/^https?:\/\//.test(uri) ? uri : await uploadImage('products', uri));
      let digital_file_url: string | null = null;
      // fichier déjà en ligne (édition) → on le garde ; sinon on uploade le nouveau
      if (kind === 'digital' && file) digital_file_url = /^https?:\/\//.test(file.uri) ? file.uri : await uploadFile(file.uri, file.name);

      const payload = {
        title: title.trim(),
        kind,
        price_cfa: priceN,
        promo_cfa: promoN,
        stock: kind === 'digital' ? 999999 : parseInt(stock.replace(/\D/g, ''), 10) || 0,
        commission_pct: commissionN,
        category: kind === 'digital' && !category ? 'digital' : category,
        description: finalDesc || undefined,
        image_url: urls[0] ?? null,
        images: urls,
        quantity_tiers,
        // n'écrase le fichier digital que si un nouveau a été choisi
        ...(digital_file_url ? { digital_file_url } : editId ? {} : { digital_file_url: null }),
      };
      if (editId) await updateProduct(editId, payload);
      else await createProduct(payload);
      (router.canGoBack() ? router.back() : router.replace('/accueil'));
    } catch (e: any) {
      setError(e.message ?? "Erreur lors de l'enregistrement.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: Afylo.bg }}>
        <View style={styles.header}>
          <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/accueil'))} style={styles.hbtn}><Ionicons name="close" size={26} color={Afylo.text} /></Pressable>
          <Text style={styles.title}>{editId ? 'Modifier le produit' : 'Nouveau produit'}</Text>
          <View style={{ width: 40 }} />
        </View>
      </SafeAreaView>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 30 }} keyboardShouldPersistTaps="handled">
          {/* Type — verrouillé en modification (un produit ne change pas de nature) */}
          <View style={styles.typeRow}>
            {(['physical', 'digital'] as const).map((k) => (
              <Pressable key={k} disabled={!!editId} onPress={() => setKind(k)} style={[styles.type, kind === k && styles.typeOn, !!editId && kind !== k && { opacity: 0.35 }]}>
                <Ionicons name={k === 'physical' ? 'cube-outline' : 'cloud-download-outline'} size={18} color={kind === k ? '#fff' : Afylo.textDim} />
                <Text style={[styles.typeText, kind === k && { color: '#fff' }]}>{k === 'physical' ? 'Physique' : 'Digital'}</Text>
              </Pressable>
            ))}
          </View>
          {!!editId && <Text style={styles.lockNote}>🔒 Le type ne peut pas être changé après création.</Text>}

          {/* Photos */}
          <Text style={styles.section}>{kind === 'digital' ? 'Visuel (1 image)' : 'Photos'}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingVertical: 12 }}>
            {images.map((uri, i) => (
              <View key={uri} style={styles.thumb}>
                <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="cover" />
                {i === 0 && kind === 'physical' && <View style={styles.coverTag}><Text style={styles.coverText}>Couverture</Text></View>}
                <Pressable onPress={() => removeImage(uri)} style={styles.thumbX}><Ionicons name="close" size={14} color="#fff" /></Pressable>
              </View>
            ))}
            {images.length < maxImages && (
              <Pressable onPress={pickImages} style={styles.addThumb}>
                <Ionicons name="camera" size={26} color={Afylo.violet} />
                <Text style={styles.addThumbText}>Ajouter</Text>
              </Pressable>
            )}
          </ScrollView>

          {/* Fichier digital */}
          {kind === 'digital' && (
            <Card>
              <Text style={styles.cardTitle}>Fichier livré à l'acheteur</Text>
              <Pressable onPress={pickFile} style={styles.fileBtn}>
                <Ionicons name={file ? 'document-attach' : 'cloud-upload-outline'} size={22} color={Afylo.violet} />
                <Text style={styles.fileText} numberOfLines={1}>{file ? file.name : 'Choisir un fichier (PDF, ZIP, MP3…)'}</Text>
              </Pressable>
              {/* Téléchargement gratuit — réservé aux produits digitaux */}
              <View style={[styles.switchRow, { marginTop: 12 }]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.switchTitle}>Téléchargement gratuit</Text>
                  <Text style={styles.switchHint}>Les acheteurs le téléchargent sans payer.</Text>
                </View>
                <Switch value={free} onValueChange={setFree} trackColor={{ true: Afylo.violet }} />
              </View>
              <Text style={styles.hint}>Stock illimité (∞) · {free ? 'gratuit — aucun paiement.' : 'envoyé après paiement sécurisé XaalisPay.'}</Text>
            </Card>
          )}

          {/* Catégorie (pour le marketplace / filtres) */}
          <Card>
            <Text style={styles.cardTitle}>Catégorie</Text>
            <View style={styles.chips}>
              {PRODUCT_CATEGORIES.map((c) => (
                <Pressable key={c.key} onPress={() => setCategory((v) => (v === c.key ? null : c.key))} style={[styles.chip, category === c.key && styles.chipOn]}>
                  <Ionicons name={c.icon as any} size={14} color={category === c.key ? '#fff' : Afylo.textDim} />
                  <Text style={[styles.chipText, category === c.key && { color: '#fff' }]}>{c.label}</Text>
                </Pressable>
              ))}
            </View>
          </Card>

          {/* Infos */}
          <Card>
            <Field label="Nom du produit *" value={title} onChange={setTitle} placeholder="Ex : Ensemble wax / Ebook marketing" />
            {kind === 'digital' && free ? (
              <View style={styles.freeBanner}><Ionicons name="gift" size={18} color={Afylo.green} /><Text style={styles.freeBannerText}>Produit gratuit — aucun prix.</Text></View>
            ) : (
              <View style={styles.row}>
                <View style={{ flex: 1 }}><Field label="Prix (FCFA) *" value={price} onChange={setPrice} placeholder="18500" numeric /></View>
                <View style={{ flex: 1 }}><Field label="Prix promo" value={promo} onChange={setPromo} placeholder="14900" numeric /></View>
              </View>
            )}
            {kind === 'physical' && <Field label="Stock disponible" value={stock} onChange={setStock} placeholder="24" numeric />}
          </Card>

          {/* Physique : état + offres de quantité */}
          {kind === 'physical' && (
            <Card>
              <Text style={styles.cardTitle}>Détails</Text>
              <Text style={styles.subLabel}>État du produit</Text>
              <View style={styles.chips}>
                {CONDITIONS.map((c) => (
                  <Pressable key={c} onPress={() => setCondition((v) => (v === c ? null : c))} style={[styles.chip, condition === c && styles.chipOn]}>
                    <Text style={[styles.chipText, condition === c && { color: '#fff' }]}>{c}</Text>
                  </Pressable>
                ))}
              </View>

              <Text style={[styles.subLabel, { marginTop: 14 }]}>Offres de quantité (prix par lot)</Text>
              {tiers.map((t, i) => (
                <View key={i} style={styles.tierRow}>
                  <TextInput style={[styles.input, styles.tierQty]} value={t.qty} onChangeText={(v) => updateTier(i, 'qty', v)} placeholder="Qté" placeholderTextColor={Afylo.textFaint} keyboardType="numeric" />
                  <Text style={styles.tierArrow}>→</Text>
                  <TextInput style={[styles.input, { flex: 1 }]} value={t.price} onChangeText={(v) => updateTier(i, 'price', v)} placeholder="Prix total (FCFA)" placeholderTextColor={Afylo.textFaint} keyboardType="numeric" />
                  <Pressable onPress={() => removeTier(i)} style={styles.tierX}><Ionicons name="close" size={18} color={Afylo.live} /></Pressable>
                </View>
              ))}
              <Pressable onPress={addTier} style={styles.addTier}>
                <Ionicons name="add-circle-outline" size={20} color={Afylo.violet} />
                <Text style={styles.addTierText}>Ajouter un palier (ex : 1 → 3000, 2 → 5000)</Text>
              </Pressable>
            </Card>
          )}

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
                <Field label="Commission (%) — min. 5" value={commission} onChange={setCommission} placeholder="15" numeric />
                <Text style={styles.hint}>Cette commission ({Math.max(MIN_COMMISSION, parseInt(commission, 10) || 0)}%) va au créateur qui revend ton produit. Afylo prélève 5% de la vente en plus.</Text>
              </>
            )}
          </Card>

          <Card>
            <Field label="Description" value={description} onChange={setDescription} placeholder="Détails, livraison, contenu..." multiline />
          </Card>

          {error && <Text style={styles.error}>{error}</Text>}

          <Pressable onPress={submit} disabled={loading} style={[styles.publish, loading && { opacity: 0.6 }]}>
            <Ionicons name="checkmark-circle" size={20} color="#fff" />
            <Text style={styles.publishText}>{loading ? 'Enregistrement…' : editId ? 'Enregistrer les modifications' : 'Publier le produit'}</Text>
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

  typeRow: { flexDirection: 'row', gap: 10, marginBottom: 6 },
  type: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 46, borderRadius: Radius.md, backgroundColor: Afylo.surface, borderWidth: 1, borderColor: Afylo.border },
  typeOn: { backgroundColor: Afylo.violet, borderColor: Afylo.violet },
  typeText: { ...Type.body, fontFamily: Font.semibold, color: Afylo.textDim },

  section: { ...Type.body, fontFamily: Font.semibold, color: Afylo.text, marginTop: 8 },
  hint: { ...Type.caption, color: Afylo.textDim, marginTop: 8, lineHeight: 17 },
  lockNote: { ...Type.caption, color: Afylo.textDim, marginTop: 8, marginLeft: 2 },
  freeBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Afylo.green + '1A', borderRadius: Radius.md, paddingHorizontal: 14, height: 48, marginTop: 4 },
  freeBannerText: { color: Afylo.green, fontFamily: Font.semibold, fontSize: 14 },
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

  fileBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: Afylo.bg, borderRadius: Radius.md, borderWidth: 1.5, borderStyle: 'dashed', borderColor: Afylo.violet, padding: 14 },
  fileText: { ...Type.body, color: Afylo.text, flex: 1 },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: Radius.pill, backgroundColor: Afylo.bg, borderWidth: 1, borderColor: Afylo.border },
  chipOn: { backgroundColor: Afylo.violet, borderColor: Afylo.violet },
  chipText: { ...Type.small, color: Afylo.text },

  tierRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  tierQty: { width: 64, textAlign: 'center' },
  tierArrow: { color: Afylo.textDim, fontSize: 18 },
  tierX: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  addTier: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  addTierText: { ...Type.small, color: Afylo.violet, fontFamily: Font.semibold },

  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  switchTitle: { ...Type.body, fontFamily: Font.semibold, color: Afylo.text },
  switchHint: { ...Type.caption, color: Afylo.textDim, marginTop: 2, lineHeight: 17 },

  error: { color: Afylo.live, ...Type.small, fontFamily: Font.semibold, marginTop: 16 },
  publish: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 54, borderRadius: Radius.pill, backgroundColor: Afylo.violet, marginTop: 20 },
  publishText: { color: '#fff', fontFamily: Font.semibold, fontSize: 16 },
});
