import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar, PillButton } from '@/components/ui-kit';
import { Afylo, Font, Radius } from '@/constants/brand';
import { useAuth } from '@/lib/auth';
import { getMyProfile, updateMyProfile } from '@/lib/db';
import { myProfile } from '@/lib/mock';

export default function EditProfile() {
  const router = useRouter();
  const { session } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [avatar, setAvatar] = useState('');
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
          setName(prof.display_name ?? '');
          setHandle(prof.handle ?? '');
          setBio(prof.bio ?? '');
          setWebsite(prof.website ?? '');
        }
      })
      .finally(() => setLoading(false));
  }, [session]);

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
      });
      router.back();
    } catch (e: any) {
      setError(e.message ?? 'Erreur lors de l\'enregistrement.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.root}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: Afylo.bg }}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.hbtn}>
            <Ionicons name="close" size={26} color={Afylo.text} />
          </Pressable>
          <Text style={styles.title}>Modifier le profil</Text>
          <View style={{ width: 40 }} />
        </View>
      </SafeAreaView>

      {loading ? (
        <ActivityIndicator color={Afylo.violet} style={{ marginTop: 40 }} />
      ) : (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
            {/* Photo */}
            <View style={styles.avatarWrap}>
              <Avatar uri={avatar || myProfile.avatar} size={92} ring />
              <Text style={styles.changePhoto}>Photo de profil (colle une URL ci-dessous)</Text>
            </View>

            {!session && (
              <Text style={styles.demoNote}>Mode invité : connecte-toi pour enregistrer tes modifications.</Text>
            )}

            <Field label="URL de la photo" value={avatar} onChange={setAvatar} placeholder="https://..." />
            <Field label="Nom affiché" value={name} onChange={setName} placeholder="Ton nom" />
            <Field label="Identifiant (@handle)" value={handle} onChange={setHandle} placeholder="fatou.style" />
            <Field label="Bio" value={bio} onChange={setBio} placeholder="Parle de toi, ta boutique..." multiline />
            <Field label="Lien web" value={website} onChange={setWebsite} placeholder="https://ton-site.com" />

            {error && <Text style={styles.error}>{error}</Text>}

            <PillButton label="Enregistrer" icon="checkmark" onPress={save} loading={saving} style={{ marginTop: 22 }} />
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
        placeholderTextColor={Afylo.textFaint}
        multiline={multiline}
        autoCapitalize={multiline ? 'sentences' : 'none'}
        autoCorrect={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Afylo.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 8 },
  hbtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { color: Afylo.text, fontSize: 18, fontFamily: Font.bold },

  avatarWrap: { alignItems: 'center', marginTop: 8, gap: 10 },
  changePhoto: { color: Afylo.textDim, fontSize: 13 },
  demoNote: { color: Afylo.textFaint, fontSize: 12, textAlign: 'center', marginTop: 16 },

  label: { color: Afylo.text, fontSize: 14, fontWeight: '700', marginBottom: 8 },
  input: { backgroundColor: Afylo.surface, borderRadius: Radius.md, borderWidth: 1, borderColor: Afylo.border, color: Afylo.text, fontSize: 15, paddingHorizontal: 14, height: 50 },
  error: { color: Afylo.live, fontSize: 14, marginTop: 16, fontWeight: '600' },
});
