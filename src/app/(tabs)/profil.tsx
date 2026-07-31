import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar, Badge, PillButton } from '@/components/ui-kit';
import { Afylo, Font, Radius, Type } from '@/constants/brand';
import { useAuth } from '@/lib/auth';
import { deleteProduct, getMyProfile, listMyProducts } from '@/lib/db';
import { myLives, myPosts, myProducts, myProfile, photo, type MyLive } from '@/lib/mock';
import type { Profile } from '@/types/db';

/** Forme d'affichage commune (produit réel ou démo). */
type DisplayProduct = { id: string; title: string; price: string; stock: number; sold: number; image: string; active: boolean; real: boolean };

type Section = 'posts' | 'boutique' | 'lives';

export default function Profil() {
  const router = useRouter();
  const { signOut, session } = useAuth();
  const [section, setSection] = useState<Section>('posts');
  const isOwner = true; // l'onglet Profil est toujours TON profil ; le profil visiteur est /creator/[id]
  const [menuOpen, setMenuOpen] = useState(false);
  const [dbProfile, setDbProfile] = useState<Profile | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (session) getMyProfile().then(setDbProfile);
    }, [session]),
  );

  // Profil réel si connecté, sinon démo
  const p =
    session && dbProfile
      ? {
          name: dbProfile.display_name || myProfile.name,
          handle: dbProfile.handle ? `@${dbProfile.handle}` : myProfile.handle,
          avatar: dbProfile.avatar_url || myProfile.avatar,
          bio: dbProfile.bio || 'Ajoute une bio depuis « Modifier le profil ».',
        }
      : myProfile;

  const share = async () => {
    try {
      await Share.share({ message: `Découvre ${p.name} sur Afylo — ${p.handle}` });
    } catch {}
  };

  // Invité : pas d'accès au profil (publier/vendre/gérer) → invitation à s'inscrire
  if (!session) {
    return (
      <View style={styles.root}>
        <SafeAreaView edges={['top']} style={styles.guestWrap}>
          <View style={styles.guestIcon}>
            <Ionicons name="person" size={38} color={Afylo.violet} />
          </View>
          <Text style={styles.guestTitle}>Ton profil t'attend</Text>
          <Text style={styles.guestSub}>Crée un compte pour publier tes vidéos, vendre tes produits, suivre des créateurs et gérer ta boutique.</Text>
          <PillButton label="Créer un compte" onPress={() => router.push('/login?mode=signup')} style={{ marginTop: 26, alignSelf: 'stretch' }} />
          <PillButton label="Se connecter" variant="ghost" onPress={() => router.push('/login')} style={{ marginTop: 12, alignSelf: 'stretch' }} />
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {/* Bascule d'aperçu propriétaire / visiteur (dev — sera l'auth plus tard) */}
      <SafeAreaView edges={['top']} style={{ backgroundColor: Afylo.bg }}>
        <View style={styles.topbar}>
          <Text style={styles.handle}>{p.handle}</Text>
          <View style={{ flexDirection: 'row', gap: 2 }}>
            <Pressable onPress={() => router.push('/messages')} style={styles.iconTop}>
              <Ionicons name="chatbubble-ellipses-outline" size={22} color={Afylo.text} />
            </Pressable>
            {isOwner && (
              <Pressable onPress={() => router.push('/studio')} style={styles.iconTop}>
                <Ionicons name="stats-chart" size={20} color={Afylo.gold} />
              </Pressable>
            )}
            <Pressable onPress={() => setMenuOpen(true)} style={styles.iconTop}>
              <Ionicons name="menu" size={24} color={Afylo.text} />
            </Pressable>
          </View>
        </View>
      </SafeAreaView>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 110 }}>
        {/* En-tête profil */}
        <View style={styles.head}>
          <Avatar uri={p.avatar} size={88} ring />
          <View style={styles.statsRow}>
            <Stat value={myProfile.followers} label="Abonnés" />
            <Stat value={myProfile.sales} label="Ventes" />
            <Stat value={myProfile.views} label="Vues" />
          </View>
        </View>

        <View style={styles.nameRow}>
          <Text style={styles.name}>{p.name}</Text>
          <Badge label="créateur" color={Afylo.violet} />
        </View>
        <Text style={styles.bio}>{p.bio}</Text>

        {/* Actions selon le rôle */}
        <View style={styles.actions}>
          {isOwner ? (
            <>
              <PillButton label="Modifier le profil" variant="light" onPress={() => router.push('/edit-profile')} style={{ flex: 1, height: 46 }} />
              <PillButton label="Partager" variant="ghost" icon="share-social-outline" onPress={share} style={{ flex: 1, height: 46 }} />
            </>
          ) : (
            <>
              <PillButton label="Suivre" style={{ flex: 1, height: 46 }} />
              <PillButton label="Message" variant="ghost" icon="chatbubble-outline" style={{ flex: 1, height: 46 }} />
            </>
          )}
        </View>

        {/* Onglets de section */}
        <View style={styles.tabs}>
          <SectionTab icon="grid" active={section === 'posts'} onPress={() => setSection('posts')} />
          <SectionTab icon="bag-handle" active={section === 'boutique'} onPress={() => setSection('boutique')} />
          <SectionTab icon="radio" active={section === 'lives'} onPress={() => setSection('lives')} />
        </View>

        {section === 'posts' && <PostsGrid />}
        {section === 'boutique' && <BoutiqueList isOwner={isOwner} />}
        {section === 'lives' && <LivesList isOwner={isOwner} />}
      </ScrollView>

      {/* Menu hamburger */}
      {menuOpen && (
        <Pressable style={styles.overlay} onPress={() => setMenuOpen(false)}>
          <SafeAreaView edges={['top']} style={styles.menu}>
            <BlurView intensity={30} tint="light" style={StyleSheet.absoluteFill} />
            <View style={styles.menuHandle} />
            <MenuItem icon="repeat" label="Affiliation — produits à revendre" onPress={() => { setMenuOpen(false); router.push('/affiliation'); }} />
            {isOwner && <MenuItem icon="stats-chart" label="Studio & statistiques" onPress={() => { setMenuOpen(false); router.push('/studio'); }} />}
            {isOwner && <MenuItem icon="wallet-outline" label="Portefeuille & retraits" onPress={() => { setMenuOpen(false); router.push('/studio'); }} />}
            {isOwner && <MenuItem icon="bag-add-outline" label="Gérer ma boutique" onPress={() => { setMenuOpen(false); setSection('boutique'); }} />}
            <MenuItem icon="share-social-outline" label="Partager le profil" onPress={() => { setMenuOpen(false); share(); }} />
            <MenuItem icon="bookmark-outline" label="Enregistrements" onPress={() => setMenuOpen(false)} />
            <MenuItem icon="settings-outline" label="Paramètres" onPress={() => { setMenuOpen(false); router.push('/settings'); }} />
            <MenuItem icon="help-circle-outline" label="Aide" onPress={() => { setMenuOpen(false); Linking.openURL('mailto:support@afylo.app'); }} />
            {isOwner && <MenuItem icon="log-out-outline" label="Déconnexion" danger onPress={async () => { setMenuOpen(false); await signOut(); }} />}
          </SafeAreaView>
        </Pressable>
      )}
    </View>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={{ alignItems: 'center' }}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function SectionTab({ icon, active, onPress }: { icon: keyof typeof Ionicons.glyphMap; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.tab, active && styles.tabActive]}>
      <Ionicons name={icon} size={22} color={active ? Afylo.text : Afylo.textFaint} />
    </Pressable>
  );
}

