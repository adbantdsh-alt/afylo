/**
 * Données de démonstration (mock) — remplacées plus tard par Supabase.
 * Images via services de placeholder (pravatar / picsum).
 */

export const avatar = (n: number) => `https://i.pravatar.cc/200?img=${n}`;
export const photo = (seed: string, w = 600, h = 800) =>
  `https://picsum.photos/seed/${seed}/${w}/${h}`;

export const me = {
  name: 'Toi',
  handle: '@toi',
  avatar: avatar(12),
};

export type Live = {
  id: string;
  name: string;
  avatar: string;
  live?: boolean;
  viewers?: string;
};

export const lives: Live[] = [
  { id: 'l1', name: 'Fatou', avatar: avatar(5), live: true, viewers: '1.2k' },
  { id: 'l2', name: 'Awa', avatar: avatar(9), live: true, viewers: '340' },
  { id: 'l3', name: 'Modou', avatar: avatar(15), live: true, viewers: '89' },
  { id: 'l4', name: 'Sokhna', avatar: avatar(20), live: false },
  { id: 'l5', name: 'Cheikh', avatar: avatar(33), live: false },
  { id: 'l6', name: 'Aida', avatar: avatar(45), live: true, viewers: '2.1k' },
];

export type Product = { title: string; price: string; commission?: string };

export type Post = {
  id: string;
  name: string;
  handle: string;
  avatar: string;
  badge?: 'créateur' | 'boutique';
  time: string;
  image: string;
  likes: string;
  comments: string;
  views: string;
  shares: string;
  caption: string;
  product?: Product;
};

export const posts: Post[] = [
  {
    id: 'p1',
    name: 'Fatou Ndiaye',
    handle: '@fatou.style',
    avatar: avatar(5),
    badge: 'créateur',
    time: 'il y a 45 min',
    image: photo('afylo-look', 700, 800),
    likes: '7.2k',
    comments: '300',
    views: '69k',
    shares: '87',
    caption: 'Mon nouveau look de la semaine 🔥 Dispo en live ce soir 20h !',
    product: { title: 'Ensemble wax premium', price: '18 500 FCFA', commission: '15%' },
  },
  {
    id: 'p2',
    name: 'Awa Cosmetics',
    handle: '@awa.beauty',
    avatar: avatar(9),
    badge: 'boutique',
    time: 'il y a 2 h',
    image: photo('afylo-beauty', 700, 800),
    likes: '4.1k',
    comments: '210',
    views: '33k',
    shares: '54',
    caption: 'Routine peau glow ✨ Testée et approuvée. Livraison Dakar 24h.',
    product: { title: 'Coffret soin visage', price: '12 000 FCFA', commission: '20%' },
  },
  {
    id: 'p3',
    name: 'Modou Beats',
    handle: '@modou.beats',
    avatar: avatar(15),
    badge: 'créateur',
    time: 'il y a 5 h',
    image: photo('afylo-music', 700, 800),
    likes: '9.8k',
    comments: '640',
    views: '112k',
    shares: '230',
    caption: 'Nouveau son 🎧 Qui veut le beatpack complet ?',
    product: { title: 'Beatpack Afro 2026', price: '9 900 FCFA', commission: '30%' },
  },
];

export type ExploreItem = {
  id: string;
  name: string;
  label: string;
  image: string;
  tall?: boolean;
  live?: boolean;
};

export const exploreItems: ExploreItem[] = [
  { id: 'e1', name: 'Danielle', label: 'Créatrice', image: photo('afx1', 500, 700), tall: true, live: true },
  { id: 'e2', name: 'Jiwoo', label: 'Mode', image: photo('afx2', 500, 500) },
  { id: 'e3', name: 'Aïcha', label: 'Beauté', image: photo('afx3', 500, 640) },
  { id: 'e4', name: 'Ibou', label: 'Tech', image: photo('afx4', 500, 560), tall: true },
  { id: 'e5', name: 'Mariama', label: 'Cuisine', image: photo('afx5', 500, 500), live: true },
  { id: 'e6', name: 'Serigne', label: 'Sport', image: photo('afx6', 500, 680) },
];

