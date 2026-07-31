import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/ui-kit';
import { Afylo, Radius } from '@/constants/brand';
import { avatar, face, type Post, posts as basePosts } from '@/lib/mock';

// Quelques vidéos verticales supplémentaires pour le défilement
const reels: Post[] = [
  ...basePosts,
  {
    id: 'r4',
    name: 'Sokhna Live',
    handle: '@sokhna.crea',
    avatar: avatar(20),
    badge: 'créateur',
    time: 'en direct',
    image: face('afylo-reel4', 700, 1300),
    likes: '15k',
    comments: '890',
    views: '210k',
    shares: '412',
    caption: 'Danse challenge du moment 💃 #afylo #dakar',
    product: { title: 'T-shirt Afylo édition limitée', price: '8 000 FCFA', commission: '25%' },
  },
  {
    id: 'r5',
    name: 'Cheikh Tech',
    handle: '@cheikh.tech',
    avatar: avatar(33),
    time: 'il y a 1 j',
    image: face('afylo-reel5', 700, 1300),
    likes: '6.4k',
    comments: '120',
    views: '58k',
    shares: '77',
    caption: 'Test du nouveau ring light 📸 lien en boutique',
    product: { title: 'Ring light pro', price: '15 000 FCFA', commission: '10%' },
  },
];

export default function Trend() {
  const { height, width } = useWindowDimensions();

  return (
    <View style={styles.root}>
      <ScrollView
        pagingEnabled
        showsVerticalScrollIndicator={false}
        snapToInterval={height}
        decelerationRate="fast">
        {reels.map((r) => (
          <Reel key={r.id} post={r} height={height} width={width} />
        ))}
      </ScrollView>

      {/* En-tête flottant */}
      <SafeAreaView edges={['top']} style={styles.headerWrap} pointerEvents="none">
        <View style={styles.header}>
          <Text style={styles.tab}>Abonnements</Text>
          <Text style={[styles.tab, styles.tabActive]}>Trend</Text>
          <Text style={styles.tab}>Près de toi</Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

function Reel({ post, height, width }: { post: Post; height: number; width: number }) {
  return (
    <View style={{ height, width, backgroundColor: '#000' }}>
      <Image source={{ uri: post.image }} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} />
      <LinearGradient colors={['#00000000', '#00000000', '#000000CC']} style={StyleSheet.absoluteFill} />

      {/* Rail d'actions à droite */}
      <View style={styles.rail}>
        <View style={{ marginBottom: 6 }}>
          <Avatar uri={post.avatar} size={48} ring />
        </View>
        <Action icon="heart" label={post.likes} color={Afylo.live} />
        <Action icon="chatbubble-ellipses" label={post.comments} />
        <Action icon="bookmark" label="Enreg." />
        <Action icon="arrow-redo" label={post.shares} />
      </View>

      {/* Infos en bas */}
      <SafeAreaView edges={['bottom']} style={styles.bottom} pointerEvents="box-none">
        <View style={styles.infoRow}>
          <Text style={styles.name}>{post.name}</Text>
          {post.time === 'en direct' && (
            <View style={styles.liveTag}>
              <View style={styles.dot} />
              <Text style={styles.liveTagText}>LIVE</Text>
            </View>
          )}
        </View>
        <Text style={styles.caption} numberOfLines={2}>{post.caption}</Text>

        {post.product && (
          <View style={styles.buyBar}>
            <Ionicons name="bag-handle" size={18} color="#fff" />
            <Text style={styles.buyTitle} numberOfLines={1}>{post.product.title}</Text>
            <Text style={styles.buyPrice}>{post.product.price}</Text>
            <View style={styles.buyCta}>
              <Text style={styles.buyCtaText}>Acheter</Text>
            </View>
          </View>
        )}
      </SafeAreaView>
    </View>
  );
}

function Action({ icon, label, color = '#fff' }: { icon: keyof typeof Ionicons.glyphMap; label: string; color?: string }) {
  return (
    <View style={styles.action}>
      <Ionicons name={icon} size={32} color={color} />
      <Text style={styles.actionLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  headerWrap: { position: 'absolute', top: 0, left: 0, right: 0 },
  header: { flexDirection: 'row', justifyContent: 'center', gap: 18, paddingTop: 6 },
  tab: { color: '#ffffff99', fontSize: 15, fontWeight: '600' },
  tabActive: { color: '#fff', fontWeight: '800', textShadowColor: '#000', textShadowRadius: 8 },

  rail: { position: 'absolute', right: 12, bottom: 160, alignItems: 'center', gap: 20 },
  action: { alignItems: 'center', gap: 3 },
  actionLabel: { color: '#fff', fontSize: 12, fontWeight: '700' },

  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingBottom: 90 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  name: { color: '#fff', fontSize: 17, fontWeight: '800' },
  liveTag: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Afylo.live, paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.pill },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#fff' },
  liveTagText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  caption: { color: '#fff', fontSize: 14, lineHeight: 20, width: '78%' },
  buyBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ffffff22',
    borderWidth: 1,
    borderColor: '#ffffff44',
    borderRadius: Radius.pill,
    paddingLeft: 12,
    paddingRight: 6,
    paddingVertical: 6,
    marginTop: 12,
    width: '82%',
  },
  buyTitle: { color: '#fff', fontSize: 13, fontWeight: '700', flex: 1 },
  buyPrice: { color: Afylo.gold, fontSize: 13, fontWeight: '800' },
  buyCta: { backgroundColor: Afylo.violet, paddingHorizontal: 14, paddingVertical: 8, borderRadius: Radius.pill },
  buyCtaText: { color: '#fff', fontSize: 13, fontWeight: '800' },
});
