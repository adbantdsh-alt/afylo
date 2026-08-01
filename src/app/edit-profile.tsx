import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar, PillButton } from '@/components/ui-kit';
import { Afryko, Font, Radius } from '@/constants/brand';
import { useAuth } from '@/lib/auth';
import { getMyProfile, updateMyProfile, uploadImage } from '@/lib/db';
import { useMe } from '@/lib/me';

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
  const [name, setName] = useState('');
  const [handle, setHandle] = useState('');
  const [bio, setBio] = useState('');
  const [website, setWebsite] = useState('');

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
        // n'inclut banner_url que si une bannière est définie (évite l'erreur si la
        // colonne n'existe pas encore — migration 0007 requise pour la persister)
        ...(banner.trim() ? { banner_url: banner.trim() } : {}),
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
        <ActivityIndicator color={Afryko.violet} style={{ marginTop: 40 }} />
      ) : (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={{ paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
            {/* Bannière (façon X) */}
            <Pressable style={styles.bannerEdit} onPress={pickBanner}>
              {banner ? (
                <Image source={{ uri: banner }} style={StyleSheet.absoluteFill} contentFit="cover" />
              ) : (
                <LinearGradient colors={[Afryko.violet, Afryko.violet2]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
              )}
              <View style={styles.bannerScrim}>
                {uploadingBanner ? <ActivityIndicator color="#fff" /> : <Ionicons name="camera" size={22} color="#fff" />}
                <Text style={styles.bannerHint}>Bannière</Text>
              </View>
            </Pressable>

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

  bannerEdit: { height: 140, backgroundColor: Afryko.surfaceAlt },
  bannerScrim: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', gap: 4, backgroundColor: '#00000040' },
  bannerHint: { color: '#fff', fontSize: 12, fontFamily: Font.semibold },
  avatarWrap: { alignItems: 'center', marginTop: -46, gap: 10 },
  avatarEdit: { borderRadius: 50, borderWidth: 4, borderColor: Afryko.bg, backgroundColor: Afryko.bg },
  cameraBadge: { position: 'absolute', bottom: 0, right: 0, width: 34, height: 34, borderRadius: 17, backgroundColor: Afryko.violet, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: Afryko.bg },
  changePhoto: { color: Afryko.violet, fontSize: 14, fontFamily: Font.semibold },
  demoNote: { color: Afryko.textFaint, fontSize: 12, textAlign: 'center', marginTop: 16 },

  label: { color: Afryko.text, fontSize: 14, fontWeight: '700', marginBottom: 8 },
  input: { backgroundColor: Afryko.surface, borderRadius: Radius.md, borderWidth: 1, borderColor: Afryko.border, color: Afryko.text, fontSize: 15, paddingHorizontal: 14, height: 50 },
  error: { color: Afryko.live, fontSize: 14, marginTop: 16, fontWeight: '600' },
});