function PostsGrid() {
  return (
    <View style={styles.mediaGrid}>
      {myPosts.map((p) => (
        <View key={p.id} style={styles.cell}>
          <Image source={{ uri: p.image }} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} />
          {p.video && (
            <View style={styles.cellTag}>
              <Ionicons name="play" size={11} color="#fff" />
              <Text style={styles.cellTagText}>{p.views}</Text>
            </View>
          )}
        </View>
      ))}
    </View>
  );
}

function BoutiqueList({ isOwner }: { isOwner: boolean }) {
  const router = useRouter();
  const { session } = useAuth();
  const [products, setProducts] = useState<DisplayProduct[] | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!session) {
      setProducts(null); // pas connecté → on montrera la démo
      return;
    }
    setLoading(true);
    try {
      const rows = await listMyProducts();
      setProducts(
        rows.map((r) => ({
          id: r.id,
          title: r.title,
          price: r.price_cfa.toLocaleString('fr-FR'),
          stock: r.stock,
          sold: r.sold_count,
          image: r.image_url || photo(`prod-${r.id}`, 400, 400),
          active: r.is_active,
          real: true,
        })),
      );
    } finally {
      setLoading(false);
    }
  }, [session]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const remove = async (id: string) => {
    await deleteProduct(id);
    load();
  };

  // Réels si connecté, sinon démo (mode invité / visiteur)
  const demo: DisplayProduct[] = myProducts.map((p) => ({ ...p, real: false }));
  const list = session && products ? products : demo;

  return (
    <View style={{ paddingHorizontal: 12, paddingTop: 12 }}>
      {isOwner && (
        <Pressable style={styles.createBtn} onPress={() => router.push('/product-new')}>
          <Ionicons name="add-circle" size={22} color={Afylo.violet} />
          <Text style={styles.createText}>Créer un produit</Text>
        </Pressable>
      )}

      {loading && <ActivityIndicator color={Afylo.violet} style={{ marginVertical: 20 }} />}

      {isOwner && session && list.length === 0 && !loading && (
        <Text style={styles.emptyText}>Aucun produit pour l'instant. Crée ton premier article ci-dessus.</Text>
      )}

      {!session && isOwner && (
        <Text style={styles.demoNote}>Aperçu démo — connecte-toi pour gérer ta vraie boutique.</Text>
      )}

      <View style={styles.prodGrid}>
        {list.map((p) => (
          <ProductCard key={p.id} p={p} isOwner={isOwner} onDelete={p.real ? () => remove(p.id) : undefined} />
        ))}
      </View>
    </View>
  );
}

