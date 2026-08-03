import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Linking, Modal, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';

import { Afylo, Font, Radius, Type } from '@/constants/brand';
import { maskCard, maskPhone, useCheckoutProfile, type PayMethod } from '@/lib/checkout-profile';

// Moyens mobile money par pays + carte bancaire (via XaalisPay, universel)
const MOBILE: Record<string, { id: string; name: string; color: string }[]> = {
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
  const { profile, isComplete, setProfile } = useCheckoutProfile();
  const [country] = useState('Sénégal');
  const [method, setMethod] = useState<string>(profile.preferred);
  const [phone, setPhone] = useState(profile.phone);
  const [name, setName] = useState(profile.name);
  const [address, setAddress] = useState(profile.address);
  const [remember, setRemember] = useState(true);
  const [status, setStatus] = useState<Status>('form');
  const [chosen, setChosen] = useState<number | null>(items.length > 1 ? null : 0);

  // Réaligne sur le profil enregistré à chaque ouverture
  useEffect(() => {
    if (visible) { setName(profile.name); setPhone(profile.phone); setAddress(profile.address); setMethod(profile.preferred); setStatus('form'); setChosen(items.length > 1 ? null : 0); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const item = items[chosen ?? 0] ?? { title: 'Produit', price: '' };
  const title = item.title;
  const price = item.price;
  const methods = [...(MOBILE[country] ?? MOBILE['Sénégal']), { id: 'card', name: 'Carte bancaire', color: Afylo.violet }];
  const methodName = methods.find((m) => m.id === method)?.name ?? 'l\'opérateur';
  const cardReady = method !== 'card' || !!profile.card;
  const canPay = !!method && cardReady && (method === 'card' ? true : phone.trim().length >= 6) && name.trim().length >= 2;

  const reset = () => { setStatus('form'); setChosen(items.length > 1 ? null : 0); };
  const close = () => { reset(); onClose(); };
  const pay = () => {
    if (!canPay) return;
    if (remember) setProfile({ name: name.trim(), phone: phone.trim(), address: address.trim(), preferred: method as PayMethod });
    setStatus('processing');
    // Simulation : l'intégration réelle passera par l'API XaalisPay (redirection opérateur / carte)
    setTimeout(() => setStatus('done'), 1600);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={close} />
        <View style={styles.sheet}>
          <View style={styles.grip} />
          <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} bounces={false} keyboardShouldPersistTaps="handled">

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

              {/* Identité enregistrée (achat 1-clic) */}
              {isComplete && (
                <View style={styles.identity}>
                  <View style={styles.identityIcon}><Ionicons name="flash" size={16} color={Afylo.violet} /></View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.identityName}>{profile.name}</Text>
                    <Text style={styles.identitySub}>{method === 'card' && profile.card ? maskCard(profile.card) : maskPhone(profile.phone)} · achat 1-clic</Text>
                  </View>
                  <Ionicons name="checkmark-circle" size={20} color={Afylo.green} />
                </View>
              )}

              {/* Moyens de paiement */}
              <Text style={styles.section}>{isComplete ? 'Payer avec' : `Moyen de paiement · ${country}`}</Text>
              <View style={styles.methods}>
                {methods.map((m) => {
                  const dis = m.id === 'card' && !profile.card;
                  return (
                    <Pressable key={m.id} onPress={() => !dis && setMethod(m.id)} style={[styles.method, method === m.id && { borderColor: m.color, borderWidth: 2 }, dis && { opacity: 0.5 }]}>
                      <View style={[styles.methodDot, { backgroundColor: m.color }]}>
                        {m.id === 'card' ? <Ionicons name="card" size={16} color="#fff" /> : <Text style={styles.methodDotText}>{m.name[0]}</Text>}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.methodName}>{m.name}</Text>
                        {m.id === 'card' && <Text style={styles.methodHint}>{profile.card ? maskCard(profile.card) : 'À ajouter dans Paramètres'}</Text>}
                      </View>
                      {method === m.id && <Ionicons name="checkmark-circle" size={20} color={m.color} />}
                    </Pressable>
                  );
                })}
              </View>

              {/* Coordonnées — seulement si pas de profil enregistré et paiement mobile money */}
              {!isComplete && method !== 'card' && (
                <>
                  <TextInput style={styles.input} value={phone} onChangeText={setPhone} placeholder="Numéro mobile money (ex : 77 123 45 67)" placeholderTextColor={Afylo.textFaint} keyboardType="phone-pad" />
                  <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Nom complet" placeholderTextColor={Afylo.textFaint} />
                  <TextInput style={styles.input} value={address} onChangeText={setAddress} placeholder="Adresse de livraison (quartier, rue, ville)" placeholderTextColor={Afylo.textFaint} />
                  <View style={styles.rememberRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.rememberText}>Enregistrer pour la prochaine fois</Text>
                      <Text style={styles.rememberSub}>Achat en 1 clic ensuite (modifiable dans Paramètres).</Text>
                    </View>
                    <Switch value={remember} onValueChange={setRemember} trackColor={{ true: Afylo.violet }} />
                  </View>
                </>
              )}

              <Pressable onPress={pay} disabled={!canPay || status === 'processing'} style={[styles.payBtn, (!canPay || status === 'processing') && { opacity: 0.5 }]}>
                {status === 'processing' ? (
                  <Text style={styles.payText}>{method === 'card' ? 'Paiement carte sécurisé…' : `Redirection vers ${methodName}…`}</Text>
                ) : (
                  <Text style={styles.payText}>{isComplete ? `Payer ${price} en 1 clic` : `Payer ${price}`}</Text>
                )}
              </Pressable>

              <Pressable onPress={() => Linking.openURL('https://www.xaalispay.com/')} style={styles.footer}>
                <Ionicons name="shield-checkmark" size={14} color={Afylo.textDim} />
                <Text style={styles.footerText}>Argent bloqué jusqu'à la livraison · xaalispay.com</Text>
              </Pressable>
            </>
          )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: '#00000066', justifyContent: 'flex-end' },
  sheet: { backgroundColor: Afylo.glass, borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingHorizontal: 18, paddingTop: 10, paddingBottom: 18, maxHeight: '84%', overflow: 'hidden' },
  scroll: { flexShrink: 1 },
  grip: { width: 38, height: 4, borderRadius: 2, backgroundColor: Afylo.border, alignSelf: 'center', marginBottom: 10 },

  secure: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 12 },
  secureText: { ...Type.small, color: Afylo.textDim },
  xpBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  xpDot: { width: 12, height: 12, borderRadius: 6 },
  xpText: { ...Type.small, fontFamily: Font.bold, color: '#1F4E79', marginLeft: 2 },

  product: { alignItems: 'center', marginBottom: 12 },
  productTitle: { ...Type.small, color: Afylo.textDim },
  productPrice: { ...Type.title, fontSize: 26, color: Afylo.text, marginTop: 2 },

  section: { ...Type.small, fontFamily: Font.semibold, color: Afylo.text, marginBottom: 8 },
  chooseRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: Afylo.surface, borderRadius: Radius.md, borderWidth: 1, borderColor: Afylo.border, padding: 12 },
  chooseIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#3E5BFF14', alignItems: 'center', justifyContent: 'center' },
  chooseTitle: { ...Type.body, fontFamily: Font.semibold, color: Afylo.text, flex: 1 },
  choosePrice: { ...Type.body, fontFamily: Font.bold, color: Afylo.violet },
  methods: { gap: 8, marginBottom: 12 },
  method: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: Afylo.surface, borderRadius: Radius.md, borderWidth: 1, borderColor: Afylo.border, padding: 10 },
  methodDot: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  methodDotText: { color: '#fff', fontFamily: Font.bold, fontSize: 15 },
  methodName: { ...Type.body, fontFamily: Font.semibold, color: Afylo.text },
  methodHint: { ...Type.caption, color: Afylo.textDim, marginTop: 1 },

  identity: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#3E5BFF0F', borderWidth: 1, borderColor: '#3E5BFF33', borderRadius: Radius.md, padding: 10, marginBottom: 12 },
  identityIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#3E5BFF1A', alignItems: 'center', justifyContent: 'center' },
  identityName: { ...Type.body, fontFamily: Font.bold, color: Afylo.text },
  identitySub: { ...Type.caption, color: Afylo.textDim, marginTop: 1 },

  rememberRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 2, marginBottom: 8 },
  rememberText: { ...Type.body, fontFamily: Font.semibold, color: Afylo.text },
  rememberSub: { ...Type.caption, color: Afylo.textDim, marginTop: 1 },

  input: { backgroundColor: Afylo.surface, borderRadius: Radius.md, borderWidth: 1, borderColor: Afylo.border, color: Afylo.text, ...Type.body, paddingHorizontal: 16, height: 48, marginBottom: 10 },

  payBtn: { height: 50, borderRadius: Radius.pill, backgroundColor: Afylo.violet, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  payText: { color: '#fff', fontFamily: Font.semibold, fontSize: 16 },

  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 10 },
  footerText: { ...Type.caption, color: Afylo.textDim },

  doneBox: { alignItems: 'center', paddingVertical: 8 },
  doneCircle: { width: 68, height: 68, borderRadius: 34, backgroundColor: Afylo.green, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  doneTitle: { ...Type.title, color: Afylo.text },
  doneSub: { ...Type.body, color: Afylo.textDim, textAlign: 'center', marginTop: 8, lineHeight: 22 },
});
