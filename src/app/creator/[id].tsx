import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar, Badge, PillButton } from '@/components/ui-kit';
import { Afylo, Font, Type } from '@/constants/brand';
import { face, myPosts } from '@/lib/mock';

/** Profil VISITEUR (celui d'un autre créateur, ouvert depuis une publication). */
export default function CreatorProfile() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string; name?: string; avatar?: string; badge?: string }>();
  const [followed, setFollowed] = useState(false);

  const name = params.name || 'Créateur';
  const handle = params.id?.startsWith('@') ? params.id : `@${params.id ?? 'afylo'}`;
  const avatar = params.avatar || face(params.id ?? 'afylo');

  return (
    <View style={styles.root}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: Afylo.bg }}>
        <View style={styles.topbar}>
          <Pressable onPress={() => router.back()} style={styles.iconBtn}>
            <Ionicons name="chevron-back" size={26} color={Afylo.text} />
          </Pressable>
          <Text style={styles.topHandle} numberOfLines={1}>{handle}</Text>
          <Pressable style={styles.iconBtn}>
            <Ionicons name="ellipsis-horizontal" size={22} color={Afylo.text} />
          </Pressable>
        </View>
      </SafeAreaView>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 110 }}>
        <View style={styles.head}>
          <Avatar uri={avatar} size={88} ring />
          <View style={styles.statsRow}>
            <Stat value="24 K" label="Abonnés" />
            <Stat value="128" label="Ventes" />
            <Stat value="410 K" label="Vues" />
          </View>
        </View>

        <View style={styles.nameRow}>
          <Text style={styles.name}>{name}</Text>
          {!!params.badge && <Badge label={params.badge} color={params.badge === 'boutique' ? Afylo.gold : Afylo.violet} />}
        </View>
        <Text style={styles.bio}>Créateur Afylo · Contenu, boutique et lives. Suis pour ne rien rater 🔥</Text>

        {/* Actions VISITEUR */}
        <View style={styles.actions}>
          <PillButton
            label={followed ? 'Suivi' : 'Suivre'}
            variant={followed ? 'ghost' : 'primary'}
            icon={followed ? 'checkmark' : undefined}
            onPress={() => setFollowed((v) => !v)}
            style={{ flex: 1, height: 46 }}
          />
          <PillButton label="Message" variant="ghost" icon="chatbubble-outline" style={{ flex: 1, height: 46 }} />
        </View>

        {/* Grille de posts */}
        <View style={styles.grid}>
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
      </ScrollView>
    </View>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={{ alignItems: 'center' }}>
      <Text style={[Type.statNumber, { color: Afylo.text }]}>{value}</Text>
      <Text style={[Type.statLabel, { color: Afylo.textDim, marginTop: 4 }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Afylo.bg },
  topbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8, paddingVertical: 6 },
  iconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  topHandle: { ...Type.subtitle, color: Afylo.text, flex: 1, textAlign: 'center' },

  head: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, marginTop: 12, gap: 20 },
  statsRow: { flex: 1, flexDirection: 'row', justifyContent: 'space-around' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 18, marginTop: 18 },
  name: { ...Type.name, color: Afylo.text },
  bio: { ...Type.bio, color: Afylo.text, opacity: 0.9, paddingHorizontal: 18, marginTop: 8 },
  actions: { flexDirection: 'row', gap: 12, paddingHorizontal: 18, marginTop: 18 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 2, marginTop: 22 },
  cell: { width: '33%', aspectRatio: 0.8, backgroundColor: Afylo.surfaceAlt, flexGrow: 1 },
  cellTag: { position: 'absolute', bottom: 6, left: 6, flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#00000088', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  cellTagText: { color: '#fff', fontFamily: Font.medium, fontSize: 10 },
});
