import { Ionicons } from '@expo/vector-icons';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Afryko, Font } from '@/constants/brand';
import { useAuthGate } from '@/lib/auth-gate';
import { useTabBar } from '@/lib/tabbar';

const TABS: Record<string, { on: keyof typeof Ionicons.glyphMap; off: keyof typeof Ionicons.glyphMap; label: string }> = {
  accueil: { on: 'home', off: 'home-outline', label: 'Accueil' },
  trend: { on: 'flame', off: 'flame-outline', label: 'Trend' },
  feed: { on: 'play-circle', off: 'play-circle-outline', label: 'Live' },
  profil: { on: 'person', off: 'person-outline', label: 'Profil' },
};

export function AfrykoTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const gate = useAuthGate();
  const { hidden } = useTabBar();

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: hidden.value * 130 }],
    opacity: 1 - hidden.value * 0.25,
  }));

  return (
    <Animated.View style={[styles.wrap, animStyle]} pointerEvents="box-none">
      <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
          };

          if (route.name === 'creer') {
            return (
              <Pressable key={route.key} onPress={() => { if (gate('publier ou vendre')) onPress(); }} style={styles.slot}>
                <LinearGradient
                  colors={[Afryko.violet, Afryko.violet2]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.create}>
                  <Ionicons name="add" size={26} color="#fff" />
                </LinearGradient>
              </Pressable>
            );
          }

          const cfg = TABS[route.name];
          return (
            <Pressable key={route.key} onPress={onPress} style={styles.slot}>
              <Ionicons
                name={focused ? cfg.on : cfg.off}
                size={24}
                color={focused ? '#fff' : '#8E8E93'}
              />
              <Text style={[styles.label, focused ? styles.labelOn : styles.labelOff]}>{cfg.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: 'transparent' },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingTop: 10,
    paddingHorizontal: 6,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    overflow: 'hidden',
    backgroundColor: Afryko.navBg,
    borderTopWidth: 1,
    borderColor: Afryko.navBorder,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: -4 },
    elevation: 16,
  },
  slot: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3, paddingVertical: 2 },
  label: { fontSize: 10.5, fontFamily: Font.medium },
  labelOn: { color: '#fff', fontFamily: Font.semibold },
  labelOff: { color: '#8E8E93' },
  create: {
    width: 48,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Afryko.violet,
    shadowOpacity: 0.4,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
});
