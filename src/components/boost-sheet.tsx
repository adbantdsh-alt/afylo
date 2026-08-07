import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Afylo, Font, Radius, Type } from '@/constants/brand';
import { createBoost, type BoostTarget } from '@/lib/db';
import { formatCfa } from '@/types/db';

export type BoostTargetInfo = { kind: BoostTarget; id: string; title: string; image?: string };

// Forfaits (budget → durée → portée estimée). Micro-budgets adaptés au Mobile Money.
const PACKS = [
  { budget: 1000, days: 3, reach: '2 000 – 5 000 vues' },
  { budget: 2500, days: 7, reach: '8 000 – 15 000 vues' },
  { budget: 5000, days: 15, reach: '20 000 – 40 000 vues' },
];
const METHODS = [
  { id: 'wave', name: 'Wave', color: '#1DC3F0' },
  { id: 'om', name: 'Orange Money', color: '#FF7900' },
];

type Status = 'form' | 'processing' | 'done';

export function BoostSheet({ visible, target, onClose, onDone }: { visible: boolean; target: BoostTargetInfo | null; onClose: () => void; onDone?: () => void }) {
  const [packIdx, setPackIdx] = useState(0);
  const [method, setMethod] = useState('wave');
  const [status, setStatus] = useState<Status>('form');

  const pack = PACKS[packIdx];
  const label = target?.kind === 'product' ? 'ce produit' : target?.kind === 'live' ? 'ce live' : 'cette publication';

  const reset = () => { setStatus('form'); setPackIdx(0); };
  const close = () => { reset(); onClose(); };

  const pay = () => {
    if (!target) return;
    setStatus('processing');
    // Paiement Mobile Money simulé (MVP) puis création de la campagne.
    setTimeout(async () => {
      try { await createBoost(target.kind, target.id, pack.budget, pack.days); } catch {}
      setStatus('done');
      onDone?.();
    }, 1400);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <Pressable style={styles.overlay} onPress={close}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <SafeAreaView edges={['bottom']}>
            <View style={styles.grip} />

            {status === 'done' ? (
              <View style={styles.doneWrap}>
                <View style={styles.doneIcon}><Ionicons name="rocket" size={30} color="#fff" /></View>
                <Text style={styles.doneTitle}>Promotion lancée 🚀</Text>
                <Text style={styles.doneSub}>{label.charAt(0).toUpperCase() + label.slice(1)} est boostée pour {pack.days} jours. Elle apparaîtra « Sponsorisé » à plus de monde.</Text>
                <Pressable onPress={close} style={styles.payBtn}><Text style={styles.payBtnText}>Terminé</Text></Pressable>
              </View>
            ) : (
              <>
                <View style={styles.head}>
                  <Ionicons name="rocket-outline" size={20} color={Afylo.violet} />
                  <Text style={styles.title}>Promouvoir {label}</Text>
                </View>

                {target && (
                  <View style={styles.targetRow}>
                    {target.image ? <Image source={{ uri: target.image }} style={styles.targetImg} contentFit="cover" /> : <View style={styles.targetImg} />}
                    <Text style={styles.targetTitle} numberOfLines={2}>{target.title}</Text>
                  </View>
                )}

                <Text style={styles.section}>Budget & durée</Text>
                {PACKS.map((p, i) => (
                  <Pressable key={p.budget} onPress={() => setPackIdx(i)} style={[styles.pack, i === packIdx && styles.packOn]}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.packBudget, i === packIdx && { color: '#fff' }]}>{formatCfa(p.budget)} · {p.days} jours</Text>
                      <Text style={[styles.packReach, i === packIdx && { color: '#ffffffcc' }]}>Portée estimée : {p.reach}</Text>
                    </View>
                    <Ionicons name={i === packIdx ? 'radio-button-on' : 'radio-button-off'} size={22} color={i === packIdx ? '#fff' : Afylo.textFaint} />
                  </Pressable>
                ))}

                <Text style={styles.section}>Paiement</Text>
                <View style={styles.methodRow}>
                  {METHODS.map((m) => (
                    <Pressable key={m.id} onPress={() => setMethod(m.id)} style={[styles.method, method === m.id && { borderColor: m.color, borderWidth: 2 }]}>
                      <View style={[styles.methodDot, { backgroundColor: m.color }]} />
                      <Text style={styles.methodName}>{m.name}</Text>
                    </Pressable>
                  ))}
                </View>

                <Text style={styles.note}>Paiement Mobile Money sécurisé · sans engagement · tu peux arrêter à tout moment.</Text>

                <Pressable onPress={pay} disabled={status === 'processing'} style={[styles.payBtn, status === 'processing' && { opacity: 0.6 }]}>
                  <Ionicons name="rocket" size={18} color="#fff" />
                  <Text style={styles.payBtnText}>{status === 'processing' ? 'Paiement…' : `Payer ${formatCfa(pack.budget)} et booster`}</Text>
                </Pressable>
              </>
            )}
          </SafeAreaView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: '#00000088', justifyContent: 'flex-end' },
  sheet: { backgroundColor: Afylo.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 16, paddingTop: 8 },
  grip: { width: 40, height: 4, borderRadius: 2, backgroundColor: Afylo.border, alignSelf: 'center', marginBottom: 12 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  title: { color: Afylo.text, fontFamily: Font.bold, fontSize: 18 },

  targetRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: Afylo.surface, borderRadius: Radius.md, padding: 10, marginBottom: 14 },
  targetImg: { width: 48, height: 48, borderRadius: 8, backgroundColor: Afylo.surfaceAlt },
  targetTitle: { flex: 1, color: Afylo.text, ...Type.small, fontFamily: Font.semibold },

  section: { color: Afylo.textDim, ...Type.caption, fontFamily: Font.semibold, marginBottom: 8, marginTop: 4 },
  pack: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: Afylo.border, borderRadius: Radius.md, padding: 14, marginBottom: 8 },
  packOn: { backgroundColor: Afylo.violet, borderColor: Afylo.violet },
  packBudget: { color: Afylo.text, fontFamily: Font.bold, fontSize: 15 },
  packReach: { color: Afylo.textDim, ...Type.caption, marginTop: 2 },

  methodRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  method: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 48, borderRadius: Radius.md, borderWidth: 1, borderColor: Afylo.border, backgroundColor: Afylo.surface },
  methodDot: { width: 14, height: 14, borderRadius: 7 },
  methodName: { color: Afylo.text, fontFamily: Font.semibold, fontSize: 13 },

  note: { color: Afylo.textDim, ...Type.caption, lineHeight: 16, marginBottom: 12 },
  payBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 52, borderRadius: Radius.pill, backgroundColor: Afylo.violet, marginBottom: 6 },
  payBtnText: { color: '#fff', fontFamily: Font.bold, fontSize: 15 },

  doneWrap: { alignItems: 'center', gap: 10, paddingVertical: 16 },
  doneIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: Afylo.violet, alignItems: 'center', justifyContent: 'center' },
  doneTitle: { color: Afylo.text, fontFamily: Font.bold, fontSize: 19 },
  doneSub: { color: Afylo.textDim, ...Type.body, textAlign: 'center', lineHeight: 20, paddingHorizontal: 10 },
});
