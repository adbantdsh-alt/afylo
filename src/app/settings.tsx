import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Afylo, Font, Radius, Type } from '@/constants/brand';
import { useAuth } from '@/lib/auth';

type Row = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  sub?: string;
  route?: string;
  url?: string;
  toggle?: 'private' | 'push' | 'likes' | 'comments' | 'sales' | 'twofa';
  danger?: boolean;
  action?: 'logout';
};

export default function Settings() {
  const router = useRouter();
  const { signOut } = useAuth();
  const [q, setQ] = useState('');
  const [sw, setSw] = useState<Record<string, boolean>>({
    private: false, push: true, likes: true, comments: true, sales: true, twofa: false,
  });

  const sections: { title: string; rows: Row[] }[] = [
    {
      title: 'Compte',
      rows: [
        { icon: 'person-outline', label: 'Modifier le profil', sub: 'Photo, nom, bio, lien', route: '/edit-profile' },
        { icon: 'id-card-outline', label: 'Informations personnelles', sub: 'Email, téléphone' },
        { icon: 'link-outline', label: 'Comptes liés' },
      ],
    },
    {
      title: 'Créateur',
      rows: [
        { icon: 'stats-chart-outline', label: 'Studio & statistiques', route: '/studio' },
        { icon: 'wallet-outline', label: 'Portefeuille & retraits', route: '/studio' },
        { icon: 'repeat-outline', label: 'Affiliation', sub: 'Produits à revendre', route: '/affiliation' },
      ],
    },
    {
      title: 'Confidentialité',
      rows: [
        { icon: 'lock-closed-outline', label: 'Compte privé', toggle: 'private' },
        { icon: 'ban-outline', label: 'Comptes bloqués' },
        { icon: 'eye-off-outline', label: 'Masquer stories & lives' },
        { icon: 'chatbubbles-outline', label: 'Messages & mentions' },
      ],
    },
    {
      title: 'Notifications',
      rows: [
        { icon: 'notifications-outline', label: 'Notifications push', toggle: 'push' },
        { icon: 'heart-outline', label: 'Likes', toggle: 'likes' },
        { icon: 'chatbubble-outline', label: 'Commentaires', toggle: 'comments' },
        { icon: 'bag-check-outline', label: 'Ventes & commandes', toggle: 'sales' },
      ],
    },
    {
      title: 'Sécurité',
      rows: [
        { icon: 'key-outline', label: 'Mot de passe' },
        { icon: 'shield-checkmark-outline', label: 'Authentification à deux facteurs', toggle: 'twofa' },
        { icon: 'phone-portrait-outline', label: 'Appareils connectés' },
      ],
    },
    {
      title: 'Préférences',
      rows: [
        { icon: 'language-outline', label: 'Langue', sub: 'Français' },
        { icon: 'contrast-outline', label: 'Thème', sub: 'Clair' },
        { icon: 'cellular-outline', label: 'Économiseur de données' },
      ],
    },
    {
      title: 'Assistance',
      rows: [
        { icon: 'help-circle-outline', label: 'Aide', url: 'mailto:support@afylo.app' },
        { icon: 'flag-outline', label: 'Signaler un problème', url: 'mailto:support@afylo.app' },
        { icon: 'document-text-outline', label: "Conditions d'utilisation" },
        { icon: 'shield-outline', label: 'Politique de confidentialité' },
        { icon: 'information-circle-outline', label: 'À propos d\'Afylo', sub: 'Version 1.0.0' },
      ],
    },
    {
      title: ' ',
      rows: [{ icon: 'log-out-outline', label: 'Déconnexion', danger: true, action: 'logout' }],
    },
  ];

  const onRow = async (r: Row) => {
    if (r.action === 'logout') { await signOut(); return; }
    if (r.route) router.push(r.route as any);
    else if (r.url) Linking.openURL(r.url);
  };

  const match = (r: Row) => (q ? r.label.toLowerCase().includes(q.toLowerCase()) : true);

  return (
    <View style={styles.root}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: Afylo.bg }}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.back}>
            <Ionicons name="chevron-back" size={26} color={Afylo.text} />
          </Pressable>
          <Text style={styles.title}>Paramètres</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.search}>
          <Ionicons name="search" size={18} color={Afylo.textDim} />
          <TextInput style={styles.searchInput} value={q} onChangeText={setQ} placeholder="Rechercher un réglage" placeholderTextColor={Afylo.textFaint} />
        </View>
      </SafeAreaView>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {sections.map((s) => {
          const rows = s.rows.filter(match);
          if (rows.length === 0) return null;
          return (
            <View key={s.title} style={{ marginBottom: 20 }}>
              {s.title.trim() !== '' && <Text style={styles.sectionTitle}>{s.title}</Text>}
              <View style={styles.card}>
                {rows.map((r, i) => (
                  <Pressable
                    key={r.label}
                    onPress={() => (r.toggle ? null : onRow(r))}
                    style={[styles.row, i < rows.length - 1 && styles.rowBorderBottom]}>
                    <Ionicons name={r.icon} size={22} color={r.danger ? Afylo.live : Afylo.text} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.rowLabel, r.danger && { color: Afylo.live }]}>{r.label}</Text>
                      {r.sub && <Text style={styles.rowSub}>{r.sub}</Text>}
                    </View>
                    {r.toggle ? (
                      <Switch
                        value={sw[r.toggle]}
                        onValueChange={(v) => setSw((p) => ({ ...p, [r.toggle!]: v }))}
                        trackColor={{ true: Afylo.violet }}
                      />
                    ) : (
                      !r.danger && <Ionicons name="chevron-forward" size={18} color={Afylo.textFaint} />
                    )}
                  </Pressable>
                ))}
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Afylo.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 6 },
  back: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { ...Type.subtitle, color: Afylo.text },
  search: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: Afylo.surface, marginHorizontal: 16, marginTop: 6, marginBottom: 8, paddingHorizontal: 16, height: 44, borderRadius: Radius.pill, borderWidth: 1, borderColor: Afylo.border },
  searchInput: { flex: 1, ...Type.body, fontSize: 15, color: Afylo.text, height: '100%' },

  sectionTitle: { ...Type.small, color: Afylo.textDim, fontFamily: Font.semibold, marginBottom: 8, marginLeft: 4, textTransform: 'uppercase', letterSpacing: 0.4 },
  card: { backgroundColor: Afylo.surface, borderRadius: Radius.lg, borderWidth: 1, borderColor: Afylo.border, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingVertical: 14 },
  rowBorderBottom: { borderBottomWidth: 1, borderBottomColor: Afylo.bg },
  rowLabel: { ...Type.body, fontSize: 15, color: Afylo.text },
  rowSub: { ...Type.caption, color: Afylo.textDim, marginTop: 2 },
});
