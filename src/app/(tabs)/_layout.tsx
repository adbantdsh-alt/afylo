import { Tabs } from 'expo-router';

import { AfyloTabBar } from '@/components/afylo-tab-bar';

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <AfyloTabBar {...props} />}
      screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="accueil" />
      <Tabs.Screen name="trend" />
      <Tabs.Screen name="creer" />
      <Tabs.Screen name="feed" />
      <Tabs.Screen name="profil" />
    </Tabs>
  );
}
