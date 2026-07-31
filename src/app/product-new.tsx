import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PillButton } from '@/components/ui-kit';
import { Afylo, Radius } from '@/constants/brand';
import { useAuth } from '@/lib/auth';
import { createProduct } from '@/lib/db';

export default function ProductNew() {
  const router = useRouter();
  const { session } = useAuth();

  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('');
  const [commission, setCommission] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    setLoading(true);
    try {
      await createProduct({
        title: title.trim(),
        price_cfa: parseInt(price.replace(/\D/g, ''), 10) || 0,
        stock: parseInt(stock.replace(/\D/g, ''), 10) || 0,
        commission_pct: parseFloat(commission.replace(',', '.')) || 0,
        description: description.trim() || undefined,
        image_url: imageUrl.trim() || null,
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
          <Pressable onPress={() => router.back()} style={styles.back}>
            <Ionicons name="close" size={26} color={Afylo.text} />
          </Pressable>
          <Text style={styles.title}>Nouveau produit</Text>
          <View style={{ width: 40 }} />
        </View>
      </SafeAreaView>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
          {/* Aperçu image */}
          <View style={styles.imageBox}>
            {imageUrl ? (
              <Text style={styles.imageUrlPreview} numberOfLines={1}>🖼️ {imageUrl}</Text>
            ) : (
              <>
                <Ionicons name="image-outline" size={30} color={Afylo.textFaint} />
                <Text style={styles.imageHint}>Colle une URL d'image ci-dessous</Text>
                <Text style={styles.imageHintSmall}>(l'upload photo depuis le téléphone viendra ensuite)</Text>
              </>
            )}
          </View>

          <Label text="Nom du produit *" />
          <Input value={title} onChange={setTitle} placeholder="Ex : Ensemble wax premium" />

          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Label text="Prix (FCFA) *" />
              <Input value={price} onChange={setPrice} placeholder="18500" keyboardType="numeric" />
            </View>
            <View style={{ flex: 1 }}>
              <Label text="Stock" />
              <Input value={stock} onChange={setStock} placeholder="24" keyboardType="numeric" />
            </View>
          </View>

          <Label text="Commission affiliation (%)" />
          <Input value={commission} onChange={setCommission} placeholder="15" keyboardType="numeric" />
          <Text style={styles.helper}>Le % que gagne un créateur qui revend ton produit.</Text>

          <Label text="Image (URL)" />
          <Input value={imageUrl} onChange={setImageUrl} placeholder="https://..." />

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
  back: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { color: Afylo.text, fontSize: 18, fontWeight: '800' },

  imageBox: {
    height: 130,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: Afylo.surfaceAlt,
    backgroundColor: Afylo.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    paddingHorizontal: 16,
  },
  imageHint: { color: Afylo.textDim, fontSize: 13, marginTop: 8 },
  imageHintSmall: { color: Afylo.textFaint, fontSize: 11, marginTop: 2 },
  imageUrlPreview: { color: Afylo.violet, fontSize: 13 },

  label: { color: Afylo.text, fontSize: 14, fontWeight: '700', marginTop: 16, marginBottom: 8 },
  input: {
    backgroundColor: Afylo.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Afylo.surfaceAlt,
    color: Afylo.text,
    fontSize: 15,
    paddingHorizontal: 14,
    height: 50,
  },
  row: { flexDirection: 'row', gap: 12 },
  helper: { color: Afylo.textFaint, fontSize: 12, marginTop: 6 },
  error: { color: Afylo.live, fontSize: 14, marginTop: 16, fontWeight: '600' },
});
