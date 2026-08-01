import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Afylo, Font, Radius } from '@/constants/brand';
import { studioDays, studioKpis, studioTopPosts, wallet, walletTx, type WalletTx } from '@/lib/mock';

const fmt = (n: number) => Math.round(Math.abs(n)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
const signed = (n: number) => (n >= 0 ? '+' : '−') + fmt(Math.abs(n));

type Tab = 'wallet' | 'stats';

export default function Portefeuille() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('wallet');
  const [withdraw, setWithdraw] = useState(false);

  return (
    <View style={styles.root}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: Afylo.bg }}>
        <View style={styles.header}>
          <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/accueil'))} style={styles.back}>
            <Ionicons name="chevron-back" size={24} color={Afylo.text} />
          </Pressable>
          <Text style={styles.title}>Portefeuille</Text>
          <View style={{ flex: 1 }} />
          <Pressable style={styles.back}>
            <Ionicons name="ellipsis-horizontal" size={22} color={Afylo.textDim} />
          </Pressable>
        </View>

        {/* Onglets Portefeuille / Statistiques */}
        <View style={styles.tabs}>
          <TabBtn label="Portefeuille" active={tab === 'wallet'} onPress={() => setTab('wallet')} />
          <TabBtn label="Statistiques" active={tab === 'stats'} onPress={() => setTab('stats')} />
        </View>
      </SafeAreaView>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 48 }}>
        {tab === 'wallet' ? <WalletTab onWithdraw={() => setWithdraw(true)} /> : <StatsTab />}
      </ScrollView>

      <WithdrawSheet visible={withdraw} onClose={() => setWithdraw(false)} />
    </View>
  );
}

/* ---------------- Portefeuille ---------------- */

function WalletTab({ onWithdraw }: { onWithdraw: () => void }) {
  return (
    <>
      {/* Carte solde */}
      <LinearGradient colors={[Afylo.violet, Afylo.violet2]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>Solde disponible</Text>
        <Text style={styles.balanceValue}>{fmt(wallet.available)} <Text style={styles.balanceCur}>{wallet.currency}</Text></Text>

        <View style={styles.pendingRow}>
          <Ionicons name="lock-closed" size={13} color="#ffffffcc" />
          <Text style={styles.pendingText}>{fmt(wallet.pending)} {wallet.currency} en séquestre · libéré à la livraison</Text>
        </View>

        <Pressable style={styles.withdrawBtn} onPress={onWithdraw}>
          <Ionicons name="arrow-down-circle" size={18} color={Afylo.violet} />
          <Text style={styles.withdrawText}>Retirer</Text>
        </Pressable>
      </LinearGradient>

      {/* Méthode de retrait */}
      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <Text style={styles.cardTitle}>Méthode de retrait</Text>
          <Text style={styles.link}>Modifier</Text>
        </View>
        <View style={styles.methodRow}>
          <View style={styles.methodIcon}>
            <Ionicons name="phone-portrait" size={20} color={Afylo.violet} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.methodName}>{wallet.method.label}</Text>
            <Text style={styles.methodSub}>{wallet.method.number}</Text>
          </View>
          <View style={styles.defaultTag}><Text style={styles.defaultTagText}>Par défaut</Text></View>
        </View>
      </View>

      {/* Revenus de la semaine */}
      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <Text style={styles.cardTitle}>Revenus · 7 jours</Text>
          <Text style={styles.link}>Exporter</Text>
        </View>
        {wallet.breakdown.map((b, i) => (
          <View key={i} style={styles.line}>
            <Text style={[styles.lineLabel, b.dim && { color: Afylo.textFaint }]}>{b.label}</Text>
            <Text style={[styles.lineValue, b.dim && { color: Afylo.textFaint }]}>{b.value < 0 ? '−' : ''}{fmt(Math.abs(b.value))} F</Text>
          </View>
        ))}
        <View style={styles.divider} />
        <View style={styles.line}>
          <Text style={styles.netLabel}>Net perçu</Text>
          <Text style={styles.netValue}>{fmt(wallet.breakdown.reduce((s, b) => s + b.value, 0))} F</Text>
        </View>
      </View>

      {/* Historique */}
      <Text style={styles.sectionTitle}>Transactions</Text>
      <View style={styles.card}>
        {walletTx.map((t, i) => (
          <TxRow key={t.id} tx={t} last={i === walletTx.length - 1} />
        ))}
      </View>
    </>
  );
}

