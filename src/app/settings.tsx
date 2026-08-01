import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Modal, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Afryko, applyThemePref, Font, getThemePref, Radius, Type, type ThemePref } from '@/constants/brand';

// Correspondance libellé FR ↔ préférence de thème
const THEME_LABELS: Record<ThemePref, string> = { light: 'Clair', dark: 'Sombre', system: 'Système' };
const THEME_FROM_LABEL: Record<string, ThemePref> = { Clair: 'light', Sombre: 'dark', Système: 'system' };
import { useAuth } from '@/lib/auth';
import { changeEmail, changePassword, deactivateAccount, deleteAccount, getAccountInfo } from '@/lib/db';
import { maskCard, useCheckoutProfile, type PayMethod } from '@/lib/checkout-profile';
import { face } from '@/lib/mock';

type ToggleKey = 'private' | 'push' | 'likes' | 'comments' | 'sales' | 'twofa' | 'dataSaver';
type DetailKey = 'personal' | 'payment' | 'linked' | 'blocked' | 'hide' | 'messages' | 'password' | 'devices' | 'language' | 'theme';

type Row = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  sub?: string;
  route?: string;
  url?: string;
  toggle?: ToggleKey;
  detail?: DetailKey;
  danger?: boolean;
  action?: 'logout' | 'deactivate' | 'delete';
};

const AUDIENCE = ['Tout le monde', 'Mes abonnés', 'Personne'];