// ---- Profil (propriétaire connecté) ----
export const myProfile = {
  name: 'Fatou Ndiaye',
  handle: '@fatou.style',
  avatar: avatar(5),
  bio: 'Mode & lifestyle 🇸🇳 · Lives tous les soirs 20h · Livraison partout au Sénégal',
  followers: '128k',
  following: '312',
  sales: '342',
  views: '1.2M',
  earnings: '2 340 000',
};

export const myPosts = Array.from({ length: 12 }, (_, i) => ({
  id: `mp${i}`,
  image: photo(`myp${i}`, 300, 400),
  views: `${(i * 7 + 4)}k`,
  video: i % 3 === 0,
}));

export type MyProduct = {
  id: string;
  title: string;
  price: string;
  stock: number;
  sold: number;
  image: string;
  active: boolean;
};

export const myProducts: MyProduct[] = [
  { id: 'mpr1', title: 'Ensemble wax premium', price: '18 500', stock: 24, sold: 87, image: photo('mypr1', 400, 400), active: true },
  { id: 'mpr2', title: 'Boubou brodé main', price: '35 000', stock: 8, sold: 41, image: photo('mypr2', 400, 400), active: true },
  { id: 'mpr3', title: 'Foulard soie', price: '6 500', stock: 0, sold: 120, image: photo('mypr3', 400, 400), active: false },
  { id: 'mpr4', title: 'Sac raphia', price: '14 000', stock: 15, sold: 33, image: photo('mypr4', 400, 400), active: true },
];

export type MyLive = {
  id: string;
  title: string;
  date: string;
  duration: string;
  viewers: string;
  revenue: string;
  thumb: string;
};

export const myLives: MyLive[] = [
  { id: 'ml1', title: 'Nouvelle collection wax 🔥', date: '28 juil.', duration: '48 min', viewers: '2.1k', revenue: '145 000', thumb: photo('myl1', 400, 300) },
  { id: 'ml2', title: 'Déstockage foulards', date: '25 juil.', duration: '32 min', viewers: '980', revenue: '62 000', thumb: photo('myl2', 400, 300) },
  { id: 'ml3', title: 'Q&A + essayage boubous', date: '21 juil.', duration: '55 min', viewers: '1.5k', revenue: '210 000', thumb: photo('myl3', 400, 300) },
];

// ---- Studio / Statistiques ----
export const studioKpis = {
  views7d: '184 200',
  viewsTrend: '+22%',
  sales7d: '38',
  salesTrend: '+12%',
  revenue7d: '417 000',
  revenueTrend: '+18%',
  followers7d: '+2 340',
};

// Vues par jour (7 derniers jours) pour un mini graphe
export const studioDays = [
  { d: 'Lun', views: 18, revenue: 42 },
  { d: 'Mar', views: 24, revenue: 55 },
  { d: 'Mer', views: 31, revenue: 61 },
  { d: 'Jeu', views: 22, revenue: 48 },
  { d: 'Ven', views: 40, revenue: 78 },
  { d: 'Sam', views: 52, revenue: 96 },
  { d: 'Dim', views: 45, revenue: 84 },
];

export const studioTopPosts = [
  { id: 't1', image: photo('myp1', 200, 200), views: '112k', sales: 18, viral: 94 },
  { id: 't2', image: photo('myp4', 200, 200), views: '69k', sales: 11, viral: 81 },
  { id: 't3', image: photo('myp7', 200, 200), views: '58k', sales: 7, viral: 73 },
];

export const shopProducts = [
  { id: 's1', title: 'Ensemble wax', price: '18 500', commission: '15%', image: photo('afs1', 400, 400), seller: 'Fatou Style' },
  { id: 's2', title: 'Coffret soin', price: '12 000', commission: '20%', image: photo('afs2', 400, 400), seller: 'Awa Beauty' },
  { id: 's3', title: 'Sneakers urbaines', price: '25 000', commission: '12%', image: photo('afs3', 400, 400), seller: 'Modou Shop' },
  { id: 's4', title: 'Sac cuir artisanal', price: '32 000', commission: '18%', image: photo('afs4', 400, 400), seller: 'Sokhna Créations' },
];
