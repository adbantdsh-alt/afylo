import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Afryko, Font, Type } from '@/constants/brand';

type Doc = { title: string; updated: string; body: { h?: string; p: string }[] };

const DOCS: Record<string, Doc> = {
  terms: {
    title: "Conditions d'utilisation",
    updated: 'Dernière mise à jour : 2026',
    body: [
      { p: "Bienvenue sur Afryko. En utilisant l'application, tu acceptes les présentes conditions. Merci de les lire attentivement." },
      { h: '1. Ton compte', p: "Tu es responsable de l'exactitude des informations de ton compte et de la confidentialité de tes identifiants. Tu dois avoir l'âge légal requis dans ton pays." },
      { h: '2. Contenu', p: "Tu conserves les droits sur le contenu que tu publies (vidéos, photos, produits). Tu accordes à Afryko une licence pour l'héberger et l'afficher dans l'application. Le contenu illégal, trompeur ou contrefait est interdit." },
      { h: '3. Ventes & paiements', p: "Les ventes réalisées via Afryko (boutiques, lives, affiliation) sont soumises à une commission de 5%. Les paiements et l'escrow XaalisPay visent à sécuriser acheteurs et vendeurs jusqu'à la confirmation de livraison." },
      { h: '4. Affiliation', p: "Un créateur qui revend un produit touche la commission fixée par le vendeur (minimum 15%, dont 5% revient à Afryko). Toute fraude entraîne la suspension." },
      { h: '5. Résiliation', p: "Tu peux désactiver ou supprimer ton compte à tout moment depuis les Paramètres. Afryko peut suspendre un compte en cas de violation des présentes conditions." },
      { h: '6. Responsabilité', p: "Afryko est fourni « en l'état ». Nous ne sommes pas responsables des litiges entre utilisateurs, mais mettons des outils à disposition pour les résoudre." },
    ],
  },
  guidelines: {
    title: 'Règles de la communauté',
    updated: 'Dernière mise à jour : 2026',
    body: [
      { p: "Afryko est une plateforme libre : tu peux t'exprimer, débattre, vendre. Nous posons juste des limites nettes pour que chacun se sente à l'aise — plus souple que Facebook, mais pas le chaos." },
      { h: '🚫 Strictement interdit (retiré, compte sanctionné)', p: "Toute forme de contenu sexuel impliquant des mineurs — tolérance zéro, signalé aux autorités. Menaces ou incitation à la violence et au terrorisme. Vente de produits illégaux (armes, drogues, contrefaçon dangereuse, êtres humains). Partage d'informations privées (doxxing)." },
      { h: '⚠️ Autorisé avec avertissement', p: "Nudité artistique ou contenu suggestif (non explicite), images choquantes (violence/sang), sujets clivants (politique, religion, tragédies). Ces contenus restent en ligne mais sont floutés derrière un avertissement « Contenu sensible » et réservés aux adultes." },
      { h: '✅ Liberté d\'expression', p: "Tes opinions, critiques, humour, débats et la vente de tes produits sont les bienvenus. On ne supprime pas une idée parce qu'elle dérange — on ajoute un avertissement si elle peut heurter." },
      { h: 'Signalement', p: "Tu peux signaler tout contenu via le menu « … ». Les signalements concernant des mineurs sont traités en priorité absolue." },
      { h: 'Achats & vendeurs', p: "Les paiements passent par XaalisPay (séquestre). Arnaques, faux produits et non-livraisons entraînent le remboursement de l'acheteur et la suspension du vendeur." },
    ],
  },
  privacy: {
    title: 'Politique de confidentialité',
    updated: 'Dernière mise à jour : 2026',
    body: [
      { p: "Afryko respecte ta vie privée. Cette politique explique quelles données nous collectons et comment nous les utilisons." },
      { h: 'Données collectées', p: "Email, nom d'affichage, photo, bio, contenus publiés, produits, transactions. Des données techniques (appareil, logs) peuvent être collectées pour la sécurité." },
      { h: 'Utilisation', p: "Fournir le service, sécuriser les paiements, personnaliser le feed, prévenir la fraude et améliorer l'application." },
      { h: 'Partage', p: "Nous ne vendons pas tes données. Certaines informations sont partagées avec des prestataires (hébergement Supabase, paiement Wave) strictement pour faire fonctionner le service." },
      { h: 'Tes droits', p: "Tu peux accéder, corriger, exporter ou supprimer tes données. La suppression du compte efface tes données personnelles conformément à la loi applicable." },
      { h: 'Contact', p: "Pour toute question : support@afryko.app" },
    ],
  },
  about: {
    title: "À propos d'Afryko",
    updated: 'Version 1.0.0',
    body: [
      { p: "Afryko — « Là où l'Afrique crée, vend et gagne. »" },
      { p: "Afryko est le réseau social qui rémunère les créateurs africains : vidéos courtes, lives, boutiques et paiement natif, réunis dans une seule application." },
      { h: 'Notre mission', p: "Permettre à chaque Africain de vivre de son audience — créer du contenu, vendre en direct et être payé en toute confiance." },
      { h: 'Contact', p: "support@afryko.app" },
    ],
  },
};

export default function Legal() {
  const router = useRouter();
  const { doc } = useLocalSearchParams<{ doc: string }>();
  const d = DOCS[doc ?? 'about'] ?? DOCS.about;

  return (
    <View style={styles.root}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: Afryko.bg }}>
        <View style={styles.header}>
          <Ionicons name="chevron-back" size={26} color={Afryko.text} onPress={() => (router.canGoBack() ? router.back() : router.replace('/accueil'))} />
          <Text style={styles.title} numberOfLines={1}>{d.title}</Text>
          <View style={{ width: 26 }} />
        </View>
      </SafeAreaView>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <Text style={styles.updated}>{d.updated}</Text>
        {d.body.map((b, i) => (
          <View key={i} style={{ marginTop: b.h ? 20 : 12 }}>
            {b.h && <Text style={styles.h}>{b.h}</Text>}
            <Text style={styles.p}>{b.p}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Afryko.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 8 },
  title: { ...Type.subtitle, color: Afryko.text, flex: 1, textAlign: 'center' },
  updated: { ...Type.caption, color: Afryko.textFaint },
  h: { ...Type.body, fontFamily: Font.semibold, color: Afryko.text, marginBottom: 6 },
  p: { ...Type.body, color: Afryko.textDim, lineHeight: 24 },
});