function ProductCard({ p, isOwner, onDelete }: { p: DisplayProduct; isOwner: boolean; onDelete?: () => void }) {
  return (
    <View style={styles.prodCard}>
      <View style={styles.prodImg}>
        <Image source={{ uri: p.image }} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} />
        {!p.active && (
          <View style={styles.inactive}>
            <Text style={styles.inactiveText}>Épuisé</Text>
          </View>
        )}
      </View>
      <Text style={styles.prodTitle} numberOfLines={1}>{p.title}</Text>
      <Text style={styles.prodPrice}>{p.price} F</Text>
      {isOwner ? (
        <View style={styles.prodMeta}>
          <Text style={styles.prodStat}>{p.sold} vendus · {p.stock} en stock</Text>
          <View style={styles.prodActions}>
            <Pressable style={styles.prodAction}><Ionicons name="create-outline" size={17} color={Afylo.textDim} /></Pressable>
            <Pressable style={styles.prodAction} onPress={onDelete} disabled={!onDelete}>
              <Ionicons name="trash-outline" size={17} color={onDelete ? Afylo.live : Afylo.textFaint} />
            </Pressable>
          </View>
        </View>
      ) : (
        <Pressable style={styles.buyBtn}><Text style={styles.buyBtnText}>Acheter</Text></Pressable>
      )}
    </View>
  );
}

function LivesList({ isOwner }: { isOwner: boolean }) {
  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 12, gap: 12 }}>
      {isOwner && (
        <Pressable style={styles.createBtn}>
          <Ionicons name="radio" size={20} color={Afylo.live} />
          <Text style={[styles.createText, { color: Afylo.live }]}>Démarrer un live</Text>
        </Pressable>
      )}
      {myLives.map((l) => (
        <LiveRow key={l.id} l={l} isOwner={isOwner} />
      ))}
    </View>
  );
}

function LiveRow({ l, isOwner }: { l: MyLive; isOwner: boolean }) {
  return (
    <View style={styles.liveRow}>
      <View style={styles.liveThumb}>
        <Image source={{ uri: l.thumb }} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} />
        <View style={styles.playCircle}><Ionicons name="play" size={16} color="#fff" /></View>
        <Text style={styles.liveDuration}>{l.duration}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.liveTitle} numberOfLines={1}>{l.title}</Text>
        <Text style={styles.liveMeta}>{l.date} · {l.viewers} spectateurs</Text>
        {isOwner && (
          <View style={styles.liveRevenue}>
            <Ionicons name="cash-outline" size={13} color={Afylo.green} />
            <Text style={styles.liveRevenueText}>{l.revenue} F générés</Text>
          </View>
        )}
      </View>
      <Ionicons name="ellipsis-vertical" size={18} color={Afylo.textFaint} />
    </View>
  );
}

