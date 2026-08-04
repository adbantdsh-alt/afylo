import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Modal, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/ui-kit';
import { PaymentSheet, type PayItem } from '@/components/payment-sheet';
import { ReportSheet } from '@/components/report-sheet';
import { VerifiedBadge, verifiedKind } from '@/components/verified';
import { Afylo, Font, Radius, Type } from '@/constants/brand';
import { followUser, getCreatorData, isFollowing, isProAccount, listProductsByOwner, listRepostsByOwner, unfollowUser, type CreatorData } from '@/lib/db';
import { fmtCount, timeAgo } from '@/lib/feed-map';
import { useMe } from '@/lib/me';
import { rowToRepost, type Repost } from '@/lib/reposts';
import { face, photo } from '@/lib/mock';
import { formatCfa, type Product } from '@/types/db';

const DEFAULT_BANNER = require('@/assets/images/default-banner.png');

type Section = 'posts' | 'texte' | 'boutique' | 'achats' | 'reposts';

/** Badge de certification bleu façon X. */
function BadgeVerified({ size = 18 }: { size?: number }) {
  return (
    <View style={[styles.badge, { width: size, height: size, borderRadius: size / 2 }]}>
      <Ionicons name="checkmark-sharp" size={size * 0.62} color="#fff" />
    </View>
  );
}

/** État vide d'un onglet. */
function EmptyTab({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <View style={styles.gridEmpty}>
      <Ionicons name={icon} size={30} color={Afylo.textFaint} />
      <Text style={styles.gridEmptyText}>{text}</Text>
    </View>
  );
}