export default function Settings() {
  const router = useRouter();
  const { signOut, session } = useAuth();
  const [q, setQ] = useState('');
  const [sw, setSw] = useState<Record<ToggleKey, boolean>>({
    private: false, push: true, likes: true, comments: true, sales: true, twofa: false, dataSaver: false,
  });
  const [confirm, setConfirm] = useState<'deactivate' | 'delete' | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const { isComplete: paySet } = useCheckoutProfile();

  // Réglages ouverts en panneau
  const [detail, setDetail] = useState<DetailKey | null>(null);
  const [lang, setLang] = useState('Français');
  const [theme, setTheme] = useState(THEME_LABELS[getThemePref()]);
  const changeTheme = (label: string) => {
    setTheme(label);
    applyThemePref(THEME_FROM_LABEL[label] ?? 'system'); // enregistre + recharge (web) pour appliquer
  };
  const [storyVis, setStoryVis] = useState('Tout le monde');
  const [msgFrom, setMsgFrom] = useState('Tout le monde');
  const [mentionFrom, setMentionFrom] = useState('Tout le monde');
  const [linked, setLinked] = useState<Record<string, boolean>>({ Instagram: true, TikTok: false, YouTube: false, X: false });
  const [blocked, setBlocked] = useState(
    [
      { id: 'b1', name: 'Compte spam 221', handle: '@spam221', avatar: face('blk1', 100, 100) },
      { id: 'b2', name: 'Fake Shop', handle: '@fakeshop', avatar: face('blk2', 100, 100) },
    ]
  );
  const devices = [
    { id: 'd1', name: 'iPhone 14 · Dakar', sub: 'Cet appareil · actif maintenant', current: true },
    { id: 'd2', name: 'Chrome · Windows', sub: 'Dakar · il y a 2 h', current: false },
    { id: 'd3', name: 'Samsung S23', sub: 'Thiès · il y a 3 j', current: false },
  ];

  const runAccountAction = async () => {
    if (!confirm) return;
    setBusy(true);
    setErr(null);
    try {
      if (confirm === 'deactivate') await deactivateAccount();
      else await deleteAccount();
      setConfirm(null);
      router.replace('/');
    } catch (e: any) {
      setErr(e.message ?? 'Action impossible.');
    } finally {
      setBusy(false);
    }
  };

  const sections: { title: string; rows: Row[] }[] = [
    {
      title: 'Compte',
      rows: [
        { icon: 'person-outline', label: 'Modifier le profil', sub: 'Photo, nom, bio, lien', route: '/edit-profile' },
        { icon: 'id-card-outline', label: 'Informations personnelles', sub: 'Email, téléphone', detail: 'personal' },
        { icon: 'card-outline', label: 'Profil de paiement', sub: paySet ? 'Configuré · achat 1-clic' : 'Configure ton achat 1-clic', detail: 'payment' },
        { icon: 'link-outline', label: 'Comptes liés', sub: Object.values(linked).filter(Boolean).length + ' connecté(s)', detail: 'linked' },
      ],
    },
    {
      title: 'Créateur',
      rows: [
        { icon: 'cash-outline', label: 'Creator Rewards', sub: 'Gagne 100 F / 1 000 vues qualifiées', route: '/rewards' },
        { icon: 'wallet-outline', label: 'Portefeuille', sub: 'Solde, retraits & statistiques', route: '/studio' },
        { icon: 'repeat-outline', label: 'Affiliation', sub: 'Produits à revendre', route: '/affiliation' },
      ],
    },
    {
      title: 'Confidentialité',
      rows: [
        { icon: 'lock-closed-outline', label: 'Compte privé', toggle: 'private' },
        { icon: 'ban-outline', label: 'Comptes bloqués', sub: blocked.length + ' compte(s)', detail: 'blocked' },
        { icon: 'eye-off-outline', label: 'Masquer stories & lives', sub: storyVis, detail: 'hide' },
        { icon: 'chatbubbles-outline', label: 'Messages & mentions', sub: `Messages : ${msgFrom}`, detail: 'messages' },
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
        { icon: 'key-outline', label: 'Mot de passe', sub: 'Modifier ton mot de passe', detail: 'password' },
        { icon: 'shield-checkmark-outline', label: 'Authentification à deux facteurs', toggle: 'twofa' },
        { icon: 'phone-portrait-outline', label: 'Appareils connectés', sub: devices.length + ' appareils', detail: 'devices' },
      ],
    },
    {
      title: 'Préférences',
      rows: [
        { icon: 'language-outline', label: 'Langue', sub: lang, detail: 'language' },
        { icon: 'contrast-outline', label: 'Thème', sub: theme, detail: 'theme' },
        { icon: 'cellular-outline', label: 'Économiseur de données', toggle: 'dataSaver' },
      ],
    },
    {
      title: 'Assistance',
      rows: [
        { icon: 'help-circle-outline', label: 'Aide', url: 'mailto:support@afryko.app' },
        { icon: 'flag-outline', label: 'Signaler un problème', url: 'mailto:support@afryko.app' },
        { icon: 'people-outline', label: 'Règles de la communauté', route: '/legal/guidelines' },
        { icon: 'document-text-outline', label: "Conditions d'utilisation", route: '/legal/terms' },
        { icon: 'shield-outline', label: 'Politique de confidentialité', route: '/legal/privacy' },
        { icon: 'information-circle-outline', label: "À propos d'Afryko", sub: 'Version 1.0.0', route: '/legal/about' },
      ],
    },
    {
      title: 'Zone de compte',
      rows: [
        { icon: 'pause-circle-outline', label: 'Désactiver le compte', sub: 'Masquer temporairement, données conservées', action: 'deactivate' },
        { icon: 'trash-outline', label: 'Supprimer le compte', sub: 'Suppression définitive (RGPD)', danger: true, action: 'delete' },
      ],
    },
    {
      title: ' ',
      rows: [{ icon: 'log-out-outline', label: 'Déconnexion', danger: true, action: 'logout' }],
    },
  ];

  const onRow = async (r: Row) => {
    if (r.action === 'logout') { await signOut(); return; }
    if (r.action === 'deactivate' || r.action === 'delete') { setConfirm(r.action); return; }
    if (r.detail) { setDetail(r.detail); return; }
    if (r.route) router.push(r.route as any);
    else if (r.url) Linking.openURL(r.url);
  };

  const match = (r: Row) => (q ? r.label.toLowerCase().includes(q.toLowerCase()) : true);

  return (
    <View style={styles.root}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: Afryko.bg }}>
        <View style={styles.header}>
          <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/accueil'))} style={styles.back}>
            <Ionicons name="chevron-back" size={26} color={Afryko.text} />
          </Pressable>
          <Text style={styles.title}>Paramètres</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.search}>
          <Ionicons name="search" size={18} color={Afryko.textDim} />
          <TextInput style={styles.searchInput} value={q} onChangeText={setQ} placeholder="Rechercher un réglage" placeholderTextColor={Afryko.textFaint} />
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
                    <Ionicons name={r.icon} size={22} color={r.danger ? Afryko.live : Afryko.text} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.rowLabel, r.danger && { color: Afryko.live }]}>{r.label}</Text>
                      {r.sub && <Text style={styles.rowSub}>{r.sub}</Text>}
                    </View>
                    {r.toggle ? (
                      <Switch
                        value={sw[r.toggle]}
                        onValueChange={(v) => setSw((p) => ({ ...p, [r.toggle!]: v }))}
                        trackColor={{ true: Afryko.violet }}
                      />
                    ) : (
                      !r.danger && <Ionicons name="chevron-forward" size={18} color={Afryko.textFaint} />
                    )}
                  </Pressable>
                ))}
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* Panneaux de réglage */}
      <DetailPanel
        which={detail}
        onClose={() => setDetail(null)}
        hasSession={!!session}
        state={{ lang, setLang, theme, setTheme: changeTheme, storyVis, setStoryVis, msgFrom, setMsgFrom, mentionFrom, setMentionFrom, linked, setLinked, blocked, setBlocked, devices }}
      />

      {/* Confirmation désactivation / suppression */}
      <Modal visible={!!confirm} transparent animationType="fade" onRequestClose={() => setConfirm(null)}>
        <View style={styles.confirmBackdrop}>
          <View style={styles.confirmCard}>
            <View style={[styles.confirmIcon, confirm === 'delete' && { backgroundColor: '#E11D481A' }]}>
              <Ionicons name={confirm === 'delete' ? 'trash' : 'pause'} size={26} color={confirm === 'delete' ? Afryko.live : Afryko.violet} />
            </View>
            <Text style={styles.confirmTitle}>{confirm === 'delete' ? 'Supprimer ton compte ?' : 'Désactiver ton compte ?'}</Text>
            <Text style={styles.confirmText}>
              {confirm === 'delete'
                ? 'Cette action est définitive : ton profil, tes produits, vidéos et données seront supprimés. Impossible de revenir en arrière.'
                : 'Ton compte sera masqué et tu seras déconnecté. Reconnecte-toi quand tu veux pour le réactiver.'}
            </Text>
            {err && <Text style={styles.confirmErr}>{err}</Text>}
            <Pressable
              onPress={runAccountAction}
              disabled={busy}
              style={[styles.confirmBtn, { backgroundColor: confirm === 'delete' ? Afryko.live : Afryko.violet }]}>
              {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.confirmBtnText}>{confirm === 'delete' ? 'Supprimer définitivement' : 'Désactiver'}</Text>}
            </Pressable>
            <Pressable onPress={() => setConfirm(null)} style={{ marginTop: 12 }} disabled={busy}>
              <Text style={styles.confirmCancel}>Annuler</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

