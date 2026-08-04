import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Afylo, Font, Radius, Type } from '@/constants/brand';
import { submitKyc } from '@/lib/db';

/** Convertit "JJ/MM/AAAA" → { iso: "AAAA-MM-JJ", age } ou null si invalide. */
function parseBirth(v: string): { iso: string; age: number } | null {
  const m = v.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  const d = +m[1], mo = +m[2], y = +m[3];
  if (mo < 1 || mo > 12 || d < 1 || d > 31 || y < 1900) return null;
  const iso = `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  // âge (sans Date.now interdit ? on est dans l'app, Date est OK)
  const today = new Date();
  let age = today.getFullYear() - y;
  if (today.getMonth() + 1 < mo || (today.getMonth() + 1 === mo && today.getDate() < d)) age--;
  return { iso, age };
}

export function KycSheet({ visible, onClose, onVerified }: { visible: boolean; onClose: () => void; onVerified: () => void }) {
  const [name, setName] = useState('');
  const [birth, setBirth] = useState('');
  const [idDoc, setIdDoc] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pickId = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (!res.canceled) setIdDoc(res.assets[0].uri);
  };

  const submit = async () => {
    setError(null);
    if (name.trim().length < 3) return setError('Renseigne ton nom légal complet.');
    const b = parseBirth(birth);
    if (!b) return setError('Date de naissance invalide (format JJ/MM/AAAA).');
    if (b.age < 18) return setError('Tu dois avoir 18 ans ou plus pour retirer tes gains.');
    if (!idDoc) return setError("Ajoute une photo de ta pièce d'identité.");
    setBusy(true);
    try {
      await submitKyc({ legal_name: name.trim(), birthdate: b.iso });
      onVerified();
      onClose();
    } catch (e: any) {
      setError(e?.message ?? 'Erreur, réessaie.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.grip} />
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <View style={styles.iconWrap}><Ionicons name="shield-checkmark" size={28} color={Afylo.violet} /></View>
            <Text style={styles.title}>Vérifie ton identité</Text>
            <Text style={styles.sub}>Obligatoire avant de retirer tes gains. Réservé aux 18 ans et plus.</Text>

            <Text style={styles.label}>Nom légal complet</Text>
            <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Comme sur ta pièce d'identité" placeholderTextColor={Afylo.textFaint} />

            <Text style={styles.label}>Date de naissance</Text>
            <TextInput style={styles.input} value={birth} onChangeText={setBirth} placeholder="JJ/MM/AAAA" placeholderTextColor={Afylo.textFaint} keyboardType="numbers-and-punctuation" />

            <Text style={styles.label}>Pièce d'identité</Text>
            <Pressable onPress={pickId} style={styles.idBtn}>
              {idDoc ? (
                <Image source={{ uri: idDoc }} style={styles.idPreview} contentFit="cover" />
              ) : (
                <>
                  <Ionicons name="card-outline" size={22} color={Afylo.violet} />
                  <Text style={styles.idText}>Ajouter une photo (CNI, passeport…)</Text>
                </>
              )}
            </Pressable>
            <Text style={styles.privacy}>🔒 Tes documents servent uniquement à la vérification et ne sont jamais publics.</Text>

            {error && <Text style={styles.error}>{error}</Text>}

            <Pressable onPress={submit} disabled={busy} style={[styles.submitBtn, busy && { opacity: 0.6 }]}>
              <Text style={styles.submitText}>{busy ? 'Vérification…' : 'Vérifier mon identité'}</Text>
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: '#00000066', justifyContent: 'flex-end' },
  sheet: { backgroundColor: Afylo.bg, borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: 18, paddingBottom: 24, maxHeight: '90%' },
  grip: { width: 38, height: 4, borderRadius: 2, backgroundColor: Afylo.border, alignSelf: 'center', marginBottom: 12 },
  iconWrap: { width: 60, height: 60, borderRadius: 30, backgroundColor: Afylo.violet + '1A', alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 10 },
  title: { ...Type.title, color: Afylo.text, textAlign: 'center' },
  sub: { ...Type.body, color: Afylo.textDim, textAlign: 'center', marginTop: 6, marginBottom: 16, lineHeight: 20 },
  label: { ...Type.small, fontFamily: Font.semibold, color: Afylo.text, marginBottom: 6, marginTop: 8 },
  input: { backgroundColor: Afylo.surface, borderRadius: Radius.md, borderWidth: 1, borderColor: Afylo.border, color: Afylo.text, fontSize: 15, paddingHorizontal: 14, height: 50 },
  idBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 100, borderRadius: Radius.md, borderWidth: 1.5, borderStyle: 'dashed', borderColor: Afylo.violet, backgroundColor: Afylo.surface, overflow: 'hidden' },
  idPreview: { width: '100%', height: '100%' },
  idText: { color: Afylo.violet, fontFamily: Font.semibold, fontSize: 14 },
  privacy: { ...Type.caption, color: Afylo.textDim, marginTop: 8, lineHeight: 16 },
  error: { color: Afylo.live, fontSize: 14, marginTop: 12, fontWeight: '600' },
  submitBtn: { height: 52, borderRadius: Radius.pill, backgroundColor: Afylo.violet, alignItems: 'center', justifyContent: 'center', marginTop: 18 },
  submitText: { color: '#fff', fontFamily: Font.bold, fontSize: 16 },
});
