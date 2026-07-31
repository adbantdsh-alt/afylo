import { Ionicons } from '@expo/vector-icons';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Afylo } from '@/constants/brand';
import { useAuthGate } from '@/lib/auth-gate';

const ICONS: Record<string, [keyof typeof Ionicons.glyphMap, keyof typeof Ionicons.glyphMap]> = {
  accueil: ['home', 'home-outline'],
  trend: ['flame', 'flame-outline'],
  feed: ['grid', 'grid-outline'],
  profil: ['person', 'person-outline'],
};

export function AfyloTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const gate = useAuthGate();

  return (
    <View style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 12) }]} pointerEvents="box-none">
      <BlurView intensity={40} tint="light" style={styles.bar}>
        {state.routes.map((route, index) => {
          const focused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
          };

          if (route.name === 'creer') {
            return (
              <Pressable key={route.key} onPress={() => { if (gate('publier ou vendre')) onPress(); }} style={styles.fabWrap}>
                <View style={styles.fab}>
                  <Ionicons name="add" size={30} color="#fff" />
                </View>
              </Pressable>
            );
          }

          const [on, off] = ICONS[route.name] ?? ['ellipse', 'ellipse-outline'];
          return (
            <Pressable key={route.key} onPress={onPress} style={styles.tab}>
              <Ionicons name={focused ? on : off} size={25} color={focused ? Afylo.text : Afylo.textFaint} />
              {focused && <View style={styles.dot} />}
            </Pressable>
          );
        })}
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, bottom: 0, alignItems: 'center', backgroundColor: 'transparent' },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    height: 64,
    width: '92%',
    marginHorizontal: 16,
    borderRadius: 34,
    paddingHorizontal: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Afylo.glassBorder,
    backgroundColor: Afylo.glass,
    // ombre douce (liquid glass qui flotte)
    shadowColor: Afylo.glassShadow,
    shadowOpacity: 1,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
  },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', height: '100%' },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: Afylo.violet, marginTop: 5 },
  fabWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  fab: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Afylo.violet,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.65)',
    shadowColor: Afylo.violet,
    shadowOpacity: 0.45,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
  },
});