function MenuItem({ icon, label, onPress, danger }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress?: () => void; danger?: boolean }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.menuItem, pressed && { backgroundColor: Afylo.surfaceAlt }]}>
      <Ionicons name={icon} size={22} color={danger ? Afylo.live : Afylo.text} />
      <Text style={[styles.menuLabel, danger && { color: Afylo.live }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Afylo.bg },
  guestWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  guestIcon: { width: 76, height: 76, borderRadius: 24, backgroundColor: '#3E5BFF1A', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  guestTitle: { ...Type.title, color: Afylo.text, textAlign: 'center' },
  guestSub: { ...Type.body, color: Afylo.textDim, textAlign: 'center', marginTop: 10 },
  previewToggle: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 6 },
  previewText: { color: Afylo.textFaint, fontSize: 12 },
  previewChip: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: Radius.pill, backgroundColor: Afylo.surface },
  previewChipOn: { backgroundColor: Afylo.violet },
  previewChipText: { color: Afylo.textDim, fontSize: 11, fontWeight: '700' },
  previewChipTextOn: { color: '#fff' },

  topbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingVertical: 6 },
  handle: { ...Type.username, fontSize: 20, color: Afylo.text },
  iconTop: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },

  head: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, marginTop: 12, gap: 20 },
  statsRow: { flex: 1, flexDirection: 'row', justifyContent: 'space-around' },
  statValue: { ...Type.statNumber, color: Afylo.text },
  statLabel: { ...Type.statLabel, color: Afylo.textDim, marginTop: 4 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 18, marginTop: 18 },
  name: { ...Type.name, color: Afylo.text },
  bio: { ...Type.bio, color: Afylo.text, opacity: 0.9, paddingHorizontal: 18, marginTop: 8 },
  earnPill: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', marginHorizontal: 18, marginTop: 12, backgroundColor: '#FFB0201A', borderWidth: 1, borderColor: '#FFB02033', paddingHorizontal: 12, paddingVertical: 8, borderRadius: Radius.pill, gap: 2 },
  earnText: { color: Afylo.textDim, fontSize: 13 },
  earnValue: { color: Afylo.gold, fontSize: 13, fontWeight: '800' },
  actions: { flexDirection: 'row', gap: 12, paddingHorizontal: 18, marginTop: 16 },

  tabs: { flexDirection: 'row', marginTop: 22, borderBottomWidth: 1, borderBottomColor: Afylo.surfaceAlt },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: Afylo.text },

  mediaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 2, marginTop: 2 },
  cell: { width: '33%', aspectRatio: 0.8, backgroundColor: Afylo.surfaceAlt, flexGrow: 1 },
  cellTag: { position: 'absolute', bottom: 6, left: 6, flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#00000088', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  cellTagText: { color: '#fff', fontSize: 10, fontWeight: '700' },

  createBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Afylo.surface, borderRadius: Radius.md, paddingVertical: 13, marginBottom: 12, borderWidth: 1, borderColor: Afylo.surfaceAlt },
  createText: { color: Afylo.violet, fontWeight: '700', fontSize: 14 },
  emptyText: { color: Afylo.textDim, fontSize: 14, textAlign: 'center', paddingVertical: 24, paddingHorizontal: 20, lineHeight: 20 },
  demoNote: { color: Afylo.textFaint, fontSize: 12, textAlign: 'center', marginBottom: 12 },
  prodGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  prodCard: { width: '46%', flexGrow: 1, backgroundColor: Afylo.surface, borderRadius: Radius.md, padding: 8 },
  prodImg: { aspectRatio: 1, borderRadius: Radius.sm, overflow: 'hidden', backgroundColor: Afylo.surfaceAlt, marginBottom: 8 },
  inactive: { ...StyleSheet.absoluteFillObject, backgroundColor: '#000000AA', alignItems: 'center', justifyContent: 'center' },
  inactiveText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  prodTitle: { color: Afylo.text, fontSize: 14, fontWeight: '700', paddingHorizontal: 2 },
  prodPrice: { color: Afylo.gold, fontSize: 15, fontWeight: '800', paddingHorizontal: 2, marginTop: 2 },
  prodMeta: { marginTop: 8, paddingHorizontal: 2 },
  prodStat: { color: Afylo.textDim, fontSize: 11 },
  prodActions: { flexDirection: 'row', gap: 8, marginTop: 8 },
  prodAction: { flex: 1, alignItems: 'center', paddingVertical: 7, backgroundColor: Afylo.surfaceAlt, borderRadius: 8 },
  buyBtn: { backgroundColor: Afylo.violet, borderRadius: Radius.pill, paddingVertical: 9, alignItems: 'center', marginTop: 8 },
  buyBtnText: { color: '#fff', fontWeight: '800', fontSize: 13 },

  liveRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: Afylo.surface, borderRadius: Radius.md, padding: 8 },
  liveThumb: { width: 96, height: 64, borderRadius: 10, overflow: 'hidden', backgroundColor: Afylo.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  playCircle: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#00000088', alignItems: 'center', justifyContent: 'center' },
  liveDuration: { position: 'absolute', bottom: 4, right: 4, color: '#fff', fontSize: 10, fontWeight: '700', backgroundColor: '#000000AA', paddingHorizontal: 4, borderRadius: 4 },
  liveTitle: { color: Afylo.text, fontSize: 14, fontWeight: '700' },
  liveMeta: { color: Afylo.textDim, fontSize: 12, marginTop: 2 },
  liveRevenue: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  liveRevenueText: { color: Afylo.green, fontSize: 12, fontWeight: '700' },

  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: '#000000AA', justifyContent: 'flex-start' },
  menu: { backgroundColor: Afylo.glass, borderBottomLeftRadius: 24, borderBottomRightRadius: 24, paddingBottom: 16, paddingHorizontal: 8, overflow: 'hidden', borderBottomWidth: 1, borderColor: Afylo.glassBorder },
  menuHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: Afylo.surfaceAlt, alignSelf: 'center', marginVertical: 10 },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 14, paddingHorizontal: 14, borderRadius: Radius.md },
  menuLabel: { color: Afylo.text, fontSize: 15, fontWeight: '600' },
});