/** Profil VISITEUR (le compte d'un autre créateur, même design que ton profil). */
export default function CreatorProfile() {
  const router = useRouter();
  const me = useMe();
  const params = useLocalSearchParams<{ id: string; name?: string; avatar?: string }>();
  const [data, setData] = useState<CreatorData | null>(null);
  const [loading, setLoading] = useState(true);
  const [followed, setFollowed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [bump, setBump] = useState(0); // ajustement optimiste du nombre d'abonnés
  const [section, setSection] = useState<Section>('posts');
  const [products, setProducts] = useState<Product[]>([]);
  const [reposts, setReposts] = useState<Repost[]>([]);
  const [payItems, setPayItems] = useState<PayItem[] | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(null), 1700); };

  useEffect(() => {
    if (!params.id) return;
    setLoading(true);
    setBump(0);
    setSection('posts');
    setProducts([]);
    setReposts([]);
    getCreatorData(params.id)
      .then((d) => {
        setData(d);
        if (d?.profile?.id) {
          isFollowing(d.profile.id).then(setFollowed).catch(() => {});
          listRepostsByOwner(d.profile.id).then((rows) => setReposts(rows.map(rowToRepost))).catch(() => {});
          if (isProAccount(d.profile.account_type)) listProductsByOwner(d.profile.id).then(setProducts).catch(() => {});
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [params.id]);

  const p = data?.profile;
  const name = p?.display_name || params.name || 'Créateur';
  const handle = p?.handle ? `@${p.handle}` : params.id?.startsWith('@') ? params.id : `@${params.id ?? 'afylo'}`;
  const avatarUri = p?.avatar_url || params.avatar || face(params.id ?? 'afylo');
  const bio = p?.bio || '';
  const website = p?.website || null;
  const banner = p?.banner_url || null;
  const bannerPos = p?.banner_position ?? 50;
  const verified = p?.is_verified === true;
  const vkind = verifiedKind({ handle, is_verified: verified, verified_type: (p as any)?.verified_type });
  const isSelf = !!p?.id && !!me.id && p.id === me.id;
  const followers = Math.max(0, (data?.followers ?? 0) + bump);
  const posts = data?.posts ?? [];
  const mediaPosts = posts.filter((x) => x.kind !== 'text' && (x.media_url || x.thumbnail_url));
  const textPosts = posts.filter((x) => x.kind === 'text' || (!x.media_url && !x.thumbnail_url));
  // Taper une publication l'ouvre (compte visité → lecture seule, pas d'options).
  const openPost = (x: { id: string }) => router.push({ pathname: '/post/[id]', params: { id: x.id, author: p?.id ?? '' } });
  const creatorPro = isProAccount(p?.account_type); // Pro (vendeur) → onglet Boutique en plus

  // Mêmes onglets que ton profil : Simple = 4 (sans Boutique), Pro = 5
  const tabDefs: { key: Section; icon: keyof typeof Ionicons.glyphMap }[] = [
    { key: 'posts', icon: 'grid-outline' },
    { key: 'texte', icon: 'reader-outline' },
    ...(creatorPro ? [{ key: 'boutique' as Section, icon: 'bag-handle-outline' as const }] : []),
    { key: 'achats', icon: 'cart-outline' },
    { key: 'reposts', icon: 'repeat' },
  ];

  const buyProduct = (pr: Product) => setPayItems([{ title: pr.title, price: formatCfa(pr.promo_cfa ?? pr.price_cfa), priceCfa: pr.promo_cfa ?? pr.price_cfa, tiers: pr.quantity_tiers }]);

  // ---- Menu ⋯ du profil ----
  const profileUrl = `https://afylo.app/${handle}`;
  const act = (fn: () => void) => { setMenuOpen(false); setTimeout(fn, 120); };
  const copyUrl = async () => { try { await Clipboard.setStringAsync(profileUrl); } catch {} showToast('Lien du profil copié'); };
  const shareProfile = () => { Share.share({ message: `Découvre ${name} sur Afylo — ${handle}\n${profileUrl}` }).catch(() => {}); };
  const block = () => { showToast(`${handle} bloqué`); setTimeout(() => (router.canGoBack() ? router.back() : router.replace('/accueil')), 700); };

  const menuRows: { icon: keyof typeof Ionicons.glyphMap; label: string; danger?: boolean; onPress: () => void }[] = [
    ...(isSelf ? [] : [
      { icon: 'remove-circle-outline' as const, label: 'Restreindre', onPress: () => act(() => showToast(`${handle} restreint`)) },
      { icon: 'ban-outline' as const, label: 'Bloquer', onPress: () => act(block) },
      { icon: 'flag-outline' as const, label: 'Signaler', danger: true, onPress: () => act(() => setReportOpen(true)) },
    ]),
    { icon: 'information-circle-outline', label: 'À propos de ce compte', onPress: () => act(() => showToast(`${handle} · a rejoint Afylo en 2026`)) },
    ...(isSelf ? [] : [{ icon: 'eye-off-outline' as const, label: 'Masquer votre story', onPress: () => act(() => showToast(`Ta story est masquée pour ${handle}`)) }]),
    { icon: 'link-outline', label: "Copier l'URL du profil", onPress: () => act(copyUrl) },
    { icon: 'share-social-outline', label: 'Partager ce profil', onPress: () => act(shareProfile) },
  ];

  const toggleFollow = async () => {
    if (!p?.id || isSelf || busy) return;
    const next = !followed;
    setBusy(true);
    setFollowed(next);
    setBump((b) => b + (next ? 1 : -1));
    try {
      if (next) await followUser(p.id);
      else await unfollowUser(p.id);
    } catch {
      setFollowed(!next); // rollback
      setBump((b) => b + (next ? -1 : 1));
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.root}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 110 }}>
        {/* Bannière */}
        <View style={styles.banner}>
          <Image source={banner ? { uri: banner } : DEFAULT_BANNER} style={StyleSheet.absoluteFill} contentFit="cover" contentPosition={{ left: '50%', top: `${bannerPos}%` }} transition={200} />
          <SafeAreaView edges={['top']} style={styles.bannerBar}>
            <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/accueil'))} style={styles.roundBtn}>
              <Ionicons name="chevron-back" size={20} color="#fff" />
            </Pressable>
            <View style={{ flex: 1 }} />
            <Pressable style={styles.roundBtn} onPress={() => setMenuOpen(true)}>
              <Ionicons name="ellipsis-horizontal" size={20} color="#fff" />
            </Pressable>
          </SafeAreaView>
        </View>

        {/* Avatar chevauchant + actions */}
        <View style={styles.identityRow}>
          <View style={styles.avatarOnBanner}>
            <Avatar uri={avatarUri} size={82} ring />
          </View>
          <View style={{ flex: 1 }} />
          {isSelf ? (
            <Pressable style={styles.editBtn} onPress={() => router.replace('/profil')}>
              <Text style={styles.editBtnText}>Voir mon profil</Text>
            </Pressable>
          ) : (
            <View style={styles.actionRow}>
              <Pressable style={styles.msgBtn} onPress={() => p?.id && router.push({ pathname: '/chat/[id]', params: { id: p.id, name, avatar: avatarUri } })}>
                <Ionicons name="chatbubble-outline" size={18} color={Afylo.text} />
              </Pressable>
              <Pressable style={[styles.followBtn, followed && styles.followBtnOn]} onPress={toggleFollow} disabled={busy}>
                {followed && <Ionicons name="checkmark" size={15} color={Afylo.text} />}
                <Text style={[styles.followText, followed && styles.followTextOn]}>{followed ? 'Abonné' : 'Suivre'}</Text>
              </Pressable>
            </View>
          )}
        </View>

        {/* Nom + badge */}
        <View style={styles.nameRow}>
          <Text style={styles.name}>{name}</Text>
          <VerifiedBadge kind={vkind} size={18} />
        </View>
        <Text style={styles.handleText}>{handle}</Text>

        {/* Compteurs (avant la bio) */}
        <View style={styles.countsRow}>
          <View style={styles.count}><Text style={styles.countN}>{fmtCount(followers)}</Text><Text style={styles.countL}> Abonnés</Text></View>
          <View style={styles.count}><Text style={styles.countN}>{fmtCount(posts.length)}</Text><Text style={styles.countL}> Posts</Text></View>
          <View style={styles.count}><Text style={styles.countN}>{fmtCount(data?.views ?? 0)}</Text><Text style={styles.countL}> Vues</Text></View>
        </View>

        {!!bio && <Text style={styles.bio}>{bio}</Text>}

        {(website || p?.handle) && (
          <View style={styles.metaRow}>
            {website && (
              <Pressable style={styles.meta} onPress={() => Linking.openURL(website.startsWith('http') ? website : `https://${website}`)}>
                <Ionicons name="link-outline" size={15} color={Afylo.violet} />
                <Text style={[styles.metaText, { color: Afylo.violet }]}>{website}</Text>
              </Pressable>
            )}
            <View style={styles.meta}>
              <Ionicons name="location-outline" size={15} color={Afylo.textDim} />
              <Text style={styles.metaText}>Dakar, Sénégal</Text>
            </View>
          </View>
        )}

        {/* Onglets — même règle que ton profil : Simple = 4 (sans Boutique), Pro = 5 */}
        <View style={styles.tabs}>
          {tabDefs.map((t) => (
            <Pressable key={t.key} style={[styles.tab, section === t.key && styles.tabOn]} onPress={() => setSection(t.key)}>
              <Ionicons name={t.icon} size={20} color={section === t.key ? Afylo.text : Afylo.textFaint} />
            </Pressable>
          ))}
        </View>

        {loading ? (
          <ActivityIndicator color={Afylo.violet} style={{ marginTop: 34 }} />
        ) : section === 'boutique' ? (
          products.length === 0 ? (
            <EmptyTab icon="bag-handle-outline" text="Aucun produit en vente" />
          ) : (
            <View style={styles.prodGrid}>
              {products.map((pr) => (
                <View key={pr.id} style={styles.prodCard}>
                  <View style={styles.prodImg}>
                    <Image source={{ uri: pr.image_url || pr.images?.[0] || photo(pr.id, 300, 300) }} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} />
                    {pr.stock <= 0 && <View style={styles.prodOut}><Text style={styles.prodOutText}>Épuisé</Text></View>}
                  </View>
                  <Text style={styles.prodTitle} numberOfLines={1}>{pr.title}</Text>
                  {pr.promo_cfa ? (
                    <View style={styles.priceRow}>
                      <Text style={styles.prodPrice}>{pr.promo_cfa.toLocaleString('fr-FR')} F</Text>
                      <Text style={styles.prodPriceOld}>{pr.price_cfa.toLocaleString('fr-FR')} F</Text>
                    </View>
                  ) : (
                    <Text style={styles.prodPrice}>{pr.price_cfa.toLocaleString('fr-FR')} F</Text>
                  )}
                  <Pressable style={styles.buyBtn} onPress={() => buyProduct(pr)}>
                    <Text style={styles.buyBtnText}>Acheter</Text>
                  </Pressable>
                </View>
              ))}
            </View>
          )
        ) : section === 'texte' ? (
          textPosts.length === 0 ? (
            <EmptyTab icon="reader-outline" text="Aucun post texte" />
          ) : (
            <View>
              {textPosts.map((x) => (
                <Pressable key={x.id} style={styles.tweet} onPress={() => openPost(x)}>
                  <Image source={{ uri: avatarUri }} style={styles.tweetAvatar} contentFit="cover" />
                  <View style={{ flex: 1 }}>
                    <View style={styles.tweetHead}>
                      <Text style={styles.tweetName} numberOfLines={1}>{name}</Text>
                      <VerifiedBadge kind={vkind} size={14} />
                      <Text style={styles.tweetHandle} numberOfLines={1}>{handle} · {timeAgo(x.created_at)}</Text>
                    </View>
                    {!!x.caption && <Text style={styles.tweetText}>{x.caption}</Text>}
                    <View style={styles.tweetStats}>
                      <View style={styles.tweetStat}><Ionicons name="chatbubble-outline" size={15} color={Afylo.textFaint} /><Text style={styles.tweetStatN}>{x.comment_count || 0}</Text></View>
                      <View style={styles.tweetStat}><Ionicons name="heart-outline" size={15} color={Afylo.textFaint} /><Text style={styles.tweetStatN}>{x.like_count || 0}</Text></View>
                      <View style={styles.tweetStat}><Ionicons name="bar-chart-outline" size={15} color={Afylo.textFaint} /><Text style={styles.tweetStatN}>{x.view_count || 0}</Text></View>
                    </View>
                  </View>
                </Pressable>
              ))}
            </View>
          )
        ) : section === 'achats' ? (
          <EmptyTab icon="lock-closed-outline" text="Les achats sont privés" />
        ) : section === 'reposts' ? (
          reposts.length === 0 ? (
            <EmptyTab icon="repeat" text="Aucune republication" />
          ) : (
            <View style={styles.grid}>
              {reposts.map((r) => (
                <Pressable key={r.id} style={styles.cell} onPress={() => r.post.product && buyProduct({ id: r.post.id, title: r.post.product.title, price_cfa: parseInt(r.post.product.price.replace(/\D/g, ''), 10) || 0, promo_cfa: null } as Product)}>
                  <Image source={{ uri: r.post.image || photo(r.post.id, 300, 380) }} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} />
                  <View style={styles.repostTag}><Ionicons name="repeat" size={12} color="#fff" /></View>
                  {r.text ? <View style={styles.repostQuote}><Text style={styles.repostQuoteText} numberOfLines={2}>{r.text}</Text></View> : null}
                  {r.post.product ? <View style={styles.repostBuy}><Text style={styles.repostBuyText}>Acheter</Text></View> : null}
                </Pressable>
              ))}
            </View>
          )
        ) : mediaPosts.length === 0 ? (
          <EmptyTab icon="camera-outline" text="Aucune publication" />
        ) : (
          <View style={styles.grid}>
            {mediaPosts.map((x) => (
              <Pressable key={x.id} style={styles.cell} onPress={() => openPost(x)}>
                <Image source={{ uri: x.thumbnail_url || x.media_url || photo(x.id, 300, 380) }} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} />
                {x.kind === 'video' && (
                  <View style={styles.cellTag}>
                    <Ionicons name="play" size={11} color="#fff" />
                    <Text style={styles.cellTagText}>{fmtCount(x.view_count)}</Text>
                  </View>
                )}
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>

      <PaymentSheet visible={!!payItems} items={payItems ?? []} onClose={() => setPayItems(null)} />
      <ReportSheet visible={reportOpen} onClose={() => setReportOpen(false)} />

      {/* Menu ⋯ du profil */}
      <Modal visible={menuOpen} transparent animationType="slide" onRequestClose={() => setMenuOpen(false)}>
        <Pressable style={styles.menuOverlay} onPress={() => setMenuOpen(false)}>
          <Pressable style={styles.menuSheet} onPress={(e) => e.stopPropagation?.()}>
            <View style={styles.menuGrip} />
            <Text style={styles.menuHandle} numberOfLines={1}>{handle}</Text>
            {menuRows.map((row) => (
              <Pressable key={row.label} style={styles.menuRow} onPress={row.onPress}>
                <Text style={[styles.menuLabel, row.danger && { color: Afylo.live }]}>{row.label}</Text>
                <Ionicons name={row.icon} size={22} color={row.danger ? Afylo.live : Afylo.text} />
              </Pressable>
            ))}
          </Pressable>
        </Pressable>
      </Modal>

      {toast && (
        <View style={styles.toast} pointerEvents="none">
          <Text style={styles.toastText}>{toast}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Afylo.bg },

  banner: { height: 150, backgroundColor: Afylo.surfaceAlt },
  bannerBar: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingTop: 6 },
  roundBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#00000055', alignItems: 'center', justifyContent: 'center' },

  identityRow: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 16, marginTop: -40 },
  avatarOnBanner: { borderRadius: 46, borderWidth: 4, borderColor: Afylo.bg, backgroundColor: Afylo.bg },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  msgBtn: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: Afylo.border, alignItems: 'center', justifyContent: 'center' },
  followBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: Afylo.violet, borderRadius: Radius.pill, paddingHorizontal: 20, height: 38, justifyContent: 'center' },
  followBtnOn: { backgroundColor: 'transparent', borderWidth: 1, borderColor: Afylo.border },
  followText: { color: '#fff', fontFamily: Font.bold, fontSize: 14 },
  followTextOn: { color: Afylo.text },
  editBtn: { borderWidth: 1, borderColor: Afylo.border, borderRadius: Radius.pill, paddingHorizontal: 16, height: 38, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  editBtnText: { color: Afylo.text, fontFamily: Font.bold, fontSize: 14 },

  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 18, marginTop: 12 },
  name: { ...Type.name, color: Afylo.text },
  badge: { backgroundColor: '#1D9BF0', alignItems: 'center', justifyContent: 'center' },
  handleText: { color: Afylo.textDim, fontSize: 15, paddingHorizontal: 18, marginTop: 1 },

  countsRow: { flexDirection: 'row', gap: 20, paddingHorizontal: 18, marginTop: 14 },
  count: { flexDirection: 'row', alignItems: 'baseline' },
  countN: { color: Afylo.text, fontFamily: Font.bold, fontSize: 15 },
  countL: { color: Afylo.textDim, fontSize: 14 },

  bio: { ...Type.bio, color: Afylo.text, opacity: 0.92, paddingHorizontal: 18, marginTop: 10 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, paddingHorizontal: 18, marginTop: 10 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { ...Type.small, color: Afylo.textDim },

  tabs: { flexDirection: 'row', marginTop: 18, borderBottomWidth: 1, borderBottomColor: Afylo.surfaceAlt },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabOn: { borderBottomColor: Afylo.text },

  prodGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingHorizontal: 12, paddingTop: 12 },
  prodCard: { width: '48%', backgroundColor: Afylo.surface, borderWidth: 1, borderColor: Afylo.border, borderRadius: Radius.md, padding: 8 },
  prodImg: { aspectRatio: 1, borderRadius: Radius.sm, overflow: 'hidden', backgroundColor: Afylo.surfaceAlt, marginBottom: 8 },
  prodOut: { ...StyleSheet.absoluteFillObject, backgroundColor: '#000000AA', alignItems: 'center', justifyContent: 'center' },
  prodOutText: { color: '#fff', fontFamily: Font.bold, fontSize: 13 },
  prodTitle: { color: Afylo.text, fontSize: 14, fontFamily: Font.semibold, paddingHorizontal: 2 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6, paddingHorizontal: 2, marginTop: 2 },
  prodPrice: { color: Afylo.gold, fontSize: 15, fontFamily: Font.bold, paddingHorizontal: 2, marginTop: 2 },
  prodPriceOld: { color: Afylo.textFaint, fontSize: 12, fontFamily: Font.semibold, textDecorationLine: 'line-through' },
  buyBtn: { backgroundColor: Afylo.violet, borderRadius: Radius.pill, paddingVertical: 9, alignItems: 'center', marginTop: 8 },
  buyBtnText: { color: '#fff', fontFamily: Font.bold, fontSize: 13 },

  tweet: { flexDirection: 'row', gap: 12, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: Afylo.surfaceAlt },
  tweetAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: Afylo.surfaceAlt },
  tweetHead: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  tweetName: { ...Type.body, fontFamily: Font.bold, color: Afylo.text, flexShrink: 1 },
  tweetHandle: { color: Afylo.textDim, fontSize: 14, flexShrink: 1 },
  tweetText: { color: Afylo.text, fontSize: 15, lineHeight: 21, marginTop: 3 },
  tweetStats: { flexDirection: 'row', gap: 28, marginTop: 10 },
  tweetStat: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  tweetStatN: { color: Afylo.textFaint, fontSize: 13 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 2, marginTop: 18 },
  cell: { width: '33%', aspectRatio: 0.8, backgroundColor: Afylo.surfaceAlt, flexGrow: 1 },
  cellTag: { position: 'absolute', bottom: 6, left: 6, flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#00000088', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  cellTagText: { color: '#fff', fontFamily: Font.medium, fontSize: 10 },
  repostTag: { position: 'absolute', top: 6, right: 6, width: 22, height: 22, borderRadius: 11, backgroundColor: '#00000088', alignItems: 'center', justifyContent: 'center' },
  repostQuote: { position: 'absolute', left: 0, right: 0, top: 0, backgroundColor: '#000000aa', paddingHorizontal: 6, paddingVertical: 5 },
  repostQuoteText: { color: '#fff', fontSize: 10, lineHeight: 13 },
  repostBuy: { position: 'absolute', bottom: 6, right: 6, backgroundColor: Afylo.violet, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  repostBuyText: { color: '#fff', fontSize: 10, fontFamily: Font.bold },
  gridEmpty: { alignItems: 'center', paddingVertical: 44 },
  gridEmptyText: { color: Afylo.textDim, fontSize: 14, marginTop: 10 },

  // Menu ⋯
  menuOverlay: { flex: 1, backgroundColor: '#00000066', justifyContent: 'flex-end' },
  menuSheet: { backgroundColor: Afylo.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 34 },
  menuGrip: { width: 38, height: 4, borderRadius: 2, backgroundColor: Afylo.border, alignSelf: 'center', marginBottom: 10 },
  menuHandle: { color: Afylo.textDim, fontSize: 13, fontFamily: Font.semibold, textAlign: 'center', marginBottom: 6 },
  menuRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: Afylo.surfaceAlt },
  menuLabel: { color: Afylo.text, fontSize: 16, fontFamily: Font.semibold },

  toast: { position: 'absolute', bottom: 44, left: 30, right: 30, backgroundColor: '#000000E6', borderRadius: Radius.pill, paddingVertical: 12, paddingHorizontal: 18, alignItems: 'center' },
  toastText: { color: '#fff', fontSize: 14, fontFamily: Font.semibold, textAlign: 'center' },
});
