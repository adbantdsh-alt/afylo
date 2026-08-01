import { createContext, useContext, useState, type ReactNode } from 'react';

export type RepostMedia = { kind: 'vocal' | 'photo' | 'video'; uri: string; duration?: number };
export type RepostPostSnap = {
  id: string;
  name: string;
  avatar: string;
  caption: string;
  image: string;
  product?: { title: string; price: string; commission?: string };
};
export type Repost = {
  id: string;
  createdAt: number;
  mode: 'simple' | 'quote';
  text?: string;
  media?: RepostMedia | null;
  post: RepostPostSnap;
};

let rid = 0;
function safeNow(): number { try { return Date.now(); } catch { return 0; } }

type Ctx = {
  reposts: Repost[];
  hasReposted: (postId: string) => boolean;
  addRepost: (r: Omit<Repost, 'id' | 'createdAt'>) => void;
  updateRepost: (id: string, patch: Partial<Pick<Repost, 'text' | 'media' | 'mode'>>) => void;
  removeRepost: (id: string) => void;
};
const RepostsCtx = createContext<Ctx | null>(null);

export function RepostsProvider({ children }: { children: ReactNode }) {
  const [reposts, setReposts] = useState<Repost[]>([]);

  const addRepost: Ctx['addRepost'] = (r) => {
    const id = `rp${rid++}`;
    const createdAt = safeNow();
    // Un seul repartage par publication : on remplace s'il existe déjà
    setReposts((prev) => [{ ...r, id, createdAt }, ...prev.filter((x) => x.post.id !== r.post.id)]);
  };
  const updateRepost: Ctx['updateRepost'] = (id, patch) =>
    setReposts((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const removeRepost: Ctx['removeRepost'] = (id) => setReposts((prev) => prev.filter((r) => r.id !== id));
  const hasReposted: Ctx['hasReposted'] = (postId) => reposts.some((r) => r.post.id === postId);

  return (
    <RepostsCtx.Provider value={{ reposts, hasReposted, addRepost, updateRepost, removeRepost }}>
      {children}
    </RepostsCtx.Provider>
  );
}

export function useReposts() {
  const c = useContext(RepostsCtx);
  if (!c) throw new Error('useReposts hors RepostsProvider');
  return c;
}
