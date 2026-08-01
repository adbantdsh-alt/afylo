import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Afryko, Font, Radius } from '@/constants/brand';
import { checkEligibility, isEligible, PAYOUT_MIN_FCFA, REWARD_PER_1K_FCFA, viewsEarning } from '@/lib/algo';
import { creatorRewards } from '@/lib/mock';

const fmt = (n: number) => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

const NOT_ELIGIBLE = [
  'Vidéos copiées ou téléchargées depuis d\'autres plateformes',
  'Contenus protégés par des droits d\'auteur sans autorisation',
  'Compilations sans valeur ajoutée',
  'Contenus générés automatiquement ou en boucle',
  'Vidéos avec bots ou faux engagements',
  'Contenus violents, haineux, illégaux ou contraires aux règles',
];
const QUALIFIED = [
  'Provient d\'un utilisateur réel',
  'Regardée ≥ 8 s ou 30 % de la durée',
  'Interaction naturelle avec la plateforme',
  'Ni bot, ni VPN frauduleux, ni ferme à clics',
  'Les relectures du même utilisateur ne comptent pas',
];
const PAYOUTS = ['XaalisPay', 'Wave', 'Orange Money', 'Free Money'];
const OTHER = [
  { icon: 'bag-handle', title: 'Live Shopping', sub: 'Vends tes produits en direct' },
  { icon: 'repeat', title: 'Affiliation', sub: 'Commissions sur les produits revendus' },
  { icon: 'gift', title: 'Pourboires', sub: 'Envoyés par ta communauté' },
  { icon: 'star', title: 'Abonnements', sub: 'Contenu exclusif payant' },
  { icon: 'briefcase', title: 'Partenariats', sub: 'Marques via Afryko' },
] as const;

