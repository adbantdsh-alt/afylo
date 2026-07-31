import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useState } from 'react';
import { Linking, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Afylo, Font, Radius, Type } from '@/constants/brand';

// Moyens de paiement mobile money par pays (extensible)
const METHODS: Record<string, { id: string; name: string; color: string }[]> = {
  Sénégal: [
    { id: 'wave', name: 'Wave', color: '#1DC3F0' },
    { id: 'om', name: 'Orange Money', color: '#FF7900' },
  ],
  "Côte d'Ivoire": [
    { id: 'wave', name: 'Wave', color: '#1DC3F0' },
    { id: 'om', name: 'Orange Money', color: '#FF7900' },
    { id: 'mtn', name: 'MTN MoMo', color: '#FFCC00' },
  ],
  Mali: [
    { id: 'om', name: 'Orange Money', color: '#FF7900' },
    { id: 'moov', name: 'Moov Money', color: '#0066B3' },
  ],
};

type Status = 'form' | 'processing' | 'done';

export function PaymentSheet({
  visible,
  items,
  onClose,
}: {
  visible: boolean;
  items: { title: string; price: string }[];
  onClose: () => void;
}) {
  const [country] = useState('Sénégal');
  const [method, setMethod] = useState<string | null>('wave');
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [status, setStatus] = useState<Status>('form');
  const [chosen, setChosen] = useState<number | null>(items.length > 1 ? null : 0);

  const item = items[chosen ?? 0] ?? { title: 'Produit', price: '' };
  const title = item.title;
  const price = item.price;
  const methods = METHODS[country] ?? METHODS['Sénégal'];
  const canPay = method && phone.trim().length >= 6 && name.trim().length >= 2;

  const reset = () => {
    setStatus('form');
    setPhone('');
    setName('');
    setChosen(items.length > 1 ? null : 0);
  };
  const close = () => {
    reset();
    onClose();
  };
  const pay = () => {
    if (!canPay) return;
    setStatus('processing');
    // Simulation : l'intégration réelle passera par l'API XaalisPay
    setTimeout(() => setStatus('done'), 1600);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={close} />
        <View style={styles.sheet}>
          <BlurView intensity={40} tint="light" style={StyleSheet.absoluteFill} />
          <View style={styles.grip} />

          {/* En-tête sécurisé */}
          <View style={styles.secure}>
            <Ionicons name="lock-closed" size={16} color={Afylo.green} />
            <Text style={styles.secureText}>Paiement sécurisé avec</Text>
            <View style={styles.xpBadge}>
              <View style={[styles.xpDot, { backgroundColor: '#1F4E79' }]} />
              <View style={[styles.xpDot, { backgroundColor: '#E8A05C', marginLeft: -6 }]} />
              <Text style={styles.xpText}>XaalisPay</Text>
            </View>
          </View>

          {chosen === null ? (
            <View>
              <Text style={styles.section}>Choisis le produit à acheter</Text>
              <View style={{ gap: 10, marginTop: 4 }}>
                {items.map((it, i) => (
                  <Pressable key={i} onPress={() => setChosen(i)} style={styles.chooseRow}>
                    <View style={styles.chooseIcon}>
                      <Ionicons name="bag-handle" size={18} color={Afylo.violet} />
                    </View>
                    <Text style={styles.chooseTitle} numberOfLines={1}>{it.title}</Text>
                    <Text style={styles.choosePrice}>{it.price}</Text>
                    <Ionicons name="chevron-forward" size={18} color={Afylo.textFaint} />
                  </Pressable>
                ))}
              </View>
            </View>
          ) : status === 'done' ? (
            <View style={styles.doneBox}>
              <View style={styles.doneCircle}>
                <Ionicons name="checkmark" size={40} color="#fff" />
              </View>
              <Text style={styles.doneTitle}>Commande confirmée</Text>
              <Text style={styles.doneSub}>
                Ton paiement de {price} est bloqué en séquestre par XaalisPay. Le vendeur sera payé après confirmation
                de livraison — zéro arnaque.
              </Text>
              <Pressable style={styles.payBtn} onPress={close}>
                <Text style={styles.payText}>Terminé</Text>
              </Pressable>
            </View>
          ) : (
            <>
              {/* Produit */}
              <View style={styles.product}>
                <Text style={styles.productTitle} numberOfLines={1}>{title}</Text>
                <Text style={styles.productPrice}>{price}</Text>
              </View>

              {/* Moyens de paiement */}
              <Text style={styles.section}>Moyen de paiement · {country}</Text>
              <View style={styles.methods}>
                {methods.map((m) => (
                  <Pressable key={m.id} onPress={() => setMethod(m.id)} style={[styles.method, method === m.id && { borderColor: m.color, borderWidth: 2 }]}>
                    <View style={[styles.methodDot, { backgroundColor: m.color }]}>
                      <Text style={styles.methodDotText}>{m.name[0]}</Text>
                    </View>
                    <Text style={styles.methodName}>{m.name}</Text>
                    {method === m.id && <Ionicons name="checkmark-circle" size={20} color={m.color} />}
                  </Pressable>
                ))}
              </View>

              {/* Coordonnées */}
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                placeholder="Numéro mobile money (ex : 77 123 45 67)"
                placeholderTextColor={Afylo.textFaint}
                keyboardType="phone-pad"
              />
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Nom complet"
                placeholderTextColor={Afylo.textFaint}
              />

              <Pressable onPress={pay} disabled={!canPay || status === 'processing'} style={[styles.payBtn, (!canPay || status === 'processing') && { opacity: 0.5 }]}>
                {status === 'processing' ? (
                  <Text style={styles.payText}>Paiement en cours…</Text>
                ) : (
                  <Text style={styles.payText}>Payer {price}</Text>
                )}
              </Pressable>

              <Pressable onPress={() => Linking.openURL('https://www.xaalispay.com/')} style={styles.footer}>
                <Ionicons name="shield-checkmark" size={14} color={Afylo.textDim} />
                <Text style={styles.footerText}>Argent bloqué jusqu'à la livraison · xaalispay.com</Text>
              </Pressable>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: '#00000066', justifyContent: 'flex-end' },
  sheet: { backgroundColor: Afylo.glass, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 22, paddingBottom: 34, overflow: 'hidden' },
  grip: { width: 40, height: 4, borderRadius: 2, backgroundColor: Afylo.border, alignSelf: 'center', marginBottom: 16 },

  secure: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 16 },
  secureText: { ...Type.small, color: Afylo.textDim },
  xpBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  xpDot: { width: 12, height: 12, borderRadius: 6 },
  xpText: { ...Type.small, fontFamily: Font.bold, color: '#1F4E79', marginLeft: 2 },

  product: { alignItems: 'center', marginBottom: 18 },
  productTitle: { ...Type.body, color: Afylo.textDim },
  productPrice: { ...Type.title, fontSize: 34, color: Afylo.text, marginTop: 4 },

  section: { ...Type.small, fontFamily: Font.semibold, color: Afylo.text, marginBottom: 10 },
  chooseRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: Afylo.surface, borderRadius: Radius.md, borderWidth: 1, borderColor: Afylo.border, padding: 12 },
  chooseIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#3E5BFF14', alignItems: 'center', justifyContent: 'center' },
  chooseTitle: { ...Type.body, fontFamily: Font.semibold, color: Afylo.text, flex: 1 },
  choosePrice: { ...Type.body, fontFamily: Font.bold, color: Afylo.violet },
  methods: { gap: 10, marginBottom: 16 },
  method: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: Afylo.surface, borderRadius: Radius.md, borderWidth: 1, borderColor: Afylo.border, padding: 12 },
  methodDot: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  methodDotText: { color: '#fff', fontFamily: Font.bold, fontSize: 15 },
  methodName: { ...Type.body, fontFamily: Font.semibold, color: Afylo.text, flex: 1 },

  input: { backgroundColor: Afylo.surface, borderRadius: Radius.md, borderWidth: 1, borderColor: Afylo.border, color: Afylo.text, ...Type.body, paddingHorizontal: 16, height: 52, marginBottom: 12 },

  payBtn: { height: 54, borderRadius: Radius.pill, backgroundColor: Afylo.violet, alignItems: 'center', justifyContent: 'center', marginTop: 6 },
  payText: { color: '#fff', fontFamily: Font.semibold, fontSize: 17 },

  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 14 },
  footerText: { ...Type.caption, color: Afylo.textDim },

  doneBox: { alignItems: 'center', paddingVertical: 10 },
  doneCircle: { width: 76, height: 76, borderRadius: 38, backgroundColor: Afylo.green, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  doneTitle: { ...Type.title, color: Afylo.text },
  doneSub: { ...Type.body, color: Afylo.textDim, textAlign: 'center', marginTop: 8, lineHeight: 22 },
});
