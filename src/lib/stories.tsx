import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

import { useMe } from '@/lib/me';
import { avatar, face } from '@/lib/mock';

export type StoryItem = { type: 'image' | 'video'; uri: string };
export type StoryProduct = { title: string; price: string };
export type Story = {
  id: string;
  name: string;
  avatar: string;
  items: StoryItem[];
  createdAt: number; // ms
  live?: boolean;
  mine?: boolean;
  seen?: boolean;
  product?: StoryProduct;
};

const STORY_TTL = 10 * 60 * 60 * 1000; // 10 heures

// Démo — créateurs africains (les stories expirent après 10 h)
const now = 0; // stamp relatif ; on considère tout comme récent au démarrage
const seedStories: Story[] = [
  { id: 'st-fatou', name: 'Fatou', avatar: avatar(5), live: true, createdAt: now, items: [{ type: 'image', uri: face('story-fatou', 800, 1400) }] },
  { id: 'st-awa', name: 'Awa', avatar: avatar(9), createdAt: now, items: [{ type: 'image', uri: face('story-awa', 800, 1400) }, { type: 'image', uri: face('story-awa2', 800, 1400) }] },
  { id: 'st-modou', name: 'Modou', avatar: avatar(15), createdAt: now, items: [{ type: 'image', uri: face('story-modou', 800, 1400) }] },
  { id: 'st-sokhna', name: 'Sokhna', avatar: avatar(20), createdAt: now, items: [{ type: 'image', uri: face('story-sokhna', 800, 1400) }] },
  { id: 'st-aida', name: 'Aïda', avatar: avatar(45), live: true, createdAt: now, items: [{ type: 'image', uri: face('story-aida', 800, 1400) }] },
];

type Ctx = {
  stories: Story[];
  myStory: Story | null;
  addStory: (item: StoryItem, product?: StoryProduct) => void;
  markSeen: (id: string) => void;
};
const StoriesCtx = createContext<Ctx | null>(null);

export function StoriesProvider({ children }: { children: ReactNode }) {
  const me = useMe(); // vrai avatar de l'utilisateur connecté
  const [stories, setStories] = useState<Story[]>(seedStories);
  const [tick, setTick] = useState(0); // pour forcer le recalcul d'expiration si besoin

  const addStory: Ctx['addStory'] = (item, product) => {
    const t = safeNow();
    setStories((prev) => {
      const mineIdx = prev.findIndex((s) => s.mine);
      if (mineIdx >= 0) {
        const copy = [...prev];
        copy[mineIdx] = { ...copy[mineIdx], avatar: me.avatar, items: [...copy[mineIdx].items, item], createdAt: t, product: product ?? copy[mineIdx].product };
        return copy;
      }
      return [{ id: 'st-mine', name: 'Ta story', avatar: me.avatar, mine: true, createdAt: t, items: [item], product }, ...prev];
    });
    setTick((x) => x + 1);
  };

  const markSeen: Ctx['markSeen'] = (id) => {
    setStories((prev) => prev.map((s) => (s.id === id ? { ...s, seen: true } : s)));
  };

  // Filtre 10 h (les seeds ont createdAt=0 => toujours visibles en démo)
  const visible = useMemo(() => {
    const t = safeNow();
    return stories.filter((s) => s.createdAt === 0 || t - s.createdAt < STORY_TTL);
  }, [stories, tick]);

  const myStory = visible.find((s) => s.mine) ?? null;

  const value: Ctx = { stories: visible, myStory, addStory, markSeen };
  return <StoriesCtx.Provider value={value}>{children}</StoriesCtx.Provider>;
}

export function useStories() {
  const c = useContext(StoriesCtx);
  if (!c) throw new Error('useStories hors StoriesProvider');
  return c;
}

// Date.now est dispo dans l'app (pas dans les workflows) ; on l'isole ici.
function safeNow(): number {
  try {
    return Date.now();
  } catch {
    return 0;
  }
}
