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

/** Estime la commission gagnée pour une vente (commission % × prix). */
function commissionFor(price: string, pct: string): number {
  const p = parseInt(price.replace(/\D/g, ''), 10) || 0;
  const c = parseInt(pct.replace(/\D/g, ''), 10) || 0;
  return Math.round((p * c) / 100);
}

type Ctx = {
  reposts: Repost[];
  hasReposted: (postId: string) => boolean;
  addRepost: (r: Omit<Repost, 'id' | 'createdAt' | 'affiliate'>) => void;
  updateRepost: (id: string, patch: Partial<Pick<Repost, 'text' | 'media' | 'mode'>>) => void;
  removeRepost: (id: string) => void;
  /** Simule une vente réalisée via le lien d'affiliation d'un repartage. */
  registerSale: (repostId: string) => void;
};
const RepostsCtx = createContext<Ctx | null>(null);

export function RepostsProvider({ children }: { children: ReactNode }) {
  const [reposts, setReposts] = useState<Repost[]>([]);

  const addRepost: Ctx['addRepost'] = (r) => {
    const id = `rp${rid++}`;
    const createdAt = safeNow();
    // Création automatique du lien d'affiliation au nom du republieur (si produit affilié)
    const commission = r.post.product?.commission;
    const code = `${slug(r.by)}-${r.post.id}`;
    const affiliate: RepostAffiliate | undefined = commission
      ? { code, link: `afylo.shop/r/${code}`, commission, sales: 0, earned: 0 }
      : undefined;
    // Un seul repartage par publication : on remplace s'il existe déjà
    setReposts((prev) => [{ ...r, id, createdAt, affiliate }, ...prev.filter((x) => x.post.id !== r.post.id)]);
  };

  const registerSale: Ctx['registerSale'] = (repostId) =>
    setReposts((prev) =>
      prev.map((r) => {
        if (r.id !== repostId || !r.affiliate || !r.post.product) return r;
        const gain = commissionFor(r.post.product.price, r.affiliate.commission);
        return { ...r, affiliate: { ...r.affiliate, sales: r.affiliate.sales + 1, earned: r.affiliate.earned + gain } };
      }),
    );
  const updateRepost: Ctx['updateRepost'] = (id, patch) =>
    setReposts((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const removeRepost: Ctx['removeRepost'] = (id) => setReposts((prev) => prev.filter((r) => r.id !== id));
  const hasReposted: Ctx['hasReposted'] = (postId) => reposts.some((r) => r.post.id === postId);

  return (
    <RepostsCtx.Provider value={{ reposts, hasReposted, addRepost, updateRepost, removeRepost, registerSale }}>
      {children}
    </RepostsCtx.Provider>
  );
}

export function useReposts() {
  const c = useContext(RepostsCtx);
  if (!c) throw new Error('useReposts hors RepostsProvider');
  return c;
}
