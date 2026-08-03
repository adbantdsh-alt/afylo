import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CardsSkeleton, Skeleton } from '@/components/skeleton';
import { Afylo, Font, Radius } from '@/constants/brand';
import { useCheckoutProfile } from '@/lib/checkout-profile';
import { useMe } from '@/lib/me';
import { useReposts } from '@/lib/reposts';
import { EMPTY_WALLET, getWalletSummary, type WalletSummary, type WalletTx } from '@/lib/wallet';

const fmt = (n: number) => Math.round(Math.abs(n)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
const signed = (n: number) => (n >= 0 ? '+' : '−') + fmt(Math.abs(n));

type Tab = 'wallet' | 'stats';

export default function Portefeuille() {
  const router = useRouter();
  const me = useMe();
  const { reposts } = useReposts();
  const { profile } = useCheckoutProfile();
  const [tab, setTab] = useState<Tab>('wallet');
  const [withdraw, setWithdraw] = useState(false);
  const [summary, setSummary] = useState<WalletSummary>(EMPTY_WALLET);
  const [loading, setLoading] = useState(true);

  // Commissions « optimistes » des repartages Pro (affiliation générée côté client)
  const affiliateExtra = reposts.reduce((s, r) => s + (r.affiliate?.earned ?? 0), 0);

  const load = useCallback(() => {
    setLoading(true);
    getWalletSummary(me.id, affiliateExtra)
      .then(setSummary)
      .catch(() => setSummary(EMPTY_WALLET))
      .finally(() => setLoading(false));
  }, [me.id, affiliateExtra]);

  useEffect(() => { load(); }, [load]);

  const methodLabel = profile.preferred === 'om' ? 'Orange Money' : 'Wave';
  const methodNumber = profile.phone || 'À configurer';

  return (
    <View style={styles.root}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: Afylo.bg }}>
        <View style={styles.header}>
          <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/accueil'))} style={styles.back}>
            <Ionicons name="chevron-back" size={24} color={Afylo.text} />
          </Pressable>
          <Text style={styles.title}>Portefeuille</Text>
          <View style={{ flex: 1 }} />
          <Pressable style={styles.back} onPress={load}>
            <Ionicons name="refresh" size={20} color={Afylo.textDim} />
          </Pressable>
        </View>

        {/* Onglets Portefeuille / Statistiques */}
        <View style={styles.tabs}>
          <TabBtn label="Portefeuille" active={tab === 'wallet'} onPress={() => setTab('wallet')} />
          <TabBtn label="Statistiques" active={tab === 'stats'} onPress={() => setTab('stats')} />
        </View>
      </SafeAreaView>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 48 }}>
        {loading ? (
          <View style={{ gap: 14 }}>
            <Skeleton w="100%" h={150} radius={20} />
            <CardsSkeleton count={3} height={80} />
          </View>
        ) : tab === 'wallet' ? (
          <WalletTab summary={summary} methodLabel={methodLabel} methodNumber={methodNumber} onWithdraw={() => setWithdraw(true)} />
        ) : (
          <StatsTab summary={summary} />
        )}
      </ScrollView>

      <WithdrawSheet
        visible={withdraw}
        available={summary.available}
        currency={summary.currency}
        methodLabel={methodLabel}
        methodNumber={methodNumber}
        onClose={() => setWithdraw(false)}
      />
    </View>
  );
}

/* ---------------- Portefeuille ---------------- */