/* ------------------------- Panneau détail ------------------------- */

type PanelState = {
  lang: string; setLang: (v: string) => void;
  theme: string; setTheme: (v: string) => void;
  storyVis: string; setStoryVis: (v: string) => void;
  msgFrom: string; setMsgFrom: (v: string) => void;
  mentionFrom: string; setMentionFrom: (v: string) => void;
  linked: Record<string, boolean>; setLinked: (f: (p: Record<string, boolean>) => Record<string, boolean>) => void;
  blocked: { id: string; name: string; handle: string; avatar: string }[];
  setBlocked: (f: (p: any[]) => any[]) => void;
  devices: { id: string; name: string; sub: string; current: boolean }[];
};

const TITLES: Record<DetailKey, string> = {
  personal: 'Informations personnelles',
  payment: 'Profil de paiement',
  linked: 'Comptes liés',
  blocked: 'Comptes bloqués',
  hide: 'Masquer stories & lives',
  messages: 'Messages & mentions',
  password: 'Mot de passe',
  devices: 'Appareils connectés',
  language: 'Langue',
  theme: 'Thème',
};

function DetailPanel({ which, onClose, hasSession, state }: { which: DetailKey | null; onClose: () => void; hasSession: boolean; state: PanelState }) {
  return (
    <Modal visible={!!which} animationType="slide" onRequestClose={onClose} presentationStyle="fullScreen">
      <View style={styles.root}>
        <SafeAreaView edges={['top']} style={{ backgroundColor: Afryko.bg }}>
          <View style={styles.header}>
            <Pressable onPress={onClose} style={styles.back}>
              <Ionicons name="chevron-back" size={26} color={Afryko.text} />
            </Pressable>
            <Text style={styles.title}>{which ? TITLES[which] : ''}</Text>
            <View style={{ width: 40 }} />
          </View>
        </SafeAreaView>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
          {which === 'personal' && <PersonalPanel hasSession={hasSession} onClose={onClose} />}
          {which === 'payment' && <PaymentProfilePanel onClose={onClose} />}
          {which === 'password' && <PasswordPanel hasSession={hasSession} onClose={onClose} />}
          {which === 'linked' && <LinkedPanel linked={state.linked} setLinked={state.setLinked} />}
          {which === 'blocked' && <BlockedPanel blocked={state.blocked} setBlocked={state.setBlocked} />}
          {which === 'devices' && <DevicesPanel devices={state.devices} />}
          {which === 'hide' && (
            <Choice title="Qui peut voir mes stories & lives" options={AUDIENCE} value={state.storyVis} onChange={state.setStoryVis} note="Les comptes exclus ne verront plus tes stories ni tes lives." />
          )}
          {which === 'messages' && (
            <>
              <Choice title="Qui peut m'envoyer un message" options={AUDIENCE} value={state.msgFrom} onChange={state.setMsgFrom} />
              <Choice title="Qui peut me mentionner" options={AUDIENCE} value={state.mentionFrom} onChange={state.setMentionFrom} />
            </>
          )}
          {which === 'language' && (
            <Choice title="Langue de l'application" options={['Français', 'English', 'Wolof']} value={state.lang} onChange={state.setLang} note="Certaines traductions arrivent bientôt." />
          )}
          {which === 'theme' && (
            <Choice title="Apparence" options={['Clair', 'Sombre', 'Système']} value={state.theme} onChange={state.setTheme} note="« Système » suit le réglage de ton appareil. Sur le web, le changement s'applique immédiatement." />
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

function PersonalPanel({ hasSession, onClose }: { hasSession: boolean; onClose: () => void }) {
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [initialEmail, setInitialEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    getAccountInfo().then(({ email, phone }) => {
      setEmail(email ?? ''); setInitialEmail(email ?? ''); setPhone(phone ?? '');
    }).catch(() => {});
  }, []);

  const save = async () => {
    setBusy(true); setMsg(null);
    try {
      if (hasSession && email && email !== initialEmail) {
        await changeEmail(email);
        setMsg('Email de confirmation envoyé à ta nouvelle adresse.');
        setInitialEmail(email);
      } else {
        setMsg('Informations enregistrées.');
      }
    } catch (e: any) {
      setMsg(e.message ?? 'Enregistrement impossible.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Field label="Adresse email" value={email} onChangeText={setEmail} keyboardType="email-address" placeholder="toi@exemple.com" />
      <Field label="Téléphone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="+221 ..." />
      {msg && <Text style={styles.panelNote}>{msg}</Text>}
      <PrimaryBtn label="Enregistrer" busy={busy} onPress={save} />
    </>
  );
}

const OP_LABELS: Record<PayMethod, string> = { wave: 'Wave', om: 'Orange Money', card: 'Carte bancaire' };
function PaymentProfilePanel({ onClose }: { onClose: () => void }) {
  const { profile, setProfile } = useCheckoutProfile();
  const [name, setName] = useState(profile.name);
  const [phone, setPhone] = useState(profile.phone);
  const [card, setCard] = useState(profile.card);
  const [pref, setPref] = useState<PayMethod>(profile.preferred);
  const [msg, setMsg] = useState<string | null>(null);

  const labelToId = (l: string): PayMethod => (Object.keys(OP_LABELS) as PayMethod[]).find((k) => OP_LABELS[k] === l) ?? 'wave';
  const save = () => {
    setProfile({ name: name.trim(), phone: phone.trim(), card: card.replace(/\s/g, ''), preferred: pref });
    setMsg('Profil de paiement enregistré — achat en 1 clic activé.');
    setTimeout(onClose, 900);
  };

  return (
    <>
      <Text style={styles.panelNote}>Renseigne tes infos une fois : ensuite, achat en 1 clic partout dans l'app (mobile money ou carte via XaalisPay).</Text>
      <View style={{ height: 14 }} />
      <Field label="Nom complet" value={name} onChangeText={setName} placeholder="Ton nom complet" autoCapitalize="words" />
      <Field label="Numéro mobile money" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="77 123 45 67" />
      <Field label="Carte bancaire (optionnel)" value={card} onChangeText={setCard} keyboardType="number-pad" placeholder="1234 5678 9012 3456" />
      {card.replace(/\D/g, '').length >= 4 && <Text style={styles.panelNote}>Enregistrée : {maskCard(card)} · sécurisée par XaalisPay.</Text>}
      <View style={{ height: 6 }} />
      <Choice title="Moyen de paiement par défaut" options={['Wave', 'Orange Money', 'Carte bancaire']} value={OP_LABELS[pref]} onChange={(l) => setPref(labelToId(l))} />
      {msg && <Text style={styles.panelNote}>{msg}</Text>}
      <PrimaryBtn label="Enregistrer" onPress={save} />
    </>
  );
}

function PasswordPanel({ hasSession, onClose }: { hasSession: boolean; onClose: () => void }) {
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const valid = pw.length >= 8 && pw === pw2;

  const save = async () => {
    setBusy(true); setMsg(null);
    try {
      if (hasSession) await changePassword(pw);
      setMsg('Mot de passe mis à jour.');
      setTimeout(onClose, 900);
    } catch (e: any) {
      setMsg(e.message ?? 'Modification impossible.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Field label="Nouveau mot de passe" value={pw} onChangeText={setPw} secureTextEntry placeholder="Au moins 8 caractères" />
      <Field label="Confirmer le mot de passe" value={pw2} onChangeText={setPw2} secureTextEntry placeholder="Retape le mot de passe" />
      {pw2.length > 0 && pw !== pw2 && <Text style={styles.panelErr}>Les mots de passe ne correspondent pas.</Text>}
      {msg && <Text style={styles.panelNote}>{msg}</Text>}
      <PrimaryBtn label="Mettre à jour" busy={busy} disabled={!valid} onPress={save} />
    </>
  );
}

function LinkedPanel({ linked, setLinked }: { linked: Record<string, boolean>; setLinked: (f: (p: Record<string, boolean>) => Record<string, boolean>) => void }) {
  const ICONS: Record<string, keyof typeof Ionicons.glyphMap> = { Instagram: 'logo-instagram', TikTok: 'musical-notes', YouTube: 'logo-youtube', X: 'logo-twitter' };
  return (
    <View style={styles.panelCard}>
      {Object.keys(linked).map((k, i, arr) => (
        <View key={k} style={[styles.row, i < arr.length - 1 && styles.rowBorderBottom]}>
          <Ionicons name={ICONS[k]} size={22} color={Afryko.text} />
          <Text style={[styles.rowLabel, { flex: 1 }]}>{k}</Text>
          <Pressable onPress={() => setLinked((p) => ({ ...p, [k]: !p[k] }))} style={[styles.linkBtn, linked[k] && styles.linkBtnOn]}>
            <Text style={[styles.linkBtnText, linked[k] && { color: Afryko.textDim }]}>{linked[k] ? 'Connecté' : 'Connecter'}</Text>
          </Pressable>
        </View>
      ))}
    </View>
  );
}

function BlockedPanel({ blocked, setBlocked }: { blocked: any[]; setBlocked: (f: (p: any[]) => any[]) => void }) {
  if (blocked.length === 0) {
    return (
      <View style={styles.empty}>
        <Ionicons name="checkmark-circle-outline" size={44} color={Afryko.textFaint} />
        <Text style={styles.emptyText}>Aucun compte bloqué.</Text>
      </View>
    );
  }
  return (
    <View style={styles.panelCard}>
      {blocked.map((b, i) => (
        <View key={b.id} style={[styles.row, i < blocked.length - 1 && styles.rowBorderBottom]}>
          <Image source={{ uri: b.avatar }} style={styles.avatar} contentFit="cover" />
          <View style={{ flex: 1 }}>
            <Text style={styles.rowLabel}>{b.name}</Text>
            <Text style={styles.rowSub}>{b.handle}</Text>
          </View>
          <Pressable onPress={() => setBlocked((p) => p.filter((x) => x.id !== b.id))} style={styles.linkBtn}>
            <Text style={styles.linkBtnText}>Débloquer</Text>
          </Pressable>
        </View>
      ))}
    </View>
  );
}

function DevicesPanel({ devices }: { devices: { id: string; name: string; sub: string; current: boolean }[] }) {
  return (
    <View style={styles.panelCard}>
      {devices.map((d, i) => (
        <View key={d.id} style={[styles.row, i < devices.length - 1 && styles.rowBorderBottom]}>
          <Ionicons name={d.name.includes('Chrome') ? 'desktop-outline' : 'phone-portrait-outline'} size={22} color={Afryko.text} />
          <View style={{ flex: 1 }}>
            <Text style={styles.rowLabel}>{d.name}</Text>
            <Text style={styles.rowSub}>{d.sub}</Text>
          </View>
          {d.current ? (
            <View style={styles.currentTag}><Text style={styles.currentTagText}>Actuel</Text></View>
          ) : (
            <Pressable style={styles.linkBtn}><Text style={[styles.linkBtnText, { color: Afryko.live }]}>Déconnecter</Text></Pressable>
          )}
        </View>
      ))}
    </View>
  );
}

/* ------------------------- Sous-composants ------------------------- */

function Choice({ title, options, value, onChange, note }: { title: string; options: string[]; value: string; onChange: (v: string) => void; note?: string }) {
  return (
    <View style={{ marginBottom: 18 }}>
      <Text style={styles.choiceTitle}>{title}</Text>
      <View style={styles.panelCard}>
        {options.map((o, i) => (
          <Pressable key={o} onPress={() => onChange(o)} style={[styles.row, i < options.length - 1 && styles.rowBorderBottom]}>
            <Text style={[styles.rowLabel, { flex: 1 }]}>{o}</Text>
            {value === o && <Ionicons name="checkmark" size={22} color={Afryko.violet} />}
          </Pressable>
        ))}
      </View>
      {note && <Text style={styles.panelNote}>{note}</Text>}
    </View>
  );
}

function Field({ label, ...props }: { label: string } & React.ComponentProps<typeof TextInput>) {
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput style={styles.field} placeholderTextColor={Afryko.textFaint} autoCapitalize="none" {...props} />
    </View>
  );
}

function PrimaryBtn({ label, onPress, busy, disabled }: { label: string; onPress: () => void; busy?: boolean; disabled?: boolean }) {
  return (
    <Pressable onPress={onPress} disabled={busy || disabled} style={[styles.primaryBtn, (busy || disabled) && { opacity: 0.5 }]}>
      {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>{label}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Afryko.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 6 },
  back: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { ...Type.subtitle, color: Afryko.text },
  search: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: Afryko.surface, marginHorizontal: 16, marginTop: 6, marginBottom: 8, paddingHorizontal: 16, height: 44, borderRadius: Radius.pill, borderWidth: 1, borderColor: Afryko.border },
  searchInput: { flex: 1, ...Type.body, fontSize: 15, color: Afryko.text, height: '100%' },

  sectionTitle: { ...Type.small, color: Afryko.textDim, fontFamily: Font.semibold, marginBottom: 8, marginLeft: 4, textTransform: 'uppercase', letterSpacing: 0.4 },
  card: { backgroundColor: Afryko.surface, borderRadius: Radius.lg, borderWidth: 1, borderColor: Afryko.border, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingVertical: 14 },
  rowBorderBottom: { borderBottomWidth: 1, borderBottomColor: Afryko.bg },
  rowLabel: { ...Type.body, fontSize: 15, color: Afryko.text },
  rowSub: { ...Type.caption, color: Afryko.textDim, marginTop: 2 },

  // Panneaux
  panelCard: { backgroundColor: Afryko.surface, borderRadius: Radius.lg, borderWidth: 1, borderColor: Afryko.border, overflow: 'hidden' },
  choiceTitle: { ...Type.small, color: Afryko.textDim, fontFamily: Font.semibold, marginBottom: 8, marginLeft: 4 },
  panelNote: { ...Type.caption, color: Afryko.textDim, marginTop: 12, marginHorizontal: 4, lineHeight: 18 },
  panelErr: { ...Type.caption, color: Afryko.live, marginTop: 8, marginHorizontal: 4 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: Afryko.surfaceAlt },
  linkBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: Radius.pill, backgroundColor: Afryko.surfaceAlt },
  linkBtnOn: { backgroundColor: Afryko.bg, borderWidth: 1, borderColor: Afryko.border },
  linkBtnText: { ...Type.caption, fontFamily: Font.semibold, color: Afryko.violet },
  currentTag: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.pill, backgroundColor: Afryko.green + '1A' },
  currentTagText: { ...Type.caption, fontFamily: Font.semibold, color: Afryko.green },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyText: { ...Type.body, color: Afryko.textDim },

  fieldLabel: { ...Type.small, color: Afryko.textDim, fontFamily: Font.semibold, marginBottom: 8, marginLeft: 4 },
  field: { backgroundColor: Afryko.surface, borderWidth: 1, borderColor: Afryko.border, borderRadius: Radius.md, paddingHorizontal: 16, height: 52, ...Type.body, fontSize: 15, color: Afryko.text },
  primaryBtn: { backgroundColor: Afryko.violet, height: 52, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  primaryBtnText: { color: '#fff', fontFamily: Font.semibold, fontSize: 16 },

  confirmBackdrop: { flex: 1, backgroundColor: '#00000077', alignItems: 'center', justifyContent: 'center', padding: 28 },
  confirmCard: { backgroundColor: Afryko.bg, borderRadius: 24, padding: 24, alignItems: 'center', width: '100%', maxWidth: 380 },
  confirmIcon: { width: 60, height: 60, borderRadius: 18, backgroundColor: '#3E5BFF1A', alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  confirmTitle: { ...Type.title, fontSize: 20, color: Afryko.text, textAlign: 'center' },
  confirmText: { ...Type.body, color: Afryko.textDim, textAlign: 'center', marginTop: 8 },
  confirmErr: { ...Type.small, color: Afryko.live, marginTop: 12, textAlign: 'center' },
  confirmBtn: { height: 52, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center', alignSelf: 'stretch', marginTop: 18 },
  confirmBtnText: { color: '#fff', fontFamily: Font.semibold, fontSize: 16 },
  confirmCancel: { ...Type.body, fontFamily: Font.semibold, color: Afryko.textDim, textAlign: 'center' },
});
