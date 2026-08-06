import AsyncStorage from '@react-native-async-storage/async-storage';

// Historique de recherche local (récent d'abord, dédupliqué, supprimable).
const KEY = 'afylo.search.history';
const MAX = 12;

export async function getSearchHistory(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export async function addSearchHistory(query: string): Promise<string[]> {
  const term = query.trim();
  const cur = await getSearchHistory();
  if (!term) return cur;
  const next = [term, ...cur.filter((x) => x.toLowerCase() !== term.toLowerCase())].slice(0, MAX);
  try { await AsyncStorage.setItem(KEY, JSON.stringify(next)); } catch {}
  return next;
}

export async function removeSearchHistory(query: string): Promise<string[]> {
  const next = (await getSearchHistory()).filter((x) => x !== query);
  try { await AsyncStorage.setItem(KEY, JSON.stringify(next)); } catch {}
  return next;
}

export async function clearSearchHistory(): Promise<void> {
  try { await AsyncStorage.removeItem(KEY); } catch {}
}
