/**
 * Buzz — la "couronne" du contenu le plus viral (post + live) à un instant T.
 * Chargée une fois au niveau app et rafraîchie régulièrement : dès qu'un autre
 * contenu dépasse, la couronne change. Exposé partout via useBuzz().
 */
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import { getBuzzLeaders } from '@/lib/db';

type Buzz = { postId: string | null; liveId: string | null };
const BuzzCtx = createContext<Buzz>({ postId: null, liveId: null });

export function BuzzProvider({ children }: { children: ReactNode }) {
  const [buzz, setBuzz] = useState<Buzz>({ postId: null, liveId: null });

  useEffect(() => {
    let cancel = false;
    const tick = () => getBuzzLeaders().then((b) => { if (!cancel) setBuzz({ postId: b.postId, liveId: b.liveId }); }).catch(() => {});
    tick();
    const t = setInterval(tick, 45000); // la couronne peut changer de main
    return () => { cancel = true; clearInterval(t); };
  }, []);

  return <BuzzCtx.Provider value={buzz}>{children}</BuzzCtx.Provider>;
}

export const useBuzz = () => useContext(BuzzCtx);
/** true si cet id (post ou live) porte actuellement la couronne Buzz. */
export const useIsBuzz = (id?: string | null) => {
  const b = useContext(BuzzCtx);
  return !!id && (id === b.postId || id === b.liveId);
};