const TX_META: Record<WalletTx['kind'], { icon: keyof typeof Ionicons.glyphMap; color: string }> = {
  sale: { icon: 'bag-check', color: Afylo.green },
  tip: { icon: 'gift', color: Afylo.gold },
  affiliation: { icon: 'people', color: Afylo.violet },
  payout: { icon: 'arrow-up-circle', color: Afylo.textDim },
  escrow: { icon: 'lock-closed', color: Afylo.live },
};

function TxRow({ tx, last }: { tx: WalletTx; last: boolean }) {
  const m = TX_META[tx.kind];
  const positive = tx.amount >= 0;
  return (
    <View style={[styles.txRow, !last && styles.txBorder]}>
      <View style={[styles.txIcon, { backgroundColor: m.color + '18' }]}>
        <Ionicons name={m.icon} size={18} color={m.color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.txLabel} numberOfLines={1}>{tx.label}</Text>
        <Text style={styles.txSub}>{tx.sub} · {tx.date}</Text>
      </View>
      <Text style={[styles.txAmount, { color: tx.kind === 'escrow' ? Afylo.textDim : positive ? Afylo.green : Afylo.text }]}>
        {tx.kind === 'escrow' ? fmt(tx.amount) : signed(tx.amount)} F
      </Text>
    </View>
  );
}

/* ---------------- Statistiques ---------------- */

