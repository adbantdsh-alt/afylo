import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PaymentSheet, type PayItem } from '@/components/payment-sheet';
import { Avatar } from '@/components/ui-kit';
import { VerifiedBadge, verifiedKind } from '@/components/verified';
import { Afylo, Font, Radius, Type } from '@/constants/brand';
import { useAuthGate } from '@/lib/auth-gate';
import { getProductWithOwner, hasPurchasedProduct, listProductReviews, upsertProductReview, type ProductReview, type ProductWithOwner } from '@/lib/db';
import { timeAgo } from '@/lib/feed-map';
import { photo } from '@/lib/mock';
import { formatCfa } from '@/types/db';

/** Rangée de 5 étoiles (lecture ou saisie). */
function Stars({ value, size = 16, onRate }: { value: number; size?: number; onRate?: (n: number) => void }) {
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Ionicons
          key={n}
          name={n <= Math.round(value) ? 'star' : 'star-outline'}
          size={size}
          color={Afylo.gold}
          onPress={onRate ? () => onRate(n) : undefined}
        />
      ))}
    </View>
  );
}

export default function ProductPage() {
  const router = useRouter();
  const gate = useAuthGate();
  const { width } = useWindowDimensions();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [product, setProduct] = useState<ProductWithOwner | null>(null);
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [canReview, setCanReview] = useState(false);
  const [loading, setLoading] = useState(true);
  const [payOpen, setPayOpen] = useState(false);
  const [imgIdx, setImgIdx] = useState(0);

  // Formulaire d'avis
  const [myRating, setMyRating] = useState(0);
  const [myBody, setMyBody] = useState('');
  const [sending, setSending] = useState(false);

  const load = () => {
    if (!id) return;
    Promise.all([getProductWithOwner(id), listProductReviews(id), hasPurchasedProduct(id)])
      .then(([p, r, can]) => { setProduct(p); setReviews(r); setCanReview(can); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };
  useEffect(load, [id]);

  if (loading) return <View style={styles.root}><ActivityIndicator color={Afylo.violet} style={{ marginTop: 60 }} /></View>;
  if (!product) return (
    <View style={styles.root}>
      <SafeAreaView edges={['top']}><View style={styles.header}><Pressable onPress={() => router.back()} style={styles.hbtn}><Ionicons name="arrow-back" size={24} color={Afylo.text} /></Pressable><Text style={styles.title}>Produit</Text><View style={{ width: 40 }} /></View></SafeAreaView>
      <Text style={styles.empty}>Ce produit n'est plus disponible.</Text>
    </View>
  );

  const images = product.images?.length ? product.images : product.image_url ? [product.image_url] : [photo(product.id, 700, 700)];
  const price = product.promo_cfa ?? product.price_cfa;
  const hasPromo = !!product.promo_cfa && product.promo_cfa < product.price_cfa;
  const fee = product.delivery_fee_cfa ?? 0;
  const avg = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;
  const owner = product.owner;

  const buyItems: PayItem[] = [
    { title: product.title, price: formatCfa(price), priceCfa: price, tiers: product.quantity_tiers },
    ...(fee > 0 ? [{ title: 'Livraison', price: formatCfa(fee), priceCfa: fee }] : []),
  ];

  const openSeller = () => owner?.handle && router.push({ pathname: '/creator/[id]', params: { id: owner.handle } });

  const sendReview = async () => {
    if (!gate('laisser un avis') || myRating === 0) return;
    setSending(true);
    try { await upsertProductReview(product.id, myRating, myBody); setMyBody(''); load(); } catch {} finally { setSending(false); }
  };

  return (
    <View style={styles.root}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: Afylo.bg }}>
        <View style={styles.header}>
          <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/accueil'))} style={styles.hbtn}><Ionicons name="arrow-back" size={24} color={Afylo.text} /></Pressable>
          <Text style={styles.title} numberOfLines={1}>{product.title}</Text>
          <View style={{ width: 40 }} />
        </View>
      </SafeAreaView>

      <ScrollView contentContainerStyle={{ paddingBottom: 110 }} showsVerticalScrollIndicator={false}>
        {/* Galerie */}
        <View style={styles.gallery}>
          <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} onMomentumScrollEnd={(e) => setImgIdx(Math.round(e.nativeEvent.contentOffset.x / e.nativeEvent.layoutMeasurement.width))}>
            {images.map((uri, i) => <Image key={`${uri}-${i}`} source={{ uri }} style={{ width, height: '100%' }} contentFit="cover" transition={150} />)}
          </ScrollView>
          {images.length > 1 && <View style={styles.dots}>{images.map((_, i) => <View key={i} style={[styles.dot, i === imgIdx && styles.dotOn]} />)}</View>}
        </View>

        <View style={styles.body}>
          {/* Prix + titre */}
          <View style={styles.priceRow}>
            <Text style={styles.price}>{formatCfa(price)}</Text>
            {hasPromo && <Text style={styles.priceOld}>{formatCfa(product.price_cfa)}</Text>}
            {product.commission_pct > 0 && <View style={styles.affTag}><Text style={styles.affText}>Affiliation {product.commission_pct}%</Text></View>}
          </View>
          <Text style={styles.name}>{product.title}</Text>

          {/* Note moyenne */}
          {reviews.length > 0 && (
            <View style={styles.avgRow}>
              <Stars value={avg} size={15} />
              <Text style={styles.avgText}>{avg.toFixed(1)} · {reviews.length} avis</Text>
            </View>
          )}

          {/* Livraison + séquestre */}
          <View style={styles.infoCard}>
            <View style={styles.infoLine}>
              <Ionicons name="bicycle" size={18} color={Afylo.violet} />
              <Text style={styles.infoText}>{fee > 0 ? `Livraison ${formatCfa(fee)}` : 'Livraison gratuite'} · sous 48h max</Text>
            </View>
            <View style={styles.infoLine}>
              <Ionicons name="shield-checkmark" size={18} color={Afylo.green} />
              <Text style={styles.infoText}>Payé en sécurité (XaalisPay) — versé au vendeur après ta réception.</Text>
            </View>
            {product.kind === 'physical' && product.stock <= 0 && <Text style={styles.soldOut}>Rupture de stock</Text>}
          </View>

          {/* Vendeur */}
          {owner && (
            <Pressable style={styles.seller} onPress={openSeller}>
              <Avatar uri={owner.avatar_url || photo(owner.id, 80, 80)} size={40} ring={owner.is_verified} />
              <View style={{ flex: 1 }}>
                <View style={styles.sellerNameRow}>
                  <Text style={styles.sellerName} numberOfLines={1}>{owner.display_name || owner.handle || 'Vendeur'}</Text>
                  <VerifiedBadge kind={verifiedKind(owner)} size={14} />
                </View>
                <Text style={styles.sellerHandle}>@{owner.handle}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={Afylo.textFaint} />
            </Pressable>
          )}

          {/* Description */}
          {!!product.description && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Description</Text>
              <Text style={styles.desc}>{product.description}</Text>
            </View>
          )}

          {/* Avis */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Avis ({reviews.length})</Text>

            {canReview && (
              <View style={styles.reviewForm}>
                <Text style={styles.reviewFormTitle}>Ton avis</Text>
                <Stars value={myRating} size={26} onRate={setMyRating} />
                <TextInput style={styles.reviewInput} value={myBody} onChangeText={setMyBody} placeholder="Partage ton expérience (optionnel)" placeholderTextColor={Afylo.textFaint} multiline />
                <Pressable onPress={sendReview} disabled={myRating === 0 || sending} style={[styles.reviewSend, (myRating === 0 || sending) && { opacity: 0.5 }]}>
                  <Text style={styles.reviewSendText}>{sending ? 'Envoi…' : 'Publier mon avis'}</Text>
                </Pressable>
              </View>
            )}

            {reviews.length === 0 ? (
              <Text style={styles.noReview}>Aucun avis pour l'instant{canReview ? ' — sois le premier !' : '. Seuls les acheteurs peuvent noter.'}</Text>
            ) : (
              reviews.map((r) => (
                <View key={r.id} style={styles.reviewRow}>
                  <Avatar uri={r.author?.avatar_url || photo(r.author_id, 60, 60)} size={36} />
                  <View style={{ flex: 1 }}>
                    <View style={styles.reviewHead}>
                      <Text style={styles.reviewName} numberOfLines={1}>{r.author?.display_name || r.author?.handle || 'Acheteur'}</Text>
                      <Text style={styles.reviewTime}>{timeAgo(r.created_at)}</Text>
                    </View>
                    <Stars value={r.rating} size={13} />
                    {!!r.body && <Text style={styles.reviewBody}>{r.body}</Text>}
                  </View>
                </View>
              ))
            )}
          </View>
        </View>
      </ScrollView>

      {/* Barre d'achat fixe */}
      <SafeAreaView edges={['bottom']} style={styles.buyBar}>
        <View style={{ flex: 1 }}>
          <Text style={styles.buyPrice}>{formatCfa(price)}</Text>
          <Text style={styles.buyMeta}>{fee > 0 ? `+ ${formatCfa(fee)} livraison` : 'Livraison gratuite'}</Text>
        </View>
        <Pressable onPress={() => { if (gate('acheter')) setPayOpen(true); }} style={styles.buyBtn}>
          <Ionicons name="bag-handle" size={18} color="#fff" />
          <Text style={styles.buyBtnText}>Acheter</Text>
        </Pressable>
      </SafeAreaView>

      <PaymentSheet visible={payOpen} items={buyItems} onClose={() => setPayOpen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Afylo.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 8 },
  hbtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { ...Type.subtitle, color: Afylo.text, flex: 1, textAlign: 'center' },
  empty: { color: Afylo.textDim, textAlign: 'center', marginTop: 40 },

  gallery: { width: '100%', aspectRatio: 1, backgroundColor: Afylo.surfaceAlt },
  galleryImg: { width: 390, height: '100%' },
  dots: { position: 'absolute', bottom: 10, alignSelf: 'center', flexDirection: 'row', gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#ffffff88' },
  dotOn: { backgroundColor: '#fff', width: 18 },

  body: { padding: 16 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' },
  price: { color: Afylo.ink, fontFamily: Font.bold, fontSize: 24 },
  priceOld: { color: Afylo.textFaint, fontSize: 15, textDecorationLine: 'line-through' },
  affTag: { backgroundColor: Afylo.violet + '1A', borderRadius: Radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  affText: { color: Afylo.violet, fontFamily: Font.semibold, fontSize: 11 },
  name: { color: Afylo.text, fontSize: 17, fontFamily: Font.semibold, marginTop: 8, lineHeight: 23 },

  avgRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  avgText: { color: Afylo.textDim, ...Type.small },

  infoCard: { backgroundColor: Afylo.surface, borderRadius: Radius.lg, borderWidth: 1, borderColor: Afylo.border, padding: 14, marginTop: 14, gap: 10 },
  infoLine: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  infoText: { color: Afylo.text, ...Type.small, flex: 1, lineHeight: 18 },
  soldOut: { color: Afylo.live, ...Type.small, fontFamily: Font.semibold },

  seller: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 16, paddingVertical: 8 },
  sellerNameRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  sellerName: { color: Afylo.text, ...Type.body, fontFamily: Font.semibold, flexShrink: 1 },
  sellerHandle: { color: Afylo.textDim, ...Type.caption, marginTop: 1 },

  section: { marginTop: 20 },
  sectionTitle: { color: Afylo.text, fontFamily: Font.bold, fontSize: 16, marginBottom: 10 },
  desc: { color: Afylo.text, ...Type.body, lineHeight: 21 },

  reviewForm: { backgroundColor: Afylo.surface, borderRadius: Radius.lg, borderWidth: 1, borderColor: Afylo.border, padding: 14, marginBottom: 16, gap: 10 },
  reviewFormTitle: { color: Afylo.text, ...Type.body, fontFamily: Font.semibold },
  reviewInput: { backgroundColor: Afylo.bg, borderRadius: Radius.md, borderWidth: 1, borderColor: Afylo.border, color: Afylo.text, ...Type.body, padding: 12, minHeight: 60, textAlignVertical: 'top' },
  reviewSend: { backgroundColor: Afylo.violet, borderRadius: Radius.pill, height: 44, alignItems: 'center', justifyContent: 'center' },
  reviewSendText: { color: '#fff', fontFamily: Font.semibold, fontSize: 14 },
  noReview: { color: Afylo.textDim, ...Type.small, lineHeight: 19 },

  reviewRow: { flexDirection: 'row', gap: 10, paddingVertical: 12, borderTopWidth: 1, borderTopColor: Afylo.border },
  reviewHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  reviewName: { color: Afylo.text, ...Type.small, fontFamily: Font.semibold, flexShrink: 1 },
  reviewTime: { color: Afylo.textFaint, ...Type.caption },
  reviewBody: { color: Afylo.text, ...Type.small, marginTop: 4, lineHeight: 19 },

  buyBar: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingTop: 10, backgroundColor: Afylo.bg, borderTopWidth: 1, borderTopColor: Afylo.border },
  buyPrice: { color: Afylo.ink, fontFamily: Font.bold, fontSize: 18 },
  buyMeta: { color: Afylo.textDim, ...Type.caption },
  buyBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Afylo.violet, borderRadius: Radius.pill, paddingHorizontal: 28, height: 50 },
  buyBtnText: { color: '#fff', fontFamily: Font.bold, fontSize: 16 },
});
