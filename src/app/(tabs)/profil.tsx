import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Linking, Modal, Pressable, ScrollView, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AccountSwitcher } from '@/components/account-switcher';
import { Avatar, PillButton } from '@/components/ui-kit';
import { RepostSheet, MediaPreview } from '@/components/repost-sheet';
import { GridSkeleton } from '@/components/skeleton';
import { VerifiedBadge, verifiedKind } from '@/components/verified';
import { Afylo, Font, Radius, Type } from '@/constants/brand';
import { useAuth } from '@/lib/auth';
import { setProfileInfo } from '@/lib/accounts';
import { deletePost, deleteProduct, getMyPosts, getMyProfile, isProAccount, listMyAffiliatedProducts, listMyProducts, updatePostCaption, type MyPost } from '@/lib/db';
import { timeAgo } from '@/lib/feed-map';
import { useMe } from '@/lib/me';
import { EMPTY_WALLET, getWalletSummary, type WalletSummary } from '@/lib/wallet';
import { useReposts, type Repost } from '@/lib/reposts';
import { useStories } from '@/lib/stories';
import { useAlwaysShowTabBar } from '@/lib/tabbar';
import { myLives, myProducts, myPurchases, photo, type MyLive, type Purchase } from '@/lib/mock';
import type { Profile } from '@/types/db';

/** Bannière Afylo par défaut (nouveau compte). Remplaçable par assets/images/default-banner.png. */
const DEFAULT_BANNER = require('@/assets/images/default-banner.png');