function StatsTab() {
  const maxViews = Math.max(...studioDays.map((d) => d.views));
  return (
    <>
      <View style={styles.kpiGrid}>
        <Kpi icon="eye" label="Vues" value={studioKpis.views7d} trend={studioKpis.viewsTrend} color={Afylo.violet} />
        <Kpi icon="bag-check" label="Ventes" value={studioKpis.sales7d} trend={studioKpis.salesTrend} color={Afylo.green} />
        <Kpi icon="cash" label="Revenus (F)" value={studioKpis.revenue7d} trend={studioKpis.revenueTrend} color={Afylo.gold} />
        <Kpi icon="people" label="Abonnés" value={studioKpis.followers7d} trend="7j" color={Afylo.live} />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Vues par jour</Text>
        <View style={styles.chart}>
          {studioDays.map((d) => (
            <View key={d.d} style={styles.barCol}>
              <View style={styles.barTrack}>
                <LinearGradient colors={[Afylo.violet2, Afylo.violet]} style={[styles.bar, { height: `${(d.views / maxViews) * 100}%` }]} />
              </View>
              <Text style={styles.barLabel}>{d.d}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Top viralité</Text>
        {studioTopPosts.map((p, i) => (
          <View key={p.id} style={styles.viralRow}>
            <Text style={styles.rank}>{i + 1}</Text>
            <Image source={{ uri: p.image }} style={styles.viralThumb} contentFit="cover" />
            <View style={{ flex: 1 }}>
              <Text style={styles.viralViews}>{p.views} vues · {p.sales} ventes</Text>
              <View style={styles.viralTrack}>
                <View style={[styles.viralFill, { width: `${p.viral}%` }]} />
              </View>
            </View>
            <Text style={styles.viralScore}>{p.viral}</Text>
          </View>
        ))}
      </View>
    </>
  );
}

/* ---------------- Sheet retrait ---------------- */

function WithdrawSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const [amount, setAmount] = useState('');
  const [done, setDone] = useState(false);
  const n = parseInt(amount.replace(/\D/g, ''), 10) || 0;
  const valid = n >= 1000 && n <= wallet.available;

  const close = () => { setAmount(''); setDone(false); onClose(); };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <Pressable style={styles.backdrop} onPress={close} />
      <View style={styles.sheet}>
        <View style={styles.grabber} />
        {done ? (
          <View style={{ alignItems: 'center', paddingVertical: 12 }}>
            <View style={styles.okIcon}><Ionicons name="checkmark" size={34} color="#fff" /></View>
            <Text style={styles.okTitle}>Retrait envoyé</Text>
            <Text style={styles.okSub}>{fmt(n)} {wallet.currency} vers {wallet.method.label} {wallet.method.number}. Réception sous quelques minutes.</Text>
            <Pressable style={styles.primaryBtn} onPress={close}>
              <Text style={styles.primaryText}>Terminé</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <Text style={styles.sheetTitle}>Retirer vers {wallet.method.label}</Text>
            <Text style={styles.sheetSub}>Solde disponible : {fmt(wallet.available)} {wallet.currency}</Text>

            <View style={styles.amountWrap}>
              <TextInput
                value={amount}
                onChangeText={(t) => setAmount(t.replace(/[^0-9]/g, ''))}
                keyboardType="number-pad"
                placeholder="0"
                placeholderTextColor={Afylo.textFaint}
                style={styles.amountInput}
              />
              <Text style={styles.amountCur}>{wallet.currency}</Text>
            </View>

            <View style={styles.quickRow}>
              {[10000, 50000, wallet.available].map((q, i) => (
                <Pressable key={i} style={styles.quick} onPress={() => setAmount(String(q))}>
                  <Text style={styles.quickText}>{i === 2 ? 'Tout' : fmt(q)}</Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.destRow}>
              <Ionicons name="phone-portrait" size={18} color={Afylo.violet} />
              <Text style={styles.destText}>{wallet.method.label} · {wallet.method.number}</Text>
            </View>

            {n > 0 && !valid && (
              <Text style={styles.errText}>{n < 1000 ? 'Minimum 1 000 FCFA.' : 'Montant supérieur au solde.'}</Text>
            )}

            <Pressable style={[styles.primaryBtn, !valid && styles.primaryDisabled]} disabled={!valid} onPress={() => setDone(true)}>
              <Text style={styles.primaryText}>{n > 0 ? `Retirer ${fmt(n)} F` : 'Retirer'}</Text>
            </Pressable>
          </>
        )}
      </View>
    </Modal>
  );
}

/* ---------------- Sous-composants ---------------- */

function TabBtn({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable style={styles.tabBtn} onPress={onPress}>
      <Text style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text>
      {active && <View style={styles.tabUnderline} />}
    </Pressable>
  );
}

function Kpi({ icon, label, value, trend, color }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string; trend: string; color: string }) {
  return (
    <View style={styles.kpi}>
      <View style={[styles.kpiIcon, { backgroundColor: color + '22' }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <Text style={styles.kpiValue}>{value}</Text>
      <Text style={styles.kpiLabel}>{label}</Text>
      <Text style={[styles.kpiTrend, { color: Afylo.green }]}>{trend}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Afylo.bg },
  header: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8 },
  back: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { color: Afylo.text, fontSize: 22, fontFamily: Font.bold },

  tabs: { flexDirection: 'row', paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: Afylo.border },
  tabBtn: { paddingVertical: 12, marginRight: 24, alignItems: 'center' },
  tabText: { color: Afylo.textDim, fontSize: 15, fontFamily: Font.semibold },
  tabTextActive: { color: Afylo.text },
  tabUnderline: { position: 'absolute', bottom: -1, left: 0, right: 0, height: 2, borderRadius: 2, backgroundColor: Afylo.text },

  // Carte solde
  balanceCard: { borderRadius: Radius.xl, padding: 20 },
  balanceLabel: { color: '#ffffffcc', fontSize: 13, fontFamily: Font.medium },
  balanceValue: { color: '#fff', fontSize: 34, fontFamily: Font.bold, marginTop: 4 },
  balanceCur: { fontSize: 17, fontFamily: Font.semibold, color: '#ffffffdd' },
  pendingRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
  pendingText: { color: '#ffffffcc', fontSize: 12, fontFamily: Font.medium },
  withdrawBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#fff', borderRadius: Radius.pill, paddingVertical: 13, marginTop: 18 },
  withdrawText: { color: Afylo.violet, fontFamily: Font.bold, fontSize: 15 },

  card: { backgroundColor: Afylo.surface, borderWidth: 1, borderColor: Afylo.border, borderRadius: Radius.lg, padding: 16, marginTop: 14 },
  cardTitle: { color: Afylo.text, fontSize: 16, fontFamily: Font.bold, marginBottom: 14 },
  sectionTitle: { color: Afylo.text, fontSize: 16, fontFamily: Font.bold, marginTop: 22, marginBottom: -2 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  link: { color: Afylo.violet, fontSize: 13, fontFamily: Font.semibold, marginBottom: 14 },

  methodRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  methodIcon: { width: 42, height: 42, borderRadius: 12, backgroundColor: Afylo.violet + '18', alignItems: 'center', justifyContent: 'center' },
  methodName: { color: Afylo.text, fontSize: 15, fontFamily: Font.semibold },
  methodSub: { color: Afylo.textDim, fontSize: 13, marginTop: 1 },
  defaultTag: { backgroundColor: Afylo.surfaceAlt, paddingHorizontal: 10, paddingVertical: 5, borderRadius: Radius.pill },
  defaultTagText: { color: Afylo.textDim, fontSize: 11, fontFamily: Font.semibold },

  line: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 7 },
  lineLabel: { color: Afylo.textDim, fontSize: 14 },
  lineValue: { color: Afylo.text, fontSize: 14, fontFamily: Font.semibold },
  divider: { height: 1, backgroundColor: Afylo.border, marginVertical: 6 },
  netLabel: { color: Afylo.text, fontSize: 15, fontFamily: Font.bold },
  netValue: { color: Afylo.gold, fontSize: 17, fontFamily: Font.bold },

  txRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  txBorder: { borderBottomWidth: 1, borderBottomColor: Afylo.surfaceAlt },
  txIcon: { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  txLabel: { color: Afylo.text, fontSize: 14, fontFamily: Font.semibold },
  txSub: { color: Afylo.textDim, fontSize: 12, marginTop: 1 },
  txAmount: { fontSize: 14, fontFamily: Font.bold },

  // KPIs
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  kpi: { width: '46%', flexGrow: 1, backgroundColor: Afylo.surface, borderWidth: 1, borderColor: Afylo.border, borderRadius: Radius.lg, padding: 14 },
  kpiIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  kpiValue: { color: Afylo.text, fontSize: 22, fontFamily: Font.bold },
  kpiLabel: { color: Afylo.textDim, fontSize: 13, marginTop: 2 },
  kpiTrend: { fontSize: 12, fontFamily: Font.bold, marginTop: 4 },

  chart: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 140, gap: 8 },
  barCol: { flex: 1, alignItems: 'center', height: '100%', justifyContent: 'flex-end' },
  barTrack: { flex: 1, width: '70%', justifyContent: 'flex-end' },
  bar: { width: '100%', borderRadius: 8, minHeight: 6 },
  barLabel: { color: Afylo.textDim, fontSize: 11, marginTop: 6 },

  viralRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  rank: { color: Afylo.textFaint, fontSize: 16, fontFamily: Font.bold, width: 16 },
  viralThumb: { width: 44, height: 44, borderRadius: 10, backgroundColor: Afylo.surfaceAlt },
  viralViews: { color: Afylo.text, fontSize: 13, fontFamily: Font.semibold, marginBottom: 6 },
  viralTrack: { height: 6, borderRadius: 3, backgroundColor: Afylo.surfaceAlt, overflow: 'hidden' },
  viralFill: { height: '100%', borderRadius: 3, backgroundColor: Afylo.violet },
  viralScore: { color: Afylo.violet, fontSize: 15, fontFamily: Font.bold },

  // Sheet retrait
  backdrop: { flex: 1, backgroundColor: '#00000066' },
  sheet: { backgroundColor: Afylo.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 34 },
  grabber: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: Afylo.border, marginBottom: 16 },
  sheetTitle: { color: Afylo.text, fontSize: 19, fontFamily: Font.bold },
  sheetSub: { color: Afylo.textDim, fontSize: 13, marginTop: 4 },
  amountWrap: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', gap: 8, marginTop: 22 },
  amountInput: { color: Afylo.text, fontSize: 44, fontFamily: Font.bold, minWidth: 60, textAlign: 'center', padding: 0 },
  amountCur: { color: Afylo.textDim, fontSize: 18, fontFamily: Font.semibold },
  quickRow: { flexDirection: 'row', justifyContent: 'center', gap: 10, marginTop: 16 },
  quick: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: Radius.pill, backgroundColor: Afylo.surfaceAlt },
  quickText: { color: Afylo.text, fontSize: 13, fontFamily: Font.semibold },
  destRow: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Afylo.surfaceAlt, borderRadius: Radius.md, padding: 14, marginTop: 20 },
  destText: { color: Afylo.text, fontSize: 14, fontFamily: Font.semibold },
  errText: { color: Afylo.live, fontSize: 13, fontFamily: Font.medium, marginTop: 12, textAlign: 'center' },
  primaryBtn: { backgroundColor: Afylo.violet, borderRadius: Radius.pill, paddingVertical: 15, alignItems: 'center', marginTop: 20 },
  primaryDisabled: { backgroundColor: Afylo.textFaint },
  primaryText: { color: '#fff', fontFamily: Font.bold, fontSize: 16 },
  okIcon: { width: 66, height: 66, borderRadius: 33, backgroundColor: Afylo.green, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  okTitle: { color: Afylo.text, fontSize: 20, fontFamily: Font.bold },
  okSub: { color: Afylo.textDim, fontSize: 14, textAlign: 'center', marginTop: 8, lineHeight: 20, paddingHorizontal: 10 },
});