function WalletTab({ summary, methodLabel, methodNumber, onWithdraw }: { summary: WalletSummary; methodLabel: string; methodNumber: string; onWithdraw: () => void }) {
  const router = useRouter();
  const { available, pending, currency, breakdown, transactions, rewardsNet } = summary;
  const net = breakdown.reduce((s, b) => s + b.value, 0);
  const canWithdraw = available >= 1000;

  return (
    <>
      {/* Carte solde */}
      <LinearGradient colors={[Afylo.violet, Afylo.violet2]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>Solde disponible</Text>
        <Text style={styles.balanceValue}>{fmt(available)} <Text style={styles.balanceCur}>{currency}</Text></Text>

        {pending > 0 && (
          <View style={styles.pendingRow}>
            <Ionicons name="lock-closed" size={13} color="#ffffffcc" />
            <Text style={styles.pendingText}>{fmt(pending)} {currency} en séquestre · libéré à la livraison</Text>
          </View>
        )}

        <Pressable style={[styles.withdrawBtn, !canWithdraw && { opacity: 0.55 }]} disabled={!canWithdraw} onPress={onWithdraw}>
          <Ionicons name="arrow-down-circle" size={18} color={Afylo.violet} />
          <Text style={styles.withdrawText}>{canWithdraw ? 'Retirer' : 'Retrait dès 1 000 F'}</Text>
        </Pressable>
      </LinearGradient>

      {/* Creator Rewards — rémunération à la vue */}
      <Pressable style={styles.rewardsCard} onPress={() => router.push('/rewards')}>
        <View style={styles.rewardsIcon}><Ionicons name="cash" size={20} color="#16A34A" /></View>
        <View style={{ flex: 1 }}>
          <Text style={styles.rewardsTitle}>Creator Rewards</Text>
          <Text style={styles.rewardsSub}>{fmt(rewardsNet)} F ce mois · 100 F / 1 000 vues</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={Afylo.textFaint} />
      </Pressable>

      {/* Méthode de retrait */}
      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <Text style={styles.cardTitle}>Méthode de retrait</Text>
          <Text style={styles.link} onPress={() => router.push('/settings')}>Modifier</Text>
        </View>
        <View style={styles.methodRow}>
          <View style={styles.methodIcon}>
            <Ionicons name="phone-portrait" size={20} color={Afylo.violet} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.methodName}>{methodLabel}</Text>
            <Text style={styles.methodSub}>{methodNumber}</Text>
          </View>
          <View style={styles.defaultTag}><Text style={styles.defaultTagText}>Par défaut</Text></View>
        </View>
      </View>

      {/* Répartition des revenus */}
      {breakdown.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Répartition des revenus</Text>
          {breakdown.map((b, i) => (
            <View key={i} style={styles.line}>
              <Text style={[styles.lineLabel, b.dim && { color: Afylo.textFaint }]}>{b.label}</Text>
              <Text style={[styles.lineValue, b.dim && { color: Afylo.textFaint }, b.label.startsWith('Commissions') && { color: '#16A34A' }]}>{b.value < 0 ? '−' : ''}{fmt(Math.abs(b.value))} F</Text>
            </View>
          ))}
          <View style={styles.divider} />
          <View style={styles.line}>
            <Text style={styles.netLabel}>Net perçu</Text>
            <Text style={styles.netValue}>{fmt(net)} F</Text>
          </View>
        </View>
      )}

      {/* Historique */}
      <Text style={styles.sectionTitle}>Transactions</Text>
      {transactions.length === 0 ? (
        <View style={[styles.card, styles.empty]}>
          <Ionicons name="receipt-outline" size={30} color={Afylo.textFaint} />
          <Text style={styles.emptyTitle}>Aucune transaction</Text>
          <Text style={styles.emptySub}>Tes ventes, commissions d'affiliation et Creator Rewards apparaîtront ici.</Text>
        </View>
      ) : (
        <View style={styles.card}>
          {transactions.map((t, i) => (
            <TxRow key={t.id} tx={t} last={i === transactions.length - 1} />
          ))}
        </View>
      )}
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

function StatsTab({ summary }: { summary: WalletSummary }) {
  const { reach, available, pending, topPosts } = summary;
  const revenue = available + pending;
  const maxViews = Math.max(...topPosts.map((p) => p.view_count), 1);

  return (
    <>
      <View style={styles.kpiGrid}>
        <Kpi icon="eye" label="Vues" value={fmt(reach.views)} trend="total" color={Afylo.violet} />
        <Kpi icon="bag-check" label="Ventes" value={String(reach.sales)} trend="total" color={Afylo.green} />
        <Kpi icon="cash" label="Revenus (F)" value={fmt(revenue)} trend="total" color={Afylo.gold} />
        <Kpi icon="people" label="Abonnés" value={fmt(reach.followers)} trend="total" color={Afylo.live} />
      </View>

      {topPosts.length > 0 ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Tes posts les plus vus</Text>
          {topPosts.map((p, i) => (
            <View key={p.id} style={styles.viralRow}>
              <Text style={styles.rank}>{i + 1}</Text>
              <Image source={{ uri: p.thumbnail_url || p.media_url || undefined }} style={styles.viralThumb} contentFit="cover" />
              <View style={{ flex: 1 }}>
                <Text style={styles.viralViews}>{fmt(p.view_count)} vues</Text>
                <View style={styles.viralTrack}>
                  <View style={[styles.viralFill, { width: `${(p.view_count / maxViews) * 100}%` }]} />
                </View>
              </View>
            </View>
          ))}
        </View>
      ) : (
        <View style={[styles.card, styles.empty]}>
          <Ionicons name="stats-chart-outline" size={30} color={Afylo.textFaint} />
          <Text style={styles.emptyTitle}>Pas encore de statistiques</Text>
          <Text style={styles.emptySub}>Publie des vidéos et vends pour suivre tes performances en temps réel.</Text>
        </View>
      )}
    </>
  );
}

