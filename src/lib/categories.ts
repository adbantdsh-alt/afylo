/** Catégories produits (marketplace / affiliation). */
export const PRODUCT_CATEGORIES: { key: string; label: string; icon: string }[] = [
  { key: 'mode', label: 'Mode', icon: 'shirt-outline' },
  { key: 'beaute', label: 'Beauté', icon: 'sparkles-outline' },
  { key: 'tech', label: 'Tech', icon: 'hardware-chip-outline' },
  { key: 'maison', label: 'Maison', icon: 'home-outline' },
  { key: 'alimentation', label: 'Alimentation', icon: 'fast-food-outline' },
  { key: 'digital', label: 'Digital', icon: 'cloud-download-outline' },
  { key: 'sport', label: 'Sport', icon: 'barbell-outline' },
  { key: 'enfants', label: 'Enfants', icon: 'happy-outline' },
  { key: 'divertissement', label: 'Loisirs', icon: 'game-controller-outline' },
  { key: 'autre', label: 'Autre', icon: 'pricetag-outline' },
];

export const categoryLabel = (key?: string | null) => PRODUCT_CATEGORIES.find((c) => c.key === key)?.label ?? 'Autre';