/** Format compact : 1234 → "1,2 K", 2_300_000 → "2,3 M". */
function nf(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace('.', ',').replace(',0', '')} M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace('.', ',').replace(',0', '')} K`;
  return String(n);
}

/** Forme d'affichage commune (produit réel ou démo). */
type DisplayProduct = { id: string; title: string; price: string; promo?: string | null; stock: number; sold: number; image: string; active: boolean; real: boolean };

type Section = 'posts' | 'texte' | 'boutique' | 'achats' | 'reposts';

export default function Profil() {
  const router = useRouter();
  const { session } = useAuth();
  const me = useMe(); // identité STABLE (chargée une fois au niveau app) → plus de flash mock
  const [section, setSection] = useState<Section>('posts');
  const isOwner = true; // l'onglet Profil est toujours TON profil ; le profil visiteur est /creator/[id]
  const [menuOpen, setMenuOpen] = useState(false);
  const [accountsOpen, setAccountsOpen] = useState(false);
  const [dbProfile, setDbProfile] = useState<Profile | null>(null);
  const [stats, setStats] = useState<WalletSummary>(EMPTY_WALLET);
  const [myRealPosts, setMyRealPosts] = useState<MyPost[]>([]);
  const [manage, setManage] = useState<MyPost | null>(null); // post dont le menu de gestion est ouvert
  const [editing, setEditing] = useState<MyPost | null>(null); // post en cours d'édition (légende)
  const [editText, setEditText] = useState('');

  // Enrichit le compte enregistré (nom/@handle/avatar) pour l'affichage dans « Changer de compte ».
  useEffect(() => {
    const id = session?.user?.id;
    if (!id) return;
    void setProfileInfo(id, { handle: dbProfile?.handle ?? undefined, name: dbProfile?.display_name ?? me.name, avatar: dbProfile?.avatar_url ?? me.avatar });
  }, [session?.user?.id, dbProfile, me.name, me.avatar]);
  const showTabBar = useAlwaysShowTabBar();
  const { myStory } = useStories();
  const openStory = () => (myStory ? router.push({ pathname: '/story/[uid]', params: { uid: myStory.id } }) : router.push('/creer'));

  // --- Gestion des posts (propriétaire) : afficher / modifier / supprimer / partager ---
  const viewPost = (p: MyPost) => {
    setManage(null);
    router.push({ pathname: '/post/[id]', params: { id: p.id, author: session?.user?.id ?? '' } });
  };
  const startEdit = (p: MyPost) => { setEditText(p.caption || ''); setEditing(p); setManage(null); };
  const saveEdit = () => {
    if (!editing) return;
    const t = editText.trim();
    setMyRealPosts((prev) => prev.map((x) => (x.id === editing.id ? { ...x, caption: t } : x)));
    updatePostCaption(editing.id, t).catch(() => {});
    setEditing(null);
  };
  const removeMyPost = (p: MyPost) => {
    setMyRealPosts((prev) => prev.filter((x) => x.id !== p.id));
    deletePost(p.id).catch(() => {});
    setManage(null);
  };
  const sharePost = (p: MyPost) => {
    setManage(null);
    Share.share({ message: `${name} sur Afylo : ${p.caption || handle}` }).catch(() => {});
  };

  useFocusEffect(
    useCallback(() => {
      showTabBar(); // pas de masquage de nav sur le profil
      if (session) {
        getMyProfile().then((prof) => {
          setDbProfile(prof);
          getWalletSummary(prof?.id ?? null).then(setStats).catch(() => setStats(EMPTY_WALLET));
        });
        getMyPosts().then(setMyRealPosts).catch(() => setMyRealPosts([]));
      }
    }, [session, showTabBar]),
  );

  // Identité affichée : le contexte "me" est la source unique (stable). dbProfile ne sert
  // qu'aux extras (site web, bannière, certification, type de compte).
  const name = me.name;
  const handle = me.handle.startsWith('@') ? me.handle : `@${me.handle}`;
  const avatarUri = me.avatar;
  const bio = me.bio || 'Ajoute une bio depuis « Éditer le profil ».';
  const website = dbProfile?.website || null;
  const banner = dbProfile?.banner_url || null;
  const bannerPos = dbProfile?.banner_position ?? 50; // position verticale de recadrage
  const isVerified = dbProfile?.is_verified === true || dbProfile?.handle === 'adbaecomx' || handle === '@adbaecomx';
  const vkind = verifiedKind({ handle, is_verified: isVerified, verified_type: (dbProfile as any)?.verified_type });
  const isPro = me.isPro || isProAccount(dbProfile?.account_type);

  const mediaPosts = myRealPosts.filter((x) => x.kind !== 'text' && (x.media_url || x.thumbnail_url));
  const textPosts = myRealPosts.filter((x) => x.kind === 'text' || (!x.media_url && !x.thumbnail_url));

  const share = async () => {
    try {
      await Share.share({ message: `Découvre ${name} sur Afylo — ${handle}` });
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
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 110 }}>
        {/* Bannière (image de couverture perso, sinon bannière Afylo par défaut) */}
        <View style={styles.banner}>
          <Image
            source={banner ? { uri: banner } : DEFAULT_BANNER}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            contentPosition={{ left: '50%', top: `${bannerPos}%` }}
            transition={200}
          />
          <SafeAreaView edges={['top']} style={styles.bannerBar}>
            <View style={{ flex: 1 }} />
            <Pressable onPress={() => router.push('/messages')} style={styles.roundBtn}>
              <Ionicons name="chatbubble-ellipses-outline" size={19} color="#fff" />
            </Pressable>
            {isOwner && isPro && (
              <Pressable onPress={() => router.push('/studio')} style={styles.roundBtn}>
                <Ionicons name="stats-chart" size={18} color={Afylo.gold} />
              </Pressable>
            )}
            <Pressable onPress={() => setMenuOpen(true)} style={styles.roundBtn}>
              <Ionicons name="menu" size={21} color="#fff" />
            </Pressable>
          </SafeAreaView>
        </View>

        {/* Avatar chevauchant + bouton Éditer (façon X) */}
        <View style={styles.identityRow}>
          <Pressable onPress={openStory} style={styles.avatarOnBanner}>
            <Avatar uri={avatarUri} size={82} ring={!!myStory} />
            {!myStory && (
              <View style={styles.addStoryBadge}>
                <Ionicons name="add" size={15} color="#fff" />
              </View>
            )}
          </Pressable>
          <View style={{ flex: 1 }} />
          <Pressable style={styles.editBtn} onPress={() => router.push('/edit-profile')}>
            <Text style={styles.editBtnText}>Éditer le profil</Text>
          </Pressable>
        </View>

        {/* Nom + badge premium */}
        <View style={styles.nameRow}>
          <Text style={styles.name}>{name}</Text>
          <VerifiedBadge kind={vkind} size={19} />
        </View>
        <Text style={styles.handleText}>{handle}</Text>

        {/* Compteurs remontés AVANT la bio. Abonnements/Abonnés cliquables →
            liste PRIVÉE (visible uniquement par toi). */}
        <View style={styles.countsRow}>
          <Pressable style={styles.count} onPress={() => router.push({ pathname: '/connections', params: { tab: 'following' } })}>
            <Text style={styles.countN}>{nf(stats.reach.following)}</Text>
            <Text style={styles.countL}> Abonnements</Text>
          </Pressable>
          <Pressable style={styles.count} onPress={() => router.push({ pathname: '/connections', params: { tab: 'followers' } })}>
            <Text style={styles.countN}>{nf(stats.reach.followers)}</Text>
            <Text style={styles.countL}> Abonnés</Text>
          </Pressable>
          {isPro && (
            <View style={styles.count}>
              <Text style={styles.countN}>{nf(stats.reach.sales)}</Text>
              <Text style={styles.countL}> Ventes</Text>
            </View>
          )}
        </View>

        <Text style={styles.bio}>{bio}</Text>

        {/* Site web + ville alignés sur une ligne (sans date d'arrivée) */}
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

        {/* Onglets — Pro : 5 (avec Boutique) · Simple : 4 (pas de Boutique, non vendeur) */}
        <View style={styles.tabs}>
          <SectionTab icon="grid-outline" active={section === 'posts'} onPress={() => setSection('posts')} />
          <SectionTab icon="reader-outline" active={section === 'texte'} onPress={() => setSection('texte')} />
          {isPro && <SectionTab icon="bag-handle-outline" active={section === 'boutique'} onPress={() => setSection('boutique')} />}
          <SectionTab icon="cart-outline" active={section === 'achats'} onPress={() => setSection('achats')} />
          <SectionTab icon="repeat" active={section === 'reposts'} onPress={() => setSection('reposts')} />
        </View>

        {section === 'posts' && <PostsGrid posts={mediaPosts} onView={viewPost} onManage={setManage} />}
        {section === 'texte' && <TextPostsList posts={textPosts} name={name} handle={handle} avatar={avatarUri} vkind={vkind} onCompose={() => router.push('/accueil')} onView={viewPost} onManage={setManage} />}
        {section === 'boutique' && (isPro || !isOwner ? <BoutiqueList isOwner={isOwner} /> : <ProUpsell onPress={() => router.push('/upgrade-pro')} what="vendre tes produits" />)}
        {section === 'achats' && <PurchasesList />}
        {section === 'reposts' && <RepostsGrid />}
      </ScrollView>

      {/* Menu hamburger */}
      {menuOpen && (
        <Pressable style={styles.overlay} onPress={() => setMenuOpen(false)}>
          <SafeAreaView edges={['top']} style={styles.menu}>
            <View style={styles.menuHandle} />
            {isOwner && !isPro && <MenuItem icon="briefcase-outline" label="Passer en compte professionnel" onPress={() => { setMenuOpen(false); router.push('/upgrade-pro'); }} />}
            {isPro && <MenuItem icon="repeat" label="Affiliation — produits à revendre" onPress={() => { setMenuOpen(false); router.push('/affiliation'); }} />}
            {isOwner && isPro && <MenuItem icon="wallet-outline" label="Portefeuille" onPress={() => { setMenuOpen(false); router.push('/studio'); }} />}
            <MenuItem icon="share-social-outline" label="Partager le profil" onPress={() => { setMenuOpen(false); share(); }} />
            <MenuItem icon="bookmark-outline" label="Enregistrements" onPress={() => { setMenuOpen(false); router.push('/saved'); }} />
            {isOwner && <MenuItem icon="people-outline" label="Changer de compte" onPress={() => { setMenuOpen(false); setAccountsOpen(true); }} />}
            <MenuItem icon="settings-outline" label="Paramètres" onPress={() => { setMenuOpen(false); router.push('/settings'); }} />
          </SafeAreaView>
        </Pressable>
      )}

      {/* Changer de compte (multi-comptes, sans déconnexion) */}
      <AccountSwitcher visible={accountsOpen} onClose={() => setAccountsOpen(false)} />

      {/* Gestion d'un post (propriétaire) : afficher / modifier / partager / supprimer */}
      {manage && (
        <PostManageSheet
          post={manage}
          onClose={() => setManage(null)}
          onView={() => viewPost(manage)}
          onEdit={() => startEdit(manage)}
          onShare={() => sharePost(manage)}
          onDelete={() => removeMyPost(manage)}
        />
      )}

      {/* Édition de la légende d'un post */}
      <Modal visible={!!editing} transparent animationType="slide" onRequestClose={() => setEditing(null)}>
        <Pressable style={styles.mgOverlay} onPress={() => setEditing(null)}>
          <Pressable style={styles.editSheet} onPress={(e) => e.stopPropagation?.()}>
            <View style={styles.mgGrip} />
            <Text style={styles.editTitle}>Modifier le post</Text>
            <TextInput
              style={styles.editInput}
              value={editText}
              onChangeText={setEditText}
              multiline
              autoFocus
              placeholder="Écris quelque chose…"
              placeholderTextColor={Afylo.textFaint}
            />
            <View style={styles.editActions}>
              <Pressable style={styles.editCancel} onPress={() => setEditing(null)}><Text style={styles.editCancelText}>Annuler</Text></Pressable>
              <Pressable style={[styles.editSave, !editText.trim() && { opacity: 0.5 }]} disabled={!editText.trim()} onPress={saveEdit}>
                <Text style={styles.editSaveText}>Enregistrer</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

/** Menu de gestion d'un post du profil (accès propriétaire). */
function PostManageSheet({ post, onClose, onView, onEdit, onShare, onDelete }: { post: MyPost; onClose: () => void; onView: () => void; onEdit: () => void; onShare: () => void; onDelete: () => void }) {
  const [confirm, setConfirm] = useState(false);
  const preview = (post.caption || (post.kind === 'text' ? 'Post texte' : 'Publication')).slice(0, 60);
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.mgOverlay} onPress={onClose}>
        <Pressable style={styles.mgSheet} onPress={(e) => e.stopPropagation?.()}>
          <View style={styles.mgGrip} />
          <Text style={styles.mgPreview} numberOfLines={1}>{preview}</Text>
          {confirm ? (
            <View style={{ gap: 10 }}>
              <Text style={styles.mgConfirmTitle}>Supprimer ce post ?</Text>
              <Text style={styles.mgConfirmSub}>Cette action est définitive et ne peut pas être annulée.</Text>
              <Pressable style={styles.mgDanger} onPress={onDelete}><Text style={styles.mgDangerText}>Supprimer définitivement</Text></Pressable>
              <Pressable style={styles.mgCancel} onPress={() => setConfirm(false)}><Text style={styles.mgCancelText}>Annuler</Text></Pressable>
            </View>
          ) : (
            <View style={styles.mgList}>
              <ManageRow icon="eye-outline" label="Afficher le post" onPress={onView} />
              <ManageRow icon="create-outline" label="Modifier" onPress={onEdit} />
              <ManageRow icon="share-social-outline" label="Partager" onPress={onShare} />
              <ManageRow icon="trash-outline" label="Supprimer" danger onPress={() => setConfirm(true)} last />
            </View>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function ManageRow({ icon, label, onPress, danger, last }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void; danger?: boolean; last?: boolean }) {
  return (
    <Pressable style={[styles.mgRow, !last && styles.mgRowBorder]} onPress={onPress}>
      <Ionicons name={icon} size={22} color={danger ? Afylo.live : Afylo.text} />
      <Text style={[styles.mgRowText, danger && { color: Afylo.live }]}>{label}</Text>
    </Pressable>
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

/** Badge de certification façon X (Twitter) — pastille bleue premium. */
function BadgeVerified({ size = 19 }: { size?: number }) {
  return (
    <View style={[styles.badge, { width: size, height: size, borderRadius: size / 2 }]}>
      <Ionicons name="checkmark-sharp" size={size * 0.62} color="#fff" />
    </View>
  );
}

/** Onglet Texte : les publications 100% texte façon X (avec accès propriétaire). */
function TextPostsList({ posts, name, handle, avatar, vkind, onCompose, onView, onManage }: { posts: MyPost[]; name: string; handle: string; avatar: string; vkind: 'blue' | 'gold' | null; onCompose: () => void; onView: (p: MyPost) => void; onManage: (p: MyPost) => void }) {
  if (posts.length === 0) {
    return (
      <View style={styles.gridEmpty}>
        <Ionicons name="reader-outline" size={34} color={Afylo.textFaint} />
        <Text style={styles.gridEmptyTitle}>Aucun post texte</Text>
        <Text style={styles.gridEmptySub}>Écris un post depuis l'accueil (l'icône ✎) pour le retrouver ici.</Text>
        <Pressable style={styles.composeCta} onPress={onCompose}>
          <Ionicons name="create-outline" size={17} color="#fff" />
          <Text style={styles.composeCtaText}>Écrire un post</Text>
        </Pressable>
      </View>
    );
  }
  return (
    <View>
      {posts.map((p) => (
        <Pressable key={p.id} style={styles.tweet} onPress={() => onView(p)}>
          <Image source={{ uri: avatar }} style={styles.tweetAvatar} contentFit="cover" />
          <View style={{ flex: 1 }}>
            <View style={styles.tweetHead}>
              <Text style={styles.tweetName} numberOfLines={1}>{name}</Text>
              <VerifiedBadge kind={vkind} size={15} />
              <Text style={styles.tweetHandle} numberOfLines={1}>{handle} · {timeAgo(p.created_at)}</Text>
              <View style={{ flex: 1 }} />
              <Pressable hitSlop={8} onPress={() => onManage(p)} style={styles.tweetMenu}>
                <Ionicons name="ellipsis-horizontal" size={18} color={Afylo.textDim} />
              </Pressable>
            </View>
            {!!p.caption && <Text style={styles.tweetText}>{p.caption}</Text>}
            <View style={styles.tweetStats}>
              <View style={styles.tweetStat}><Ionicons name="chatbubble-outline" size={15} color={Afylo.textFaint} /><Text style={styles.tweetStatN}>{p.comment_count || 0}</Text></View>
              <View style={styles.tweetStat}><Ionicons name="heart-outline" size={15} color={Afylo.textFaint} /><Text style={styles.tweetStatN}>{p.like_count || 0}</Text></View>
              <View style={styles.tweetStat}><Ionicons name="bar-chart-outline" size={15} color={Afylo.textFaint} /><Text style={styles.tweetStatN}>{p.view_count || 0}</Text></View>
            </View>
          </View>
        </Pressable>
      ))}
    </View>
  );
}

function PostsGrid({ posts, onView, onManage }: { posts: MyPost[]; onView: (p: MyPost) => void; onManage: (p: MyPost) => void }) {
  if (posts.length === 0) {
    return (
      <View style={styles.gridEmpty}>
        <Ionicons name="camera-outline" size={34} color={Afylo.textFaint} />
        <Text style={styles.gridEmptyTitle}>Aucune publication</Text>
        <Text style={styles.gridEmptySub}>Tes vidéos et photos apparaîtront ici.</Text>
      </View>
    );
  }
  return (
    <View style={styles.mediaGrid}>
      {posts.map((p) => (
        <Pressable key={p.id} style={styles.cell} onPress={() => onView(p)}>
          <Image source={{ uri: p.thumbnail_url || p.media_url || undefined }} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} />
          {/* 3 points = options (le tap sur la cellule ouvre le post) */}
          <Pressable hitSlop={8} onPress={() => onManage(p)} style={styles.cellMenu}><Ionicons name="ellipsis-horizontal" size={15} color="#fff" /></Pressable>
          {p.kind === 'video' && (
            <View style={styles.cellTag}>
              <Ionicons name="play" size={11} color="#fff" />
              <Text style={styles.cellTagText}>{p.view_count > 0 ? p.view_count.toLocaleString('fr-FR') : ''}</Text>
            </View>
          )}
        </Pressable>
      ))}
    </View>
  );
}

const PURCHASE_STATUS: Record<Purchase['status'], { label: string; color: string; icon: keyof typeof Ionicons.glyphMap }> = {
  sequestre: { label: 'En séquestre', color: Afylo.violet, icon: 'lock-closed' },
  a_confirmer: { label: 'Confirmer la réception', color: Afylo.gold, icon: 'cube' },
  termine: { label: 'Terminé', color: Afylo.green, icon: 'checkmark-circle' },
};

function PurchasesList() {
  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 12, gap: 12 }}>
      {myPurchases.map((p) => {
        const st = PURCHASE_STATUS[p.status];
        return (
          <View key={p.id} style={styles.purchaseRow}>
            <Image source={{ uri: p.image }} style={styles.purchaseImg} contentFit="cover" />
            <View style={{ flex: 1 }}>
              <Text style={styles.purchaseTitle} numberOfLines={1}>{p.title}</Text>
              <Text style={styles.purchaseMeta}>{p.seller} · {p.date}</Text>
              <View style={styles.purchaseStatus}>
                <Ionicons name={st.icon} size={13} color={st.color} />
                <Text style={[styles.purchaseStatusText, { color: st.color }]}>{st.label}</Text>
              </View>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 6 }}>
              <Text style={styles.purchasePrice}>{p.price}</Text>
              {p.status === 'a_confirmer' && (
                <Pressable style={styles.confirmBtn}><Text style={styles.confirmText}>Confirmer</Text></Pressable>
              )}
            </View>
          </View>
        );
      })}
      <Text style={styles.purchaseNote}>Paiements sécurisés par XaalisPay — l'argent n'est versé au vendeur qu'après ta confirmation.</Text>
    </View>
  );
}

function ProUpsell({ onPress, what }: { onPress: () => void; what: string }) {
  return (
    <View style={styles.upsell}>
      <View style={styles.upsellIcon}><Ionicons name="briefcase" size={30} color={Afylo.violet} /></View>
      <Text style={styles.upsellTitle}>Compte professionnel requis</Text>
      <Text style={styles.upsellSub}>Pour {what}, passe en Pro — ouvre ta boutique, vends en live et accède aux statistiques.</Text>
      <Pressable onPress={onPress} style={styles.upsellBtn}><Text style={styles.upsellBtnText}>Devenir pro · Gratuit</Text></Pressable>
    </View>
  );
}

const fmtCfa = (n: number) => n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' FCFA';

function RepostsGrid() {
  const { reposts, updateRepost, removeRepost } = useReposts();
  const [openId, setOpenId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Repost | null>(null);
  const open = reposts.find((r) => r.id === openId) ?? null; // live : se met à jour avec le store

  if (reposts.length === 0) {
    return (
      <View style={{ alignItems: 'center', paddingVertical: 40 }}>
        <Ionicons name="repeat" size={40} color={Afylo.textFaint} />
        <Text style={styles.emptyText}>Aucun repartage pour l'instant.{'\n'}Repartage un produit en affiliation depuis l'accueil pour le retrouver ici.</Text>
      </View>
    );
  }

  return (
    <>
      <View style={styles.mediaGrid}>
        {reposts.map((r) => (
          <Pressable key={r.id} style={styles.cell} onPress={() => setOpenId(r.id)}>
            <Image source={{ uri: r.post.image }} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} />
            <View style={styles.repostTag}><Ionicons name="repeat" size={12} color="#fff" /></View>
            {r.media && (
              <View style={styles.repostMediaTag}>
                <Ionicons name={r.media.kind === 'vocal' ? 'mic' : r.media.kind === 'video' ? 'videocam' : 'image'} size={11} color="#fff" />
              </View>
            )}
            {r.text ? (
              <View style={styles.repostQuoteBar}><Text style={styles.repostQuoteText} numberOfLines={2}>{r.text}</Text></View>
            ) : null}
          </Pressable>
        ))}
      </View>

      {/* Détail d'un repartage */}
      <Modal visible={!!open} transparent animationType="slide" onRequestClose={() => setOpenId(null)}>
        <Pressable style={styles.rdOverlay} onPress={() => setOpenId(null)}>
          <Pressable style={styles.rdSheet} onPress={(e) => e.stopPropagation?.()}>
            <View style={styles.rdHandle} />
            {open && (
              <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 520 }}>
                <View style={styles.rdHeader}>
                  <View style={styles.rdMe}><Ionicons name="repeat" size={14} color={'#16A34A'} /><Text style={styles.rdMeText}>Tu as republié</Text></View>
                  <View style={{ flex: 1 }} />
                  <Pressable onPress={() => { const r = open; setOpenId(null); setEditing(r); }} style={styles.rdAction}><Ionicons name="create-outline" size={20} color={Afylo.text} /></Pressable>
                  <Pressable onPress={() => { removeRepost(open.id); setOpenId(null); }} style={styles.rdAction}><Ionicons name="trash-outline" size={20} color={Afylo.live} /></Pressable>
                </View>

                {open.text ? <Text style={styles.rdQuote}>{open.text}</Text> : null}
                {open.media ? <MediaPreview media={open.media} /> : null}

                <View style={styles.rdQuoted}>
                  <Image source={{ uri: open.post.avatar }} style={styles.rdAvatar} contentFit="cover" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rdName}>{open.post.name}</Text>
                    <Text style={styles.rdCaption} numberOfLines={2}>{open.post.caption}</Text>
                    {open.post.product && (
                      <View style={styles.rdProduct}>
                        <Ionicons name="bag-handle" size={12} color={Afylo.violet} />
                        <Text style={styles.rdProductText} numberOfLines={1}>{open.post.product.title} · {open.post.product.price}</Text>
                      </View>
                    )}
                  </View>
                  <Image source={{ uri: open.post.image }} style={styles.rdThumb} contentFit="cover" />
                </View>

                {/* Lien d'affiliation créé automatiquement à ton nom */}
                {open.affiliate && (
                  <View style={styles.affBox}>
                    <View style={styles.affHead}>
                      <Ionicons name="link" size={15} color={Afylo.violet} />
                      <Text style={styles.affTitle}>Ton lien d'affiliation</Text>
                    </View>
                    <Text style={styles.affLink} numberOfLines={1}>{open.affiliate.link}</Text>
                    <Text style={styles.affInfo}>Toute vente via ce lien te verse <Text style={{ fontFamily: Font.bold, color: Afylo.text }}>{open.affiliate.commission}</Text> de commission.</Text>
                    <View style={styles.affStats}>
                      <View style={styles.affStat}><Text style={styles.affStatV}>{open.affiliate.sales}</Text><Text style={styles.affStatL}>ventes</Text></View>
                      <View style={styles.affDivider} />
                      <View style={styles.affStat}><Text style={[styles.affStatV, { color: '#16A34A' }]}>{fmtCfa(open.affiliate.earned)}</Text><Text style={styles.affStatL}>gagnés</Text></View>
                    </View>
                    <Pressable style={styles.affShare} onPress={() => Share.share({ message: `Découvre ${open.post.product?.title ?? 'ce produit'} sur Afylo 👉 ${open.affiliate!.link}` }).catch(() => {})}>
                      <Ionicons name="share-social" size={16} color="#fff" /><Text style={styles.affShareText}>Partager le lien</Text>
                    </Pressable>
                  </View>
                )}
                <View style={{ height: 10 }} />
              </ScrollView>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Édition */}
      <RepostSheet
        visible={!!editing}
        editing
        isPro
        post={editing?.post ?? null}
        initial={{ text: editing?.text, media: editing?.media }}
        onClose={() => setEditing(null)}
        onUpgrade={() => {}}
        onPublish={(p) => { if (editing) updateRepost(editing.id, { text: p.text, media: p.media, mode: 'quote' }); }}
      />
    </>
  );
}

function BoutiqueList({ isOwner }: { isOwner: boolean }) {
  const router = useRouter();
  const { session } = useAuth();
  const [products, setProducts] = useState<DisplayProduct[] | null>(null);
  const [affiliated, setAffiliated] = useState<DisplayProduct[]>([]);
  const [tab, setTab] = useState<'own' | 'affil'>('own'); // 2 sections : produits créés / produits affiliés
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!session) {
      setProducts(null); // pas connecté → on montrera la démo
      return;
    }
    setLoading(true);
    try {
      const [rows, aff] = await Promise.all([listMyProducts(), listMyAffiliatedProducts()]);
      setProducts(
        rows.map((r) => ({
          id: r.id,
          title: r.title,
          price: r.price_cfa.toLocaleString('fr-FR'),
          promo: r.promo_cfa ? r.promo_cfa.toLocaleString('fr-FR') : null,
          stock: r.stock,
          sold: r.sold_count,
          image: r.image_url || photo(`prod-${r.id}`, 400, 400),
          active: r.is_active,
          real: true,
        })),
      );
      setAffiliated(
        aff.map((r) => ({
          id: r.id,
          title: r.title,
          price: (r.promo_cfa ?? r.price_cfa).toLocaleString('fr-FR'),
          promo: r.promo_cfa ? r.price_cfa.toLocaleString('fr-FR') : null,
          stock: r.stock,
          sold: r.sold_count,
          image: r.image_url || photo(`prod-${r.id}`, 400, 400),
          active: r.is_active,
          real: false, // produit d'un autre vendeur → non modifiable/supprimable par le revendeur
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

  const [confirm, setConfirm] = useState<DisplayProduct | null>(null);
  const doDelete = async () => {
    if (!confirm) return;
    await deleteProduct(confirm.id);
    setConfirm(null);
    load();
  };

  // Réels si connecté, sinon démo (mode invité / visiteur)
  const demo: DisplayProduct[] = myProducts.map((p) => ({ ...p, real: false }));
  const own = session && products ? products : demo;
  const current = tab === 'own' ? own : affiliated;
  const list = query.trim() ? current.filter((p) => p.title.toLowerCase().includes(query.trim().toLowerCase())) : current;

  return (
    <View style={{ paddingHorizontal: 12, paddingTop: 12 }}>
      {/* 2 sections : produits créés / produits affiliés */}
      <View style={styles.shopTabs}>
        <Pressable onPress={() => setTab('own')} style={[styles.shopTab, tab === 'own' && styles.shopTabOn]}>
          <Text style={[styles.shopTabText, tab === 'own' && styles.shopTabTextOn]}>Mes produits ({own.length})</Text>
        </Pressable>
        <Pressable onPress={() => setTab('affil')} style={[styles.shopTab, tab === 'affil' && styles.shopTabOn]}>
          <Text style={[styles.shopTabText, tab === 'affil' && styles.shopTabTextOn]}>Affiliés ({affiliated.length})</Text>
        </Pressable>
      </View>

      {/* Recherche */}
      <View style={styles.shopSearch}>
        <Ionicons name="search" size={17} color={Afylo.textDim} />
        <TextInput style={styles.shopSearchInput} value={query} onChangeText={setQuery} placeholder="Rechercher un produit" placeholderTextColor={Afylo.textFaint} autoCapitalize="none" />
        {query.length > 0 && <Ionicons name="close-circle" size={18} color={Afylo.textFaint} onPress={() => setQuery('')} />}
      </View>

      {isOwner && tab === 'own' && (
        <Pressable style={styles.createBtn} onPress={() => router.push('/product-new')}>
          <Ionicons name="add-circle" size={22} color={Afylo.violet} />
          <Text style={styles.createText}>Créer un produit</Text>
        </Pressable>
      )}
      {isOwner && tab === 'affil' && (
        <Pressable style={styles.createBtn} onPress={() => router.push('/affiliation')}>
          <Ionicons name="repeat" size={20} color={Afylo.violet} />
          <Text style={styles.createText}>Trouver des produits à revendre</Text>
        </Pressable>
      )}

      {loading && <GridSkeleton count={4} />}

      {session && list.length === 0 && !loading && (
        <Text style={styles.emptyText}>{tab === 'own' ? "Aucun produit pour l'instant. Crée ton premier article ci-dessus." : 'Aucun produit affilié. Ajoute-en depuis la page Affiliation.'}</Text>
      )}

      {!session && isOwner && (
        <Text style={styles.demoNote}>Aperçu démo — connecte-toi pour gérer ta vraie boutique.</Text>
      )}

      <View style={styles.prodGrid}>
        {list.map((p) => (
          <ProductCard
            key={p.id}
            p={p}
            isOwner={isOwner}
            onEdit={p.real ? () => router.push({ pathname: '/product-new', params: { id: p.id } }) : undefined}
            onDelete={p.real ? () => setConfirm(p) : undefined}
          />
        ))}
      </View>

      {confirm && <DeleteProductModal product={confirm} onCancel={() => setConfirm(null)} onConfirm={doDelete} />}
    </View>
  );
}

/** Suppression d'un produit — DOUBLE confirmation pour éviter les erreurs. */
function DeleteProductModal({ product, onCancel, onConfirm }: { product: DisplayProduct; onCancel: () => void; onConfirm: () => Promise<void> }) {
  const [step, setStep] = useState<1 | 2>(1);
  const [busy, setBusy] = useState(false);
  const confirmDelete = async () => { setBusy(true); try { await onConfirm(); } finally { setBusy(false); } };
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={styles.confirmOverlay} onPress={busy ? undefined : onCancel}>
        <Pressable style={styles.confirmCard} onPress={(e) => e.stopPropagation?.()}>
          <View style={styles.confirmIcon}><Ionicons name="trash" size={26} color={Afylo.live} /></View>
          {step === 1 ? (
            <>
              <Text style={styles.confirmTitle}>Supprimer ce produit ?</Text>
              <Text style={styles.confirmSub}>« {product.title} » sera retiré de ta boutique.</Text>
              <Pressable style={styles.confirmDanger} onPress={() => setStep(2)}><Text style={styles.confirmDangerText}>Continuer</Text></Pressable>
              <Pressable style={styles.confirmGhost} onPress={onCancel}><Text style={styles.confirmGhostText}>Annuler</Text></Pressable>
            </>
          ) : (
            <>
              <Text style={styles.confirmTitle}>Confirmer la suppression</Text>
              <Text style={styles.confirmSub}>Cette action est <Text style={{ fontFamily: Font.bold, color: Afylo.text }}>définitive</Text> et ne peut pas être annulée.</Text>
              <Pressable style={[styles.confirmDanger, busy && { opacity: 0.6 }]} disabled={busy} onPress={confirmDelete}>
                <Text style={styles.confirmDangerText}>{busy ? 'Suppression…' : 'Supprimer définitivement'}</Text>
              </Pressable>
              <Pressable style={styles.confirmGhost} onPress={() => setStep(1)} disabled={busy}><Text style={styles.confirmGhostText}>Retour</Text></Pressable>
            </>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/** Partage robuste : Share natif, repli presse-papier sur le web si indispo. */
async function shareMessage(message: string) {
  try {
    const res = await Share.share({ message });
    if ((res as any)?.action === 'dismissedAction') return;
  } catch {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(message);
      }
    } catch {}
  }
}

function ProductCard({ p, isOwner, onEdit, onDelete }: { p: DisplayProduct; isOwner: boolean; onEdit?: () => void; onDelete?: () => void }) {
  const shareProduct = () => shareMessage(`${p.title} — ${p.price} F sur Afylo 🛍️`);
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
      {p.promo ? (
        <View style={styles.priceRow}>
          <Text style={styles.prodPrice}>{p.promo} F</Text>
          <Text style={styles.prodPriceOld}>{p.price} F</Text>
        </View>
      ) : (
        <Text style={styles.prodPrice}>{p.price} F</Text>
      )}
      {isOwner ? (
        <View style={styles.prodMeta}>
          <Text style={styles.prodStat} numberOfLines={1}>{p.sold} vendus · {p.stock} en stock</Text>
          <View style={styles.prodActions}>
            <Pressable style={styles.prodAction} onPress={onEdit} disabled={!onEdit}><Ionicons name="create-outline" size={16} color={onEdit ? Afylo.textDim : Afylo.textFaint} /></Pressable>
            <Pressable style={styles.prodAction} onPress={shareProduct}><Ionicons name="share-social-outline" size={16} color={Afylo.textDim} /></Pressable>
            <Pressable style={styles.prodAction} onPress={onDelete} disabled={!onDelete}>
              <Ionicons name="trash-outline" size={16} color={onDelete ? Afylo.live : Afylo.textFaint} />
            </Pressable>
          </View>
        </View>
      ) : (
        <View style={styles.buyRow}>
          <Pressable style={styles.buyBtn}><Text style={styles.buyBtnText}>Acheter</Text></Pressable>
          <Pressable style={styles.shareBtnSm} onPress={shareProduct}><Ionicons name="share-social-outline" size={16} color={Afylo.violet} /></Pressable>
        </View>
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

  // --- Refonte façon X : bannière + identité ---
  banner: { height: 150, backgroundColor: Afylo.surfaceAlt },
  bannerBar: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingTop: 6 },
  roundBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#00000055', alignItems: 'center', justifyContent: 'center' },
  identityRow: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 16, marginTop: -40 },
  avatarOnBanner: { borderRadius: 46, borderWidth: 4, borderColor: Afylo.bg, backgroundColor: Afylo.bg },
  editBtn: { borderWidth: 1, borderColor: Afylo.border, borderRadius: Radius.pill, paddingHorizontal: 16, height: 38, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  editBtnText: { color: Afylo.text, fontFamily: Font.bold, fontSize: 14 },
  handleText: { color: Afylo.textDim, fontSize: 15, paddingHorizontal: 18, marginTop: 1 },
  badge: { backgroundColor: '#1D9BF0', alignItems: 'center', justifyContent: 'center' },

  countsRow: { flexDirection: 'row', gap: 20, paddingHorizontal: 18, marginTop: 14 },
  count: { flexDirection: 'row', alignItems: 'baseline' },
  countN: { color: Afylo.text, fontFamily: Font.bold, fontSize: 15 },
  countL: { color: Afylo.textDim, fontSize: 14 },

  // --- Onglet Texte (posts façon X) ---
  tweet: { flexDirection: 'row', gap: 12, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: Afylo.surfaceAlt },
  tweetAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: Afylo.surfaceAlt },
  tweetHead: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  tweetName: { color: Afylo.text, fontFamily: Font.bold, fontSize: 15, flexShrink: 1 },
  tweetHandle: { color: Afylo.textDim, fontSize: 14, flexShrink: 1 },
  tweetText: { color: Afylo.text, fontSize: 15, lineHeight: 21, marginTop: 3 },
  tweetStats: { flexDirection: 'row', gap: 28, marginTop: 10 },
  tweetStat: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  tweetStatN: { color: Afylo.textFaint, fontSize: 13 },
  composeCta: { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: Afylo.violet, borderRadius: Radius.pill, paddingHorizontal: 18, paddingVertical: 11, marginTop: 16 },
  composeCtaText: { color: '#fff', fontFamily: Font.bold, fontSize: 14 },
  tweetMenu: { padding: 2 },

  // --- Gestion des posts (bottom sheets) ---
  cellMenu: { position: 'absolute', top: 6, right: 6, width: 24, height: 24, borderRadius: 12, backgroundColor: '#00000077', alignItems: 'center', justifyContent: 'center' },
  mgOverlay: { flex: 1, backgroundColor: '#00000066', justifyContent: 'flex-end' },
  mgSheet: { backgroundColor: Afylo.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 16, paddingBottom: 28 },
  mgGrip: { width: 40, height: 4, borderRadius: 2, backgroundColor: Afylo.border, alignSelf: 'center', marginBottom: 12 },
  mgPreview: { color: Afylo.textDim, fontSize: 13, fontFamily: Font.medium, textAlign: 'center', marginBottom: 14 },
  mgList: { backgroundColor: Afylo.surface, borderWidth: 1, borderColor: Afylo.border, borderRadius: Radius.lg, overflow: 'hidden' },
  mgRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingVertical: 15 },
  mgRowBorder: { borderBottomWidth: 1, borderBottomColor: Afylo.bg },
  mgRowText: { ...Type.body, fontFamily: Font.semibold, color: Afylo.text },
  mgConfirmTitle: { color: Afylo.text, fontSize: 17, fontFamily: Font.bold, textAlign: 'center' },
  mgConfirmSub: { color: Afylo.textDim, fontSize: 13, textAlign: 'center', lineHeight: 18, marginBottom: 6 },
  mgDanger: { backgroundColor: Afylo.live, borderRadius: Radius.pill, paddingVertical: 14, alignItems: 'center' },
  mgDangerText: { color: '#fff', fontFamily: Font.bold, fontSize: 15 },
  mgCancel: { paddingVertical: 12, alignItems: 'center' },
  mgCancelText: { color: Afylo.textDim, fontFamily: Font.semibold, fontSize: 15 },

  editSheet: { backgroundColor: Afylo.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 18, paddingBottom: 28 },
  editTitle: { color: Afylo.text, fontSize: 17, fontFamily: Font.bold, marginBottom: 12 },
  editInput: { backgroundColor: Afylo.surface, borderWidth: 1, borderColor: Afylo.border, borderRadius: Radius.md, color: Afylo.text, fontSize: 15, lineHeight: 21, padding: 14, minHeight: 110, textAlignVertical: 'top' },
  editActions: { flexDirection: 'row', gap: 12, marginTop: 16 },
  editCancel: { flex: 1, height: 48, borderRadius: Radius.pill, borderWidth: 1, borderColor: Afylo.border, alignItems: 'center', justifyContent: 'center' },
  editCancelText: { color: Afylo.text, fontFamily: Font.semibold, fontSize: 15 },
  editSave: { flex: 1, height: 48, borderRadius: Radius.pill, backgroundColor: Afylo.violet, alignItems: 'center', justifyContent: 'center' },
  editSaveText: { color: '#fff', fontFamily: Font.bold, fontSize: 15 },

  head: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, marginTop: 12, gap: 20 },
  addStoryBadge: { position: 'absolute', bottom: 0, right: 0, width: 26, height: 26, borderRadius: 13, backgroundColor: Afylo.violet, alignItems: 'center', justifyContent: 'center', borderWidth: 2.5, borderColor: Afylo.bg },
  statsRow: { flex: 1, flexDirection: 'row', justifyContent: 'space-around' },
  statValue: { ...Type.statNumber, color: Afylo.text },
  statLabel: { ...Type.statLabel, color: Afylo.textDim, marginTop: 4 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 18, marginTop: 18 },
  name: { ...Type.name, color: Afylo.text },
  bio: { ...Type.bio, color: Afylo.text, opacity: 0.9, paddingHorizontal: 18, marginTop: 8 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, paddingHorizontal: 18, marginTop: 10 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { ...Type.small, color: Afylo.textDim },
  earnPill: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', marginHorizontal: 18, marginTop: 12, backgroundColor: '#FFB0201A', borderWidth: 1, borderColor: '#FFB02033', paddingHorizontal: 12, paddingVertical: 8, borderRadius: Radius.pill, gap: 2 },
  earnText: { color: Afylo.textDim, fontSize: 13 },
  earnValue: { color: Afylo.gold, fontSize: 13, fontWeight: '800' },
  actions: { flexDirection: 'row', gap: 12, paddingHorizontal: 18, marginTop: 16 },
  proBanner: { flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: 18, marginTop: 16, padding: 12, borderRadius: Radius.lg, backgroundColor: '#3E5BFF0F', borderWidth: 1, borderColor: '#3E5BFF33' },
  proBannerIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: Afylo.violet, alignItems: 'center', justifyContent: 'center' },
  proBannerTitle: { ...Type.body, fontFamily: Font.semibold, color: Afylo.text },
  proBannerSub: { ...Type.caption, color: Afylo.textDim, marginTop: 2, lineHeight: 16 },
  upsell: { alignItems: 'center', paddingHorizontal: 30, paddingVertical: 40, gap: 8 },
  upsellIcon: { width: 70, height: 70, borderRadius: 22, backgroundColor: '#3E5BFF14', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  upsellTitle: { ...Type.title, fontSize: 18, color: Afylo.text, textAlign: 'center' },
  upsellSub: { ...Type.body, color: Afylo.textDim, textAlign: 'center', lineHeight: 21 },
  upsellBtn: { backgroundColor: Afylo.violet, paddingHorizontal: 22, paddingVertical: 13, borderRadius: Radius.pill, marginTop: 12 },
  upsellBtnText: { color: '#fff', fontFamily: Font.semibold, fontSize: 15 },

  tabs: { flexDirection: 'row', marginTop: 22, borderBottomWidth: 1, borderBottomColor: Afylo.surfaceAlt },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: Afylo.text },

  mediaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 2, marginTop: 2 },
  gridEmpty: { alignItems: 'center', paddingVertical: 44, paddingHorizontal: 30 },
  gridEmptyTitle: { color: Afylo.text, fontSize: 15, fontFamily: Font.bold, marginTop: 12 },
  gridEmptySub: { color: Afylo.textDim, fontSize: 13, textAlign: 'center', marginTop: 4 },
  cell: { width: '33%', aspectRatio: 0.8, backgroundColor: Afylo.surfaceAlt, flexGrow: 1 },
  cellTag: { position: 'absolute', bottom: 6, left: 6, flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#00000088', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  repostTag: { position: 'absolute', top: 6, right: 6, width: 22, height: 22, borderRadius: 11, backgroundColor: '#00000088', alignItems: 'center', justifyContent: 'center' },
  repostMediaTag: { position: 'absolute', top: 6, left: 6, width: 22, height: 22, borderRadius: 11, backgroundColor: '#00000088', alignItems: 'center', justifyContent: 'center' },
  repostQuoteBar: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: '#000000aa', paddingHorizontal: 6, paddingVertical: 5 },
  repostQuoteText: { color: '#fff', fontSize: 10, lineHeight: 13 },
  cellTagText: { color: '#fff', fontSize: 10, fontWeight: '700' },

  rdOverlay: { flex: 1, backgroundColor: '#00000066', justifyContent: 'flex-end' },
  rdSheet: { backgroundColor: Afylo.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 30 },
  rdHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: Afylo.border, alignSelf: 'center', marginBottom: 16 },
  rdHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  rdMe: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  rdMeText: { color: Afylo.green, fontFamily: Font.semibold, fontSize: 13 },
  rdAction: { width: 40, height: 40, borderRadius: 20, backgroundColor: Afylo.surfaceAlt, alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
  rdQuote: { color: Afylo.text, fontSize: 15, lineHeight: 21, marginBottom: 12 },
  rdQuoted: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: Afylo.surface, borderWidth: 1, borderColor: Afylo.border, borderRadius: Radius.lg, padding: 10, marginTop: 12 },
  rdAvatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: Afylo.surfaceAlt },
  rdName: { color: Afylo.text, fontFamily: Font.bold, fontSize: 13 },
  rdCaption: { color: Afylo.textDim, fontSize: 12, marginTop: 1 },
  rdProduct: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  rdProductText: { color: Afylo.violet, fontFamily: Font.semibold, fontSize: 11, flex: 1 },
  rdThumb: { width: 46, height: 46, borderRadius: 10, backgroundColor: Afylo.surfaceAlt },
  affBox: { marginTop: 14, backgroundColor: Afylo.surface, borderWidth: 1, borderColor: Afylo.border, borderRadius: Radius.lg, padding: 14 },
  affHead: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  affTitle: { color: Afylo.text, fontFamily: Font.bold, fontSize: 14 },
  affLink: { color: Afylo.violet, fontFamily: Font.semibold, fontSize: 13, backgroundColor: Afylo.surfaceAlt, borderRadius: Radius.sm, paddingHorizontal: 10, paddingVertical: 8 },
  affInfo: { color: Afylo.textDim, fontSize: 13, marginTop: 8, lineHeight: 18 },
  affStats: { flexDirection: 'row', alignItems: 'center', marginTop: 12, marginBottom: 4 },
  affStat: { flex: 1, alignItems: 'center' },
  affStatV: { color: Afylo.text, fontFamily: Font.bold, fontSize: 18 },
  affStatL: { color: Afylo.textDim, fontSize: 12, marginTop: 1 },
  affDivider: { width: 1, height: 28, backgroundColor: Afylo.border },
  affShare: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 46, borderRadius: Radius.pill, backgroundColor: Afylo.violet, marginTop: 12 },
  affShareText: { color: '#fff', fontFamily: Font.semibold, fontSize: 14 },

  purchaseRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: Afylo.surface, borderRadius: Radius.md, borderWidth: 1, borderColor: Afylo.border, padding: 10 },
  purchaseImg: { width: 60, height: 60, borderRadius: 10, backgroundColor: Afylo.surfaceAlt },
  purchaseTitle: { ...Type.body, fontFamily: Font.semibold, color: Afylo.text },
  purchaseMeta: { ...Type.caption, color: Afylo.textDim, marginTop: 1 },
  purchaseStatus: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 5 },
  purchaseStatusText: { ...Type.caption, fontFamily: Font.semibold },
  purchasePrice: { ...Type.body, fontFamily: Font.bold, color: Afylo.text },
  confirmBtn: { backgroundColor: Afylo.green, paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.pill },
  confirmText: { color: '#fff', ...Type.caption, fontFamily: Font.semibold },
  purchaseNote: { ...Type.caption, color: Afylo.textFaint, textAlign: 'center', marginTop: 8, lineHeight: 17, paddingHorizontal: 10 },
  createBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Afylo.surface, borderRadius: Radius.md, paddingVertical: 13, marginBottom: 12, borderWidth: 1, borderColor: Afylo.surfaceAlt },
  createText: { color: Afylo.violet, fontWeight: '700', fontSize: 14 },
  shopTabs: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  shopTab: { flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: Radius.pill, backgroundColor: Afylo.surface, borderWidth: 1, borderColor: Afylo.border },
  shopTabOn: { backgroundColor: Afylo.violet, borderColor: Afylo.violet },
  shopTabText: { color: Afylo.textDim, fontFamily: Font.semibold, fontSize: 13 },
  shopTabTextOn: { color: '#fff' },
  shopSearch: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Afylo.surface, borderRadius: Radius.pill, paddingHorizontal: 14, height: 44, marginBottom: 12, borderWidth: 1, borderColor: Afylo.border },
  shopSearchInput: { flex: 1, color: Afylo.text, fontSize: 15, height: '100%' },
  emptyText: { color: Afylo.textDim, fontSize: 14, textAlign: 'center', paddingVertical: 24, paddingHorizontal: 20, lineHeight: 20 },
  demoNote: { color: Afylo.textFaint, fontSize: 12, textAlign: 'center', marginBottom: 12 },
  prodGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  prodCard: { width: '48%', backgroundColor: Afylo.surface, borderWidth: 1, borderColor: Afylo.border, borderRadius: Radius.md, padding: 8 },
  prodImg: { aspectRatio: 1, borderRadius: Radius.sm, overflow: 'hidden', backgroundColor: Afylo.surfaceAlt, marginBottom: 8 },
  inactive: { ...StyleSheet.absoluteFillObject, backgroundColor: '#000000AA', alignItems: 'center', justifyContent: 'center' },
  inactiveText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  prodTitle: { color: Afylo.text, fontSize: 14, fontWeight: '700', paddingHorizontal: 2 },
  prodPrice: { color: Afylo.gold, fontSize: 15, fontWeight: '800', paddingHorizontal: 2, marginTop: 2 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6, paddingHorizontal: 2, marginTop: 2 },
  prodPriceOld: { color: Afylo.textFaint, fontSize: 12, fontWeight: '600', textDecorationLine: 'line-through' },
  prodMeta: { marginTop: 8, paddingHorizontal: 2 },
  prodStat: { color: Afylo.textDim, fontSize: 11 },
  prodActions: { flexDirection: 'row', gap: 6, marginTop: 8 },
  prodAction: { flex: 1, alignItems: 'center', paddingVertical: 7, backgroundColor: Afylo.surfaceAlt, borderRadius: 8 },
  buyRow: { flexDirection: 'row', gap: 6, marginTop: 8 },
  buyBtn: { flex: 1, backgroundColor: Afylo.violet, borderRadius: Radius.pill, paddingVertical: 9, alignItems: 'center' },
  buyBtnText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  shareBtnSm: { width: 38, alignItems: 'center', justifyContent: 'center', borderRadius: Radius.pill, backgroundColor: Afylo.surfaceAlt },

  // Double confirmation de suppression (produit)
  confirmOverlay: { flex: 1, backgroundColor: '#00000088', alignItems: 'center', justifyContent: 'center', padding: 30 },
  confirmCard: { width: '100%', maxWidth: 340, backgroundColor: Afylo.surface, borderRadius: Radius.xl, borderWidth: 1, borderColor: Afylo.border, padding: 22, alignItems: 'center' },
  confirmIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: Afylo.live + '1A', alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  confirmTitle: { color: Afylo.text, fontSize: 18, fontFamily: Font.bold, textAlign: 'center' },
  confirmSub: { color: Afylo.textDim, fontSize: 14, textAlign: 'center', lineHeight: 20, marginTop: 8, marginBottom: 18 },
  confirmDanger: { alignSelf: 'stretch', backgroundColor: Afylo.live, borderRadius: Radius.pill, paddingVertical: 14, alignItems: 'center' },
  confirmDangerText: { color: '#fff', fontFamily: Font.bold, fontSize: 15 },
  confirmGhost: { alignSelf: 'stretch', paddingVertical: 12, alignItems: 'center', marginTop: 4 },
  confirmGhostText: { color: Afylo.textDim, fontFamily: Font.semibold, fontSize: 15 },

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
