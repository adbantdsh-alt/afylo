import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PillButton } from '@/components/ui-kit';
import { Afylo, Radius } from '@/constants/brand';
import { useAuth } from '@/lib/auth';

export default function Login() {
  const router = useRouter();
  const { signIn, signUp, enterGuest } = useAuth();
  const params = useLocalSearchParams<{ mode?: string }>();

  const [mode, setMode] = useState<'login' | 'signup'>(params.mode === 'signup' ? 'signup' : 'login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    setInfo(null);
    if (!email || !password) {
      setError('Renseigne ton email et ton mot de passe.');
      return;
    }
    if (password.length < 6) {
      setError('Le mot de passe doit faire au moins 6 caractères.');
      return;
    }
    setLoading(true);
    if (mode === 'login') {
      const { error } = await signIn(email, password);
      setLoading(false);
      if (error) setError(traduire(error));
      else router.replace('/accueil');
    } else {
      const { error, needsConfirm } = await signUp(email, password);
      setLoading(false);
      if (error) setError(traduire(error));
      else if (needsConfirm) {
        setInfo('Compte créé ! Vérifie ta boîte mail et clique le lien de confirmation, puis connecte-toi.');
        setMode('login');
      } else router.replace('/accueil');
    }
  };

  return (
    <View style={styles.root}>
      <LinearGradient colors={['#FBE7D8', '#F4EFE6', '#F4EFE6']} style={StyleSheet.absoluteFill} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <SafeAreaView style={styles.safe}>
          <Pressable onPress={() => router.back()} style={styles.back}>
            <Ionicons name="chevron-back" size={26} color={Afylo.text} />
          </Pressable>

          <Text style={styles.brand}>
            Afylo<Text style={{ color: Afylo.violet }}>.</Text>
          </Text>
          <Text style={styles.title}>{mode === 'login' ? 'Content de te revoir 👋' : 'Rejoins Afylo 🚀'}</Text>
          <Text style={styles.sub}>
            {mode === 'login' ? 'Connecte-toi pour créer, vendre et gagner.' : 'Crée ton compte en quelques secondes.'}
          </Text>

          {/* Bascule */}
          <View style={styles.switch}>
            <Pressable onPress={() => setMode('login')} style={[styles.switchBtn, mode === 'login' && styles.switchOn]}>
              <Text style={[styles.switchText, mode === 'login' && styles.switchTextOn]}>Connexion</Text>
            </Pressable>
            <Pressable onPress={() => setMode('signup')} style={[styles.switchBtn, mode === 'signup' && styles.switchOn]}>
              <Text style={[styles.switchText, mode === 'signup' && styles.switchTextOn]}>Inscription</Text>
            </Pressable>
          </View>

          <Field icon="mail-outline" placeholder="Email" value={email} onChange={setEmail} keyboardType="email-address" />
          <Field icon="lock-closed-outline" placeholder="Mot de passe" value={password} onChange={setPassword} secure />

          {error && <Text style={styles.error}>{error}</Text>}
          {info && <Text style={styles.info}>{info}</Text>}

          <PillButton
            label={mode === 'login' ? 'Se connecter' : "Créer mon compte"}
            onPress={submit}
            loading={loading}
            style={{ marginTop: 18 }}
          />

          <Text
            style={styles.guest}
            onPress={() => {
              enterGuest();
              router.replace('/accueil');
            }}>
            Explorer sans compte →
          </Text>

          <Text style={styles.legal}>
            En continuant, tu acceptes les Conditions d'utilisation et la Politique de confidentialité d'Afylo.
          </Text>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </View>
  );
}

function Field({
  icon,
  placeholder,
  value,
  onChange,
  secure,
  keyboardType,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  placeholder: string;
  value: string;
  onChange: (t: string) => void;
  secure?: boolean;
  keyboardType?: 'email-address' | 'default';
}) {
  return (
    <View style={styles.field}>
      <Ionicons name={icon} size={20} color={Afylo.textDim} />
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor={Afylo.textFaint}
        value={value}
        onChangeText={onChange}
        secureTextEntry={secure}
        keyboardType={keyboardType}
        autoCapitalize="none"
        autoCorrect={false}
      />
    </View>
  );
}

function traduire(msg: string): string {
  if (/invalid login credentials/i.test(msg)) return 'Email ou mot de passe incorrect.';
  if (/already registered|already been registered/i.test(msg)) return 'Cet email a déjà un compte. Connecte-toi.';
  if (/email not confirmed/i.test(msg)) return 'Email pas encore confirmé — clique le lien reçu par mail.';
  if (/rate limit|too many/i.test(msg)) return 'Trop de tentatives, réessaie dans un moment.';
  return msg;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Afylo.bg },
  safe: { flex: 1, paddingHorizontal: 24 },
  back: { width: 40, height: 40, justifyContent: 'center', marginTop: 4, marginLeft: -8 },
  brand: { color: Afylo.text, fontSize: 24, fontWeight: '800', marginTop: 8 },
  title: { color: Afylo.text, fontSize: 28, fontWeight: '800', marginTop: 24, letterSpacing: -0.5 },
  sub: { color: Afylo.textDim, fontSize: 15, marginTop: 8, lineHeight: 21 },

  switch: { flexDirection: 'row', backgroundColor: Afylo.surface, borderRadius: Radius.pill, padding: 4, marginTop: 28 },
  switchBtn: { flex: 1, paddingVertical: 11, borderRadius: Radius.pill, alignItems: 'center' },
  switchOn: { backgroundColor: Afylo.violet },
  switchText: { color: Afylo.textDim, fontWeight: '700', fontSize: 14 },
  switchTextOn: { color: '#fff' },

  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Afylo.surface,
    borderRadius: Radius.md,
    paddingHorizontal: 16,
    height: 56,
    marginTop: 14,
    borderWidth: 1,
    borderColor: Afylo.surfaceAlt,
  },
  input: { flex: 1, color: Afylo.text, fontSize: 16, height: '100%' },
  error: { color: Afylo.live, fontSize: 14, marginTop: 14, fontWeight: '600' },
  info: { color: Afylo.green, fontSize: 14, marginTop: 14, fontWeight: '600', lineHeight: 20 },
  guest: { color: Afylo.textDim, fontSize: 15, fontWeight: '700', textAlign: 'center', marginTop: 22 },
  legal: { color: Afylo.textFaint, fontSize: 12, textAlign: 'center', marginTop: 20, lineHeight: 18 },
});
