import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/ui-kit';
import { Afryko, Font, Radius, Type } from '@/constants/brand';
import { followUser, listMyFollowers, listMyFollowing, unfollowUser } from '@/lib/db';
import { useMe } from '@/lib/me';
import { face } from '@/lib/mock';
import type { Profile } from '@/types/db';

type Tab = 'followers' | 'following';

/**
 * Connexions — abonnés & abonnements. PRIVÉ : n'affiche QUE les listes de
 * l'utilisateur connecté (les requêtes ciblent auth.uid()). Personne ne peut
 * voir les abonnés/abonnements de quelqu'un d'autre — les compteurs des profils
 * visiteurs ne sont pas cliquables.
 */
export default function Connections() {
  const router = useRouter();
  const me = useMe();
  const params = useLocalSearchParams<{ tab?: string }>();
  const [tab, setTab] = useState<Tab>(params.tab === 'followers' ? 'followers' : 'following');
  const [followers, setFollowers] = useState<Profile[]>([]);
  const [following, setFollowing] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');

  const load = () => {
    setLoading(true);
    Promise.all([listMyFollowers(), listMyFollowing()])
      .then(([fr, fg]) => { setFollowers(fr); setFollowing(fg); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const followingIds = useMemo(() => new Set(following.map((p) => p.id)), [following]);
  const list = tab === 'followers' ? followers : following;
  const filtered = list.filter((p) => {
    if (!q) return true;
    const s = q.toLowerCase();
    return (p.display_name ?? '').toLowerCase().includes(s) || (p.handle ?? '').toLowerCase().includes(s);
  });

  const openProfile = (p: Profile) => router.push({ pathname: '/creator/[id]', params: { id: p.handle ?? p.id } });

  const toggleFollow = async (p: Profile) => {
    const isF = followingIds.has(p.id);
    setFollowing((prev) => (isF ? prev.filter((x) => x.id !== p.id) : [...prev, p])); // optimiste
    try {
      if (isF) await unfollowUser(p.id);
      else await followUser(p.id);
    } catch {
      load(); // resync en cas d'erreur
    }
  };

  return (
    <View style={styles.root}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: Afryko.bg }}>
        <View style={styles.header}>
          <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/profil'))} style={styles.iconBtn}>
            <Ionicons name="chevron-back" size={26} color={Afryko.text} />
          </Pressable>
          <Text style={styles.title} numberOfLines={1}>{me.handle.startsWith('@') ? me.handle : `@${me.handle}`}</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Onglets Abonnés / Abonnements */}
        <View style={styles.tabs}>
          <Pressable style={styles.tab} onPress={() => setTab('followers')}>
            <Text style={[styles.tabText, tab === 'followers' && styles.tabTextOn]}>{followers.length} Abonnés</Text>
            {tab === 'followers' && <View style={styles.tabUnderline} />}
          </Pressable>
          <Pressable style={styles.tab} onPress={() => setTab('following')}>
            <Text style={[styles.tabText, tab === 'following' && styles.tabTextOn]}>{following.length} Abonnements</Text>
            {tab === 'following' && <View style={styles.tabUnderline} />}
          </Pressable>
        </View>

        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color={Afryko.textDim} />
          <TextInput style={styles.searchInput} value={q} onChangeText={setQ} placeholder="Rechercher" placeholderTextColor={Afryko.textFaint} />
          {q.length > 0 && <Ionicons name="close-circle" size={18} color={Afryko.textFaint} onPress={() => setQ('')} />}
        </View>
      </SafeAreaView>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {loading ? (
          <ActivityIndicator color={Afryko.violet} style={{ marginTop: 34 }} />
        ) : filtered.length === 0 ? (
          <Text style={styles.empty}>
            {q ? 'Aucun résultat.' : tab === 'followers' ? "Personne ne t'abonne encore." : 'Tu ne suis personne pour le moment.'}
          </Text>
        ) : (
          filtered.map((p) => {
            const isF = followingIds.has(p.id);
            return (
              <View key={p.id} style={styles.row}>
                <Pressable style={styles.rowLeft} onPress={() => openProfile(p)}>
                  <Avatar uri={p.avatar_url || face(p.handle ?? p.id)} size={48} ring={p.is_verified} />
                  <View style={{ flex: 1 }}>
                    <View style={styles.rowNameLine}>
                      <Text style={styles.rowName} numberOfLines={1}>{p.display_name || p.handle || 'Créateur'}</Text>
                      {p.is_verified && <Ionicons name="checkmark-circle" size={14} color={Afryko.violet} />}
                    </View>
                    <Text style={styles.rowHandle} numberOfLines={1}>@{p.handle}</Text>
                  </View>
                </Pressable>
                <Pressable style={[styles.followBtn, isF && styles.followBtnOn]} onPress={() => toggleFollow(p)}>
                  <Text style={[styles.followText, isF && styles.followTextOn]}>{isF ? 'Suivi(e)' : 'Suivre'}</Text>
                </Pressable>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Afryko.bg },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 6 },
  iconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { ...Type.subtitle, color: Afryko.text, flex: 1 },

  tabs: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: Afryko.border },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 12 },
  tabText: { ...Type.body, fontFamily: Font.semibold, color: Afryko.textDim },
  tabTextOn: { color: Afryko.text },
  tabUnderline: { position: 'absolute', bottom: -1, height: 2, left: '25%', right: '25%', borderRadius: 2, backgroundColor: Afryko.text },

  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Afryko.surfaceAlt, borderRadius: Radius.pill, paddingHorizontal: 14, height: 42, marginHorizontal: 16, marginTop: 12 },
  searchInput: { flex: 1, ...Type.body, fontSize: 15, color: Afryko.text, height: '100%' },

  empty: { color: Afryko.textDim, fontSize: 14, textAlign: 'center', marginTop: 40, lineHeight: 20 },

  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  rowLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowNameLine: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  rowName: { ...Type.body, fontFamily: Font.semibold, color: Afryko.text, flexShrink: 1 },
  rowHandle: { ...Type.caption, color: Afryko.textDim, marginTop: 1 },
  followBtn: { backgroundColor: Afryko.violet, borderRadius: Radius.pill, paddingHorizontal: 18, height: 34, alignItems: 'center', justifyContent: 'center' },
  followBtnOn: { backgroundColor: 'transparent', borderWidth: 1, borderColor: Afryko.border },
  followText: { color: '#fff', fontFamily: Font.bold, fontSize: 13 },
  followTextOn: { color: Afryko.text },
});
