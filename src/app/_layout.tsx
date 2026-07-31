import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { Afylo } from '@/constants/brand';
import { AuthProvider, useAuth } from '@/lib/auth';

// Routes accessibles sans être connecté
const PUBLIC = ['index', 'login'];

function useProtectedRoute() {
  const { session, guest, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    const first = segments[0] ?? 'index';
    const inPublic = PUBLIC.includes(first);
    const authed = Boolean(session) || guest;

    if (!authed && !inPublic) {
      router.replace('/'); // ni connecté ni invité → accueil public
    } else if (session && (first === 'index' || first === 'login')) {
      router.replace('/accueil'); // déjà connecté → app
    }
  }, [session, guest, loading, segments, router]);
}

function RootNavigator() {
  const { loading } = useAuth();
  useProtectedRoute();

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: Afylo.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={Afylo.violet} size="large" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Afylo.bg } }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="login" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="studio" />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <AuthProvider>
        <RootNavigator />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
