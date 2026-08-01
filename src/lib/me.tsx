/**
 * Contexte « moi » : le profil de l'utilisateur connecté (avatar, nom, handle, pro),
 * chargé une fois depuis Supabase et partagé partout (accueil, commentaires, live, chat, stories…).
 * Repli sur le mock si non connecté.
 */
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import { useAuth } from '@/lib/auth';
import { getMyProfile, isProAccount } from '@/lib/db';
import { me as mockMe } from '@/lib/mock';

export type Me = { id: string | null; name: string; handle: string; avatar: string; isPro: boolean; bio: string | null };
const DEFAULT: Me = { id: null, name: mockMe.name, handle: 'toi', avatar: mockMe.avatar, isPro: false, bio: null };

const MeCtx = createContext<{ me: Me; refresh: () => void }>({ me: DEFAULT, refresh: () => {} });

export function MeProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const [me, setMe] = useState<Me>(DEFAULT);

  const refresh = () => {
    getMyProfile()
      .then((p) => {
        if (p) {
          setMe({
            id: p.id,
            name: p.display_name || mockMe.name,
            handle: p.handle || 'toi',
            avatar: p.avatar_url || mockMe.avatar,
            isPro: isProAccount(p.account_type),
            bio: p.bio,
          });
        } else setMe(DEFAULT);
      })
      .catch(() => {});
  };

  useEffect(refresh, [session]);

  return <MeCtx.Provider value={{ me, refresh }}>{children}</MeCtx.Provider>;
}

export const useMe = () => useContext(MeCtx).me;
export const useMeRefresh = () => useContext(MeCtx).refresh;