/* ---------------- Sheet retrait ---------------- */

function WithdrawSheet({ visible, available, currency, methodLabel, methodNumber, onClose }: { visible: boolean; available: number; currency: string; methodLabel: string; methodNumber: string; onClose: () => void }) {
  const [amount, setAmount] = useState('');
  const [done, setDone] = useState(false);
  const n = parseInt(amount.replace(/\D/g, ''), 10) || 0;
  const hasMethod = methodNumber !== 'À configurer';
  const valid = n >= 1000 && n <= available && hasMethod;

  const close = () => { setAmount(''); setDone(false); onClose(); };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <Pressable style={styles.backdrop} onPress={close} />
      <View style={styles.sheet}>
        <View style={styles.grabber} />
        {done ? (
          <View style={{ alignItems: 'center', paddingVertical: 12 }}>
            <View style={styles.okIcon}><Ionicons name="checkmark" size={34} color="#fff" /></View>
            <Text style={styles.okTitle}>Retrait demandé</Text>
            <Text style={styles.okSub}>{fmt(n)} {currency} vers {methodLabel} {methodNumber}. Réception sous quelques minutes.</Text>
            <Pressable style={styles.primaryBtn} onPress={close}>
              <Text style={styles.primaryText}>Terminé</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <Text style={styles.sheetTitle}>Retirer vers {methodLabel}</Text>
            <Text style={styles.sheetSub}>Solde disponible : {fmt(available)} {currency}</Text>

            <View style={styles.amountWrap}>
              <TextInput
                value={amount}
                onChangeText={(t) => setAmount(t.replace(/[^0-9]/g, ''))}
                keyboardType="number-pad"
                placeholder="0"
                placeholderTextColor={Afylo.textFaint}
                style={styles.amountInput}
              />
              <Text style={styles.amountCur}>{currency}</Text>
            </View>

            <View style={styles.quickRow}>
              {[10000, 50000, available].map((q, i) => (
                <Pressable key={i} style={styles.quick} onPress={() => setAmount(String(Math.max(0, q)))}>
                  <Text style={styles.quickText}>{i === 2 ? 'Tout' : fmt(q)}</Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.destRow}>
              <Ionicons name="phone-portrait" size={18} color={Afylo.violet} />
              <Text style={styles.destText}>{methodLabel} · {methodNumber}</Text>
            </View>

            {!hasMethod && <Text style={styles.errText}>Ajoute un numéro Wave/OM dans Réglages pour retirer.</Text>}
            {hasMethod && n > 0 && n < 1000 && <Text style={styles.errText}>Minimum 1 000 FCFA.</Text>}
            {hasMethod && n > available && <Text style={styles.errText}>Montant supérieur au solde.</Text>}

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
  rewardsCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#16A34A0F', borderWidth: 1, borderColor: '#16A34A33', borderRadius: Radius.lg, padding: 14, marginTop: 14 },
  rewardsIcon: { width: 42, height: 42, borderRadius: 12, backgroundColor: '#16A34A1A', alignItems: 'center', justifyContent: 'center' },
  rewardsTitle: { color: Afylo.text, fontFamily: Font.bold, fontSize: 15 },
  rewardsSub: { color: Afylo.textDim, fontSize: 13, marginTop: 1 },
  cardTitle: { color: Afylo.text, fontSize: 16, fontFamily: Font.bold, marginBottom: 14 },
  sectionTitle: { color: Afylo.text, fontSize: 16, fontFamily: Font.bold, marginTop: 22, marginBottom: -2 },
  empty: { alignItems: 'center', paddingVertical: 28 },
  emptyTitle: { color: Afylo.text, fontSize: 15, fontFamily: Font.bold, marginTop: 10 },
  emptySub: { color: Afylo.textDim, fontSize: 13, textAlign: 'center', marginTop: 4, lineHeight: 18, paddingHorizontal: 20 },
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