export default function Rewards() {
  const router = useRouter();
  const r = creatorRewards;
  const earned = viewsEarning(r.qualifiedViews30d);
  const eligible = isEligible(r.eligibility);
  const checks = checkEligibility(r.eligibility);
  const okCount = checks.filter((c) => c.ok).length;

  return (
    <View style={styles.root}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: Afryko.bg }}>
        <View style={styles.header}>
          <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/accueil'))} style={styles.back}>
            <Ionicons name="chevron-back" size={24} color={Afryko.text} />
          </Pressable>
          <Text style={styles.title}>Creator Rewards</Text>
          <View style={{ width: 40 }} />
        </View>
      </SafeAreaView>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 48 }}>
        {/* Hero + gains du mois */}
        <LinearGradient colors={[Afryko.violet, Afryko.violet2]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
          <View style={styles.heroBadge}><Ionicons name="cash" size={13} color="#fff" /><Text style={styles.heroBadgeText}>Afryko Creator Rewards</Text></View>
          <Text style={styles.heroLabel}>Tes gains vidéos ce mois</Text>
          <Text style={styles.heroValue}>{fmt(earned)} <Text style={styles.heroCur}>FCFA</Text></Text>
          <Text style={styles.heroSub}>{fmt(r.qualifiedViews30d)} vues qualifiées · {REWARD_PER_1K_FCFA} FCFA / 1 000 vues</Text>
          <View style={styles.heroRow}>
            <View style={styles.heroStat}><Text style={styles.heroStatV}>{fmt(r.qualifiedViewsTotal)}</Text><Text style={styles.heroStatL}>vues cumulées</Text></View>
            <View style={styles.heroDiv} />
            <View style={styles.heroStat}><Text style={styles.heroStatV}>{fmt(r.totalEarnedFcfa)} F</Text><Text style={styles.heroStatL}>déjà reversés</Text></View>
          </View>
          <Pressable style={[styles.heroBtn, earned < PAYOUT_MIN_FCFA && { opacity: 0.6 }]} disabled={earned < PAYOUT_MIN_FCFA} onPress={() => router.push('/studio')}>
            <Text style={styles.heroBtnText}>{earned >= PAYOUT_MIN_FCFA ? 'Retirer mes gains' : `Seuil ${fmt(PAYOUT_MIN_FCFA)} F`}</Text>
          </Pressable>
        </LinearGradient>

        {/* Éligibilité */}
        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={styles.cardTitle}>Ton éligibilité</Text>
            <View style={[styles.pill, { backgroundColor: eligible ? '#16A34A18' : '#FF7A0018' }]}>
              <Ionicons name={eligible ? 'checkmark-circle' : 'time'} size={14} color={eligible ? '#16A34A' : '#B8791F'} />
              <Text style={[styles.pillText, { color: eligible ? '#16A34A' : '#B8791F' }]}>{eligible ? 'Éligible' : `${okCount}/${checks.length}`}</Text>
            </View>
          </View>
          {checks.map((c) => (
            <View key={c.key} style={styles.checkRow}>
              <Ionicons name={c.ok ? 'checkmark-circle' : 'ellipse-outline'} size={20} color={c.ok ? '#16A34A' : Afryko.textFaint} />
              <Text style={styles.checkLabel}>{c.label}</Text>
              <Text style={[styles.checkValue, { color: c.ok ? Afryko.text : Afryko.textDim }]}>{c.value}</Text>
            </View>
          ))}
        </View>

        {/* Barème */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Le barème</Text>
          <Text style={styles.big}>{REWARD_PER_1K_FCFA} FCFA <Text style={styles.bigSub}>/ 1 000 vues qualifiées</Text></Text>
          <View style={styles.exRow}>
            {[[100000, ''], [500000, ''], [1000000, '']].map(([v]) => (
              <View key={v} style={styles.ex}>
                <Text style={styles.exV}>{fmt(viewsEarning(v as number))} F</Text>
                <Text style={styles.exL}>{fmt((v as number) / 1000)}k vues</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Vue qualifiée */}
        <Section title="Qu'est-ce qu'une vue qualifiée ?" icon="eye">
          {QUALIFIED.map((t, i) => <Bullet key={i} text={t} good />)}
        </Section>

        {/* Non éligible */}
        <Section title="Contenus non rémunérés" icon="close-circle">
          {NOT_ELIGIBLE.map((t, i) => <Bullet key={i} text={t} />)}
        </Section>

        {/* Paiement */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Paiement</Text>
          <Text style={styles.p}>Versé chaque mois · seuil minimum {fmt(PAYOUT_MIN_FCFA)} FCFA.</Text>
          <View style={styles.payRow}>
            {PAYOUTS.map((p) => <View key={p} style={styles.payTag}><Text style={styles.payTagText}>{p}</Text></View>)}
          </View>
        </View>

        {/* Autres façons de gagner */}
        <Text style={styles.sectionTitle}>Autres façons de gagner</Text>
        <View style={styles.card}>
          {OTHER.map((o, i) => (
            <View key={o.title} style={[styles.otherRow, i < OTHER.length - 1 && styles.otherBorder]}>
              <View style={styles.otherIcon}><Ionicons name={o.icon as any} size={18} color={Afryko.violet} /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.otherTitle}>{o.title}</Text>
                <Text style={styles.otherSub}>{o.sub}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Contrôle qualité */}
        <View style={styles.noteCard}>
          <Ionicons name="shield-checkmark" size={18} color={Afryko.violet} />
          <Text style={styles.noteText}>Afryko détecte bots, achats de vues, faux abonnés et fermes à clics. Les revenus frauduleux sont annulés et le compte peut être suspendu du programme.</Text>
        </View>
      </ScrollView>
    </View>
  );
}

function Section({ title, icon, children }: { title: string; icon: keyof typeof Ionicons.glyphMap; children: React.ReactNode }) {
  return (
    <View style={styles.card}>
      <View style={styles.rowBetween}><Text style={styles.cardTitle}>{title}</Text><Ionicons name={icon} size={18} color={Afryko.textDim} /></View>
      {children}
    </View>
  );
}
function Bullet({ text, good }: { text: string; good?: boolean }) {
  return (
    <View style={styles.bullet}>
      <Ionicons name={good ? 'checkmark' : 'close'} size={15} color={good ? '#16A34A' : Afryko.live} style={{ marginTop: 2 }} />
      <Text style={styles.bulletText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Afryko.bg },
  header: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8 },
  back: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, color: Afryko.text, fontSize: 20, fontFamily: Font.bold },

  hero: { borderRadius: Radius.xl, padding: 20 },
  heroBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', backgroundColor: '#ffffff2a', paddingHorizontal: 10, paddingVertical: 5, borderRadius: Radius.pill },
  heroBadgeText: { color: '#fff', fontFamily: Font.semibold, fontSize: 11 },
  heroLabel: { color: '#ffffffcc', fontSize: 13, fontFamily: Font.medium, marginTop: 14 },
  heroValue: { color: '#fff', fontSize: 38, fontFamily: Font.bold, marginTop: 2 },
  heroCur: { fontSize: 18, color: '#ffffffdd' },
  heroSub: { color: '#ffffffcc', fontSize: 12, marginTop: 4 },
  heroRow: { flexDirection: 'row', alignItems: 'center', marginTop: 16 },
  heroStat: { flex: 1 },
  heroStatV: { color: '#fff', fontFamily: Font.bold, fontSize: 17 },
  heroStatL: { color: '#ffffffbb', fontSize: 11, marginTop: 1 },
  heroDiv: { width: 1, height: 30, backgroundColor: '#ffffff33' },
  heroBtn: { backgroundColor: '#fff', borderRadius: Radius.pill, paddingVertical: 13, alignItems: 'center', marginTop: 18 },
  heroBtnText: { color: Afryko.violet, fontFamily: Font.bold, fontSize: 15 },

  card: { backgroundColor: Afryko.surface, borderWidth: 1, borderColor: Afryko.border, borderRadius: Radius.lg, padding: 16, marginTop: 14 },
  sectionTitle: { color: Afryko.text, fontSize: 16, fontFamily: Font.bold, marginTop: 22 },
  cardTitle: { color: Afryko.text, fontSize: 16, fontFamily: Font.bold },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: Radius.pill },
  pillText: { fontFamily: Font.bold, fontSize: 12 },

  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  checkLabel: { flex: 1, color: Afryko.text, fontSize: 14 },
  checkValue: { fontFamily: Font.semibold, fontSize: 13 },

  big: { color: Afryko.violet, fontSize: 30, fontFamily: Font.bold, marginTop: 4 },
  bigSub: { color: Afryko.textDim, fontSize: 14, fontFamily: Font.medium },
  exRow: { flexDirection: 'row', marginTop: 16, gap: 10 },
  ex: { flex: 1, backgroundColor: Afryko.surfaceAlt, borderRadius: Radius.md, paddingVertical: 12, alignItems: 'center' },
  exV: { color: '#16A34A', fontFamily: Font.bold, fontSize: 15 },
  exL: { color: Afryko.textDim, fontSize: 11, marginTop: 2 },

  bullet: { flexDirection: 'row', gap: 8, paddingVertical: 5 },
  bulletText: { flex: 1, color: Afryko.textDim, fontSize: 13, lineHeight: 19 },

  p: { color: Afryko.textDim, fontSize: 14, lineHeight: 20 },
  payRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  payTag: { backgroundColor: Afryko.surfaceAlt, paddingHorizontal: 12, paddingVertical: 7, borderRadius: Radius.pill },
  payTagText: { color: Afryko.text, fontFamily: Font.semibold, fontSize: 12 },

  otherRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11 },
  otherBorder: { borderBottomWidth: 1, borderBottomColor: Afryko.surfaceAlt },
  otherIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#3E5BFF14', alignItems: 'center', justifyContent: 'center' },
  otherTitle: { color: Afryko.text, fontFamily: Font.semibold, fontSize: 15 },
  otherSub: { color: Afryko.textDim, fontSize: 13, marginTop: 1 },

  noteCard: { flexDirection: 'row', gap: 10, backgroundColor: '#3E5BFF0F', borderWidth: 1, borderColor: '#3E5BFF22', borderRadius: Radius.lg, padding: 14, marginTop: 14 },
  noteText: { flex: 1, color: Afryko.textDim, fontSize: 13, lineHeight: 19 },
});
