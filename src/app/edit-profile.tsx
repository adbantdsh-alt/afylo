import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, PanResponder, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar, PillButton } from '@/components/ui-kit';
import { Skeleton, SkeletonCircle } from '@/components/skeleton';
import { Afryko, Font, Radius } from '@/constants/brand';
import { useAuth } from '@/lib/auth';
import { getMyProfile, updateMyProfile, uploadImage } from '@/lib/db';
import { useMe } from '@/lib/me';

const DEFAULT_BANNER = require('@/assets/images/default-banner.png');

export default function EditProfile() {
  const router = useRouter();
  const { session } = useAuth();
  const me = useMe();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [avatar, setAvatar] = useState('');
  const [banner, setBanner] = useState('');
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [bannerPos, setBannerPos] = useState(50); // position verticale de recadrage (0-100)
  const [name, setName] = useState('');
  const [handle, setHandle] = useState('');
  const [bio, setBio] = useState('');
  const [website, setWebsite] = useState('');

  // Repositionnement de la bannière (glisser verticalement) — refs pour éviter les closures obsolètes
  const BANNER_H = 150;
  const posRef = useRef(50);
  const hasBannerRef = useRef(false);
  useEffect(() => { hasBannerRef.current = !!banner; }, [banner]);
  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => hasBannerRef.current && Math.abs(g.dy) > 3,
      onPanResponderMove: (_, g) => {
        const next = Math.max(0, Math.min(100, posRef.current - (g.dy / BANNER_H) * 100));
        setBannerPos(Math.round(next));
      },
      onPanResponderRelease: (_, g) => {
        posRef.current = Math.max(0, Math.min(100, posRef.current - (g.dy / BANNER_H) * 100));
      },
    }),
  ).current;

  useEffect(() => {
    if (!session) {
      setLoading(false);
      return;
    }
    getMyProfile()
      .then((prof) => {
        if (prof) {
          setAvatar(prof.avatar_url ?? '');
          setBanner(prof.banner_url ?? '');
          const pos = prof.banner_position ?? 50;
          setBannerPos(pos);
          posRef.current = pos;
          setName(prof.display_name ?? '');
          setHandle(prof.handle ?? '');
          setBio(prof.bio ?? '');
          setWebsite(prof.website ?? '');
        }
      })
      .finally(() => setLoading(false));
  }, [session]);

  const pickPhoto = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.7 });
    if (res.canceled) return;
    const uri = res.assets[0].uri;
    if (!session) {
      setAvatar(uri); // aperçu en mode invité (non sauvegardé)
      return;
    }
    setUploadingPhoto(true);
    setError(null);
    try {
      const url = await uploadImage('avatars', uri);
      setAvatar(url);
    } catch (e: any) {
      setError(e.message ?? "Échec de l'upload de la photo.");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const pickBanner = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [3, 1], quality: 0.7 });
    if (res.canceled) return;
    const uri = res.assets[0].uri;
    if (!session) {
      setBanner(uri); // aperçu en mode invité (non sauvegardé)
      return;
    }
    setUploadingBanner(true);
    setError(null);
    try {
      const url = await uploadImage('avatars', uri);
      setBanner(url);
      setBannerPos(50); // nouvelle image → recentrer avant repositionnement
      posRef.current = 50;
    } catch (e: any) {
      setError(e.message ?? "Échec de l'upload de la bannière.");
    } finally {
      setUploadingBanner(false);
    }
  };

  const save = async () => {
    setError(null);
    if (!session) {
      setError('Connecte-toi avec un vrai compte pour modifier ton profil.');
      return;
    }
    setSaving(true);
    try {
      await updateMyProfile({
        display_name: name.trim(),
        handle: handle.trim().replace(/^@/, ''),
        bio: bio.trim(),
        avatar_url: avatar.trim() || null,
        website: website.trim() || null,
        // n'inclut banner_url/position que si une bannière est définie (évite l'erreur si la
        // colonne n'existe pas encore — migration 0007 requise pour la persister)
        ...(banner.trim() ? { banner_url: banner.trim(), banner_position: Math.round(bannerPos) } : {}),
      });
      (router.canGoBack() ? router.back() : router.replace('/accueil'));
    } catch (e: any) {
      setError(e.message ?? 'Erreur lors de l\'enregistrement.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.root}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: Afryko.bg }}>
        <View style={styles.header}>
          <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/accueil'))} style={styles.hbtn}>
            <Ionicons name="close" size={26} color={Afryko.text} />
          </Pressable>
          <Text style={styles.title}>Modifier le profil</Text>
          <View style={{ width: 40 }} />
        </View>
      </SafeAreaView>

      {loading ? (
        <View>
          <Skeleton w="100%" h={150} radius={0} />
          <View style={{ alignItems: 'center', marginTop: -46 }}><SkeletonCircle size={92} /></View>
          <View style={{ padding: 20, gap: 16, marginTop: 12 }}>
            <Skeleton w="100%" h={50} />
            <Skeleton w="100%" h={50} />
            <Skeleton w="100%" h={90} />
            <Skeleton w="100%" h={50} />
          </View>
        </View>
      ) : (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={{ paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
            {/* Bannière (façon X) — glisser pour repositionner quand une image est définie */}
            <View style={styles.bannerEdit} {...(banner ? pan.panHandlers : {})}>
              <Image
                source={banner ? { uri: banner } : DEFAULT_BANNER}
                style={StyleSheet.absoluteFill}
                contentFit="cover"
                contentPosition={{ left: '50%', top: `${bannerPos}%` }}
              />
              <View style={styles.bannerScrim} pointerEvents="box-none">
                <Pressable onPress={pickBanner} style={styles.bannerCam}>
                  {uploadingBanner ? <ActivityIndicator color="#fff" size="small" /> : <Ionicons name="camera" size={20} color="#fff" />}
                </Pressable>
                <Text style={styles.bannerHint} pointerEvents="none">
                  {banner ? 'Glisse pour repositionner · appuie pour changer' : 'Appuie pour ajouter une bannière'}
                </Text>
              </View>
            </View>

            {/* Photo (chevauche la bannière) */}
            <View style={styles.avatarWrap}>
              <Pressable onPress={pickPhoto} style={styles.avatarEdit}>
                <Avatar uri={avatar || me.avatar} size={92} />
                <View style={styles.cameraBadge}>
                  {uploadingPhoto ? <ActivityIndicator color="#fff" size="small" /> : <Ionicons name="camera" size={18} color="#fff" />}
                </View>
              </Pressable>
              <Pressable onPress={pickPhoto}>
                <Text style={styles.changePhoto}>Changer la photo</Text>
              </Pressable>
            </View>

            <View style={{ paddingHorizontal: 20 }}>

            {!session && (
              <Text style={styles.demoNote}>Mode invité : connecte-toi pour enregistrer tes modifications.</Text>
            )}

            <Field label="Nom affiché" value={name} onChange={setName} placeholder="Ton nom" />
            <Field label="Identifiant (@handle)" value={handle} onChange={setHandle} placeholder="fatou.style" />
            <Field label="Bio" value={bio} onChange={setBio} placeholder="Parle de toi, ta boutique..." multiline />
            <Field label="Lien web" value={website} onChange={setWebsite} placeholder="https://ton-site.com" />

            {error && <Text style={styles.error}>{error}</Text>}

              <PillButton label="Enregistrer" icon="checkmark" onPress={save} loading={saving} style={{ marginTop: 22 }} />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </View>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  multiline,
}: {
  label: string;
  value: string;
  onChange: (t: string) => void;
  placeholder: string;
  multiline?: boolean;
}) {
  return (
    <View style={{ marginTop: 16 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && { height: 90, textAlignVertical: 'top', paddingTop: 12 }]}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={Afryko.textFaint}
        multiline={multiline}
        autoCapitalize={multiline ? 'sentences' : 'none'}
        autoCorrect={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Afryko.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 8 },
  hbtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { color: Afryko.text, fontSize: 18, fontFamily: Font.bold },

  bannerEdit: { height: 150, backgroundColor: Afryko.surfaceAlt, overflow: 'hidden' },
  bannerScrim: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', gap: 8 },
  bannerCam: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#00000088', alignItems: 'center', justifyContent: 'center' },
  bannerHint: { color: '#fff', fontSize: 12, fontFamily: Font.semibold, backgroundColor: '#00000077', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, overflow: 'hidden' },
  avatarWrap: { alignItems: 'center', marginTop: -46, gap: 10 },
  avatarEdit: { borderRadius: 50, borderWidth: 4, borderColor: Afryko.bg, backgroundColor: Afryko.bg },
  cameraBadge: { position: 'absolute', bottom: 0, right: 0, width: 34, height: 34, borderRadius: 17, backgroundColor: Afryko.violet, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: Afryko.bg },
  changePhoto: { color: Afryko.violet, fontSize: 14, fontFamily: Font.semibold },
  demoNote: { color: Afryko.textFaint, fontSize: 12, textAlign: 'center', marginTop: 16 },

  label: { color: Afryko.text, fontSize: 14, fontWeight: '700', marginBottom: 8 },
  input: { backgroundColor: Afryko.surface, borderRadius: Radius.md, borderWidth: 1, borderColor: Afryko.border, color: Afryko.text, fontSize: 15, paddingHorizontal: 14, height: 50 },
  error: { color: Afryko.live, fontSize: 14, marginTop: 16, fontWeight: '600' },
});
