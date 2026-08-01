import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Afryko, Font, Radius, Type } from '@/constants/brand';

const PRESETS = [500, 1000, 2000, 5000, 10000, 25000];
const METHODS = [
  { id: 'wave', name: 'Wave', color: '#1DC3F0' },
  { id: 'om', name: 'Orange Money', color: '#FF7900' },
];

/**
 * Cadeau en argent réel (façon TikTok mais c'est du cash) offert au créateur.
 * Montant -> paiement mobile money (Wave/OM) -> envoyé au streamer.
 */
export function GiftSheet({ visible, host, onClose, onSent }: { visible: boolean; host: string; onClose: () => void; onSent: (amount: number) => void }) {
  const [step, setStep] = useState<'amount' | 'pay' | 'done'>('amount');
  const [amount, setAmount] = useState(1000);
  const [custom, setCustom] = useState('');
  const [method, setMethod] = useState('wave');
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);

  const finalAmount = custom ? parseInt(custom.replace(/\D/g, ''), 10) || amount : amount;

  const reset = () => { setStep('amount'); setCustom(''); setPhone(''); };
  const close = () => { reset(); onClose(); };
  const confirm = () => {
    if (phone.trim().length < 6) return;
    setBusy(true);
    setTimeout(() => {
      setBusy(false);
      setStep('done');
      onSent(finalAmount);
      setTimeout(close, 1400);
    }, 1400);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={close} />
        <View style={styles.sheet}>
          <View style={styles.grip} />

          {step === 'done' ? (
            <View style={styles.doneBox}>
              <Text style={styles.giftEmoji}>🎁</Text>
              <Text style={styles.doneTitle}>Cadeau envoyé !</Text>
              <Text style={styles.doneSub}>Tu as offert {finalAmount.toLocaleString('fr-FR')} FCFA à {host}. Merci de soutenir les créateurs 💛</Text>
            </View>
          ) : step === 'amount' ? (
            <>
              <Text style={styles.title}>Offrir un cadeau à {host}</Text>
              <Text style={styles.sub}>C'est de l'argent réel, envoyé directement au créateur.</Text>
              <View style={styles.grid}>
                {PRESETS.map((p) => (
                  <Pressable key={p} onPress={() => { setAmount(p); setCustom(''); }} style={[styles.amount, amount === p && !custom && styles.amountOn]}>
                    <Text style={styles.giftIcon}>🎁</Text>
                    <Text style={[styles.amountText, amount === p && !custom && { color: '#fff' }]}>{p.toLocaleString('fr-FR')}</Text>
                  </Pressable>
                ))}
              </View>
              <TextInput style={styles.input} value={custom} onChangeText={setCustom} placeholder="Montant libre (FCFA)" placeholderTextColor={Afryko.textFaint} keyboardType="numeric" />
              <Pressable onPress={() => setStep('pay')} style={styles.cta}>
                <Text style={styles.ctaText}>Continuer · {finalAmount.toLocaleString('fr-FR')} FCFA</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Text style={styles.title}>Paiement du cadeau</Text>
              <Text style={styles.big}>{finalAmount.toLocaleString('fr-FR')} <Text style={styles.big2}>FCFA</Text></Text>
              <View style={styles.methods}>
                {METHODS.map((m) => (
                  <Pressable key={m.id} onPress={() => setMethod(m.id)} style={[styles.method, method === m.id && { borderColor: m.color, borderWidth: 2 }]}>
                    <View style={[styles.mDot, { backgroundColor: m.color }]}><Text style={styles.mDotText}>{m.name[0]}</Text></View>
                    <Text style={styles.mName}>{m.name}</Text>
                    {method === m.id && <Ionicons name="checkmark-circle" size={20} color={m.color} />}
                  </Pressable>
                ))}
              </View>
              <TextInput style={styles.input} value={phone} onChangeText={setPhone} placeholder="Numéro mobile money" placeholderTextColor={Afryko.textFaint} keyboardType="phone-pad" />
              <Pressable onPress={confirm} disabled={busy || phone.trim().length < 6} style={[styles.cta, (busy || phone.trim().length < 6) && { opacity: 0.5 }]}>
                <Text style={styles.ctaText}>{busy ? 'Envoi…' : `Envoyer ${finalAmount.toLocaleString('fr-FR')} FCFA`}</Text>
              </Pressable>
              <Text style={styles.secure}>🔒 Sécurisé par XaalisPay · xaalispay.com</Text>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: '#00000066', justifyContent: 'flex-end' },
  sheet: { backgroundColor: Afryko.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 22, paddingBottom: 34 },
  grip: { width: 40, height: 4, borderRadius: 2, backgroundColor: Afryko.border, alignSelf: 'center', marginBottom: 16 },
  title: { ...Type.subtitle, color: Afryko.text, textAlign: 'center' },
  sub: { ...Type.small, color: Afryko.textDim, textAlign: 'center', marginTop: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 18, justifyContent: 'center' },
  amount: { width: '30%', flexGrow: 1, alignItems: 'center', gap: 4, paddingVertical: 14, borderRadius: Radius.md, backgroundColor: Afryko.surfaceAlt, borderWidth: 1, borderColor: Afryko.border },
  amountOn: { backgroundColor: Afryko.violet, borderColor: Afryko.violet },
  giftIcon: { fontSize: 22 },
  amountText: { ...Type.body, fontFamily: Font.bold, color: Afryko.text },
  input: { backgroundColor: Afryko.surfaceAlt, borderRadius: Radius.md, borderWidth: 1, borderColor: Afryko.border, color: Afryko.text, ...Type.body, paddingHorizontal: 16, height: 52, marginTop: 14 },
  cta: { height: 54, borderRadius: Radius.pill, backgroundColor: Afryko.violet, alignItems: 'center', justifyContent: 'center', marginTop: 16 },
  ctaText: { color: '#fff', fontFamily: Font.semibold, fontSize: 16 },

  big: { ...Type.title, fontSize: 40, color: Afryko.violet, textAlign: 'center', marginTop: 8 },
  big2: { fontSize: 18, color: Afryko.textDim },
  methods: { gap: 10, marginTop: 16 },
  method: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: Afryko.surfaceAlt, borderRadius: Radius.md, borderWidth: 1, borderColor: Afryko.border, padding: 12 },
  mDot: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  mDotText: { color: '#fff', fontFamily: Font.bold },
  mName: { ...Type.body, fontFamily: Font.semibold, color: Afryko.text, flex: 1 },
  secure: { ...Type.caption, color: Afryko.textDim, textAlign: 'center', marginTop: 14 },

  doneBox: { alignItems: 'center', paddingVertical: 16 },
  giftEmoji: { fontSize: 56 },
  doneTitle: { ...Type.title, color: Afryko.text, marginTop: 12 },
  doneSub: { ...Type.body, color: Afryko.textDim, textAlign: 'center', marginTop: 8, lineHeight: 22 },
});
