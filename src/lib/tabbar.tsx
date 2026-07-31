import { createContext, useContext, useRef, type ReactNode } from 'react';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { useSharedValue, withTiming, type SharedValue } from 'react-native-reanimated';

/**
 * Masquage immersif de la barre de nav au scroll.
 * `hidden` : 0 = visible, 1 = masquée. Partagé entre les écrans et la barre.
 */
type TabBarCtx = { hidden: SharedValue<number> };
const Ctx = createContext<TabBarCtx | null>(null);

export function TabBarProvider({ children }: { children: ReactNode }) {
  const hidden = useSharedValue(0);
  return <Ctx.Provider value={{ hidden }}>{children}</Ctx.Provider>;
}

export function useTabBar() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useTabBar hors TabBarProvider');
  return c;
}

/** Handler de scroll : masque en descendant, réaffiche en remontant. */
export function useHideOnScroll() {
  const { hidden } = useTabBar();
  const lastY = useRef(0);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y;
    const dy = y - lastY.current;
    if (y <= 4) hidden.value = withTiming(0, { duration: 200 });
    else if (dy > 8) hidden.value = withTiming(1, { duration: 200 }); // descend -> masque
    else if (dy < -8) hidden.value = withTiming(0, { duration: 200 }); // remonte -> montre
    lastY.current = y;
  };

  return { onScroll, scrollEventThrottle: 16 };
}

/** Force la barre visible (écrans où le masquage est désactivé, ex. profil). */
export function useAlwaysShowTabBar() {
  const { hidden } = useTabBar();
  return () => {
    hidden.value = withTiming(0, { duration: 150 });
  };
}
