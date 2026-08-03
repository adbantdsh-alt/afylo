import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import { useAuth } from '@/lib/auth';
import { createRepostDB, deleteRepostDB, listMyReposts, updateRepostDB, type RepostRow } from '@/lib/db';

export type RepostMedia = { kind: 'vocal' | 'photo' | 'video'; uri: string; duration?: number };
export type RepostPostSnap = {
  id: string;
  name: string;
  avatar: string;
  caption: string;
  image: string;
  product?: { title: string; price: string; commission?: string };
};
/** Lien d'affiliation créé automatiquement au nom du republieur : toute vente via ce lien lui verse sa commission. */
export type RepostAffiliate = { code: string; link: string; commission: string; sales: number; earned: number };
export type Repost = {
  id: string;
  createdAt: number;
  mode: 'simple' | 'quote';
  text?: string;
  media?: RepostMedia | null;
  by: string; // handle du republieur (propriétaire du lien d'affiliation)
  affiliate?: RepostAffiliate; // présent si le produit est en affiliation
  post: RepostPostSnap;
};

let rid = 0;
function safeNow(): number { try { return Date.now(); } catch { return 0; } }
const slug = (s: string) => s.replace(/^@/, '').replace(/[^a-z0-9]/gi, '').toLowerCase() || 'moi';
const hashCode = (s: string) => s.split('').reduce((a, c) => a + c.charCodeAt(0), 0);

/** Commission gagnée pour une vente (commission % × prix). */
function commissionFor(price: string, pct: string): number {
  const p = parseInt(price.replace(/\D/g, ''), 10) || 0;
  const c = parseInt(pct.replace(/\D/g, ''), 10) || 0;
  return Math.round((p * c) / 100);
}

type Ctx = {
  reposts: Repost[];
  hasReposted: (postId: string) => boolean;
  addRepost: (r: Omit<Repost, 'id' | 'createdAt' | 'affiliate'> & { pro?: boolean }) => void;
  updateRepost: (id: string, patch: Partial<Pick<Repost, 'text' | 'media' | 'mode'>>) => void;
  removeRepost: (id: string) => void;
};
const RepostsCtx = createContext<Ctx | null>(null);

/** Ligne DB → Repost affichable. */
export function rowToRepost(row: RepostRow): Repost {
  const pl = row.payload ?? {};
  return {
    id: row.id,
    createdAt: new Date(row.created_at).getTime() || 0,
    mode: pl.mode ?? 'simple',
    text: pl.text ?? undefined,
    media: pl.media ?? undefined,
    by: pl.by ?? '',
    affiliate: pl.affiliate ?? undefined,
    post: pl.post,
  };
}

export function RepostsProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const [reposts, setReposts] = useState<Repost[]>([]);

  // Charge MES reposts depuis la base (publics, persistés)
  useEffect(() => {
    if (!session) { setReposts([]); return; }
    listMyReposts().then((rows) => setReposts(rows.map(rowToRepost))).catch(() => {});
  }, [session]);

  const payloadOf = (r: Repost) => ({ mode: r.mode, text: r.text, media: r.media, by: r.by, post: r.post, affiliate: r.affiliate });

  const addRepost: Ctx['addRepost'] = ({ pro, ...r }) => {
    // Lien d'affiliation créé automatiquement au nom du republieur (produit affilié + Pro)
    const commission = r.post.product?.commission;
    const code = `${slug(r.by)}-${r.post.id}`;
    let affiliate: RepostAffiliate | undefined;
    if (commission && r.post.product && pro) {
      const sales = 1 + (hashCode(r.post.id) % 3);
      const earned = commissionFor(r.post.product.price, commission) * sales;
      affiliate = { code, link: `afylo.shop/r/${code}`, commission, sales, earned };
    }
    const tempId = `rp${rid++}`;
    const optimistic: Repost = { ...r, id: tempId, createdAt: safeNow(), affiliate };
    // 1 repartage par publication : on remplace s'il existe
    setReposts((prev) => [optimistic, ...prev.filter((x) => x.post.id !== r.post.id)]);
    // Persistance (public)
    createRepostDB(r.post.id, payloadOf(optimistic))
      .then((row) => { if (row) setReposts((prev) => prev.map((x) => (x.id === tempId ? rowToRepost(row) : x))); })
      .catch(() => {});
  };

  const updateRepost: Ctx['updateRepost'] = (id, patch) => {
    setReposts((prev) => {
      const next = prev.map((r) => (r.id === id ? { ...r, ...patch } : r));
      const updated = next.find((x) => x.id === id);
      if (updated && !id.startsWith('rp')) updateRepostDB(id, payloadOf(updated)).catch(() => {});
      return next;
    });
  };

  const removeRepost: Ctx['removeRepost'] = (id) => {
    setReposts((prev) => prev.filter((r) => r.id !== id));
    if (!id.startsWith('rp')) deleteRepostDB(id).catch(() => {});
  };

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
