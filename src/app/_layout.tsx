import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { Afylo, isDark } from '@/constants/brand';
import '../global.css';
import { AuthProvider, useAuth } from '@/lib/auth';
import { AuthGateProvider } from '@/lib/auth-gate';
import { StoriesProvider } from '@/lib/stories';
import { RepostsProvider } from '@/lib/reposts';
import { CheckoutProfileProvider } from '@/lib/checkout-profile';
import { BuzzProvider } from '@/lib/buzz';
import { MeProvider } from '@/lib/me';
import { PendingUploadProvider } from '@/lib/pending-upload';

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
      <Stack.Screen name="rewards" />
      <Stack.Screen name="product-new" options={{ presentation: 'modal' }} />
      <Stack.Screen name="post-new" options={{ presentation: 'modal' }} />
      <Stack.Screen name="edit-profile" options={{ presentation: 'modal' }} />
      <Stack.Screen name="creator/[id]" />
      <Stack.Screen name="post/[id]" />
      <Stack.Screen name="saved" />
      <Stack.Screen name="affiliation" />
      <Stack.Screen name="settings" />
      <Stack.Screen name="connections" />
      <Stack.Screen name="notifications" />
      <Stack.Screen name="search" />
      <Stack.Screen name="sound/[id]" />
      <Stack.Screen name="live" options={{ animation: 'fade', presentation: 'fullScreenModal' }} />
      <Stack.Screen name="upgrade-pro" options={{ presentation: 'modal' }} />
      <Stack.Screen name="watch/[start]" options={{ animation: 'fade', presentation: 'fullScreenModal' }} />
      <Stack.Screen name="messages" />
      <Stack.Screen name="chat/[id]" />
      <Stack.Screen name="comments/[id]" options={{ presentation: 'transparentModal', animation: 'slide_from_bottom' }} />
      <Stack.Screen name="story/[uid]" options={{ animation: 'fade', presentation: 'fullScreenModal' }} />
      <Stack.Screen name="legal/[doc]" />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  // Ne jamais bloquer le site si une police échoue à charger.
  if (!fontsLoaded && !fontError) {
    return (
      <View style={{ flex: 1, backgroundColor: Afylo.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={Afylo.violet} size="large" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <AuthProvider>
        <AuthGateProvider>
          <MeProvider>
            <StoriesProvider>
              <RepostsProvider>
                <CheckoutProfileProvider>
                  <BuzzProvider>
                    <PendingUploadProvider>
                      <RootNavigator />
                    </PendingUploadProvider>
                  </BuzzProvider>
                </CheckoutProfileProvider>
              </RepostsProvider>
            </StoriesProvider>
          </MeProvider>
        </AuthGateProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
