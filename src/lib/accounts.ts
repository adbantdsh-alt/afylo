/**
 * Multi-comptes façon Instagram : garder plusieurs sessions et basculer
 * de l'une à l'autre SANS se déconnecter.
 *
 * Supabase ne persiste qu'UNE session active. On garde donc à part la liste
 * des comptes connus (avec leurs jetons) ; basculer = setSession(jetons du compte).
 * Les jetons du compte actif sont rafraîchis à chaque évènement d'auth.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Session } from '@supabase/supabase-js';

import { supabase } from './supabase';

export type SavedAccount = {
  id: string;
  handle: string | null;
  name: string | null;
  avatar: string | null;
  access_token: string;
  refresh_token: string;
};

const KEY = 'afylo-accounts';
const LAST_KEY = 'afylo-last-active'; // dernier compte actif (pour détecter une NOUVELLE connexion)

// Intention « ajouter un compte » : autorise un utilisateur connecté à atteindre /login
// (sinon le garde de _layout le renvoie vers l'app). Réinitialisé en quittant /login.
let _adding = false;
export const setAddingAccount = (v: boolean) => { _adding = v; };
export const isAddingAccount = () => _adding;

// Bascule en cours (switchAccount) : supprime le message de confirmation (on change vers un compte déjà lié).
let _switching = false;
export const isSwitching = () => _switching;

export async function listAccounts(): Promise<SavedAccount[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as SavedAccount[]) : [];
  } catch {
    return [];
  }
}

async function saveAll(list: SavedAccount[]) {
  await AsyncStorage.setItem(KEY, JSON.stringify(list));
}

/** Met à jour (ou ajoute) le compte actif avec ses jetons frais. */
export async function upsertTokens(session: Session | null) {
  if (!session?.user?.id) return;
  const list = await listAccounts();
  const idx = list.findIndex((a) => a.id === session.user.id);
  const base: SavedAccount = {
    id: session.user.id,
    handle: null,
    name: null,
    avatar: null,
    access_token: session.access_token,
    refresh_token: session.refresh_token,
  };
  if (idx >= 0) list[idx] = { ...list[idx], access_token: session.access_token, refresh_token: session.refresh_token };
  else list.push(base);
  await saveAll(list);
}

/** Complète le compte avec son profil (nom, @handle, avatar) pour l'affichage. */
export async function setProfileInfo(id: string, info: { handle?: string | null; name?: string | null; avatar?: string | null }) {
  const list = await listAccounts();
  const idx = list.findIndex((a) => a.id === id);
  if (idx < 0) return;
  list[idx] = {
    ...list[idx],
    handle: info.handle ?? list[idx].handle,
    name: info.name ?? list[idx].name,
    avatar: info.avatar ?? list[idx].avatar,
  };
  await saveAll(list);
}

/** Bascule vers un compte enregistré (sans déconnexion). */
export async function switchAccount(id: string): Promise<boolean> {
  const list = await listAccounts();
  const acc = list.find((a) => a.id === id);
  if (!acc) return false;
  _switching = true;
  const { data, error } = await supabase.auth.setSession({ access_token: acc.access_token, refresh_token: acc.refresh_token });
  setTimeout(() => { _switching = false; }, 2500); // laisse passer l'évènement d'auth avant de réarmer le message
  if (error || !data.session) { _switching = false; return false; }
  await upsertTokens(data.session); // jetons potentiellement rafraîchis
  await AsyncStorage.setItem(LAST_KEY, id);
  return true;
}

export async function removeAccount(id: string) {
  const list = (await listAccounts()).filter((a) => a.id !== id);
  await saveAll(list);
}

/** Ne garder QUE ce compte dans l'espace (refus de lier les autres). */
export async function keepOnlyAccount(id: string) {
  const list = (await listAccounts()).filter((a) => a.id === id);
  await saveAll(list);
  await AsyncStorage.setItem(LAST_KEY, id);
}

/**
 * Après une connexion, indique combien d'AUTRES comptes sont déjà dans l'espace,
 * pour proposer de les garder liés — uniquement quand un compte DIFFÉRENT vient de se connecter
 * (pas une simple réouverture de l'app, pas une bascule). Met à jour le « dernier compte actif ».
 */
export async function evaluateNewAccount(currentId: string): Promise<number> {
  const last = await AsyncStorage.getItem(LAST_KEY);
  await AsyncStorage.setItem(LAST_KEY, currentId);
  if (isSwitching()) return 0; // bascule vers un compte déjà lié → pas de question
  if (!last || last === currentId) return 0; // 1ʳᵉ connexion ou réouverture du même compte → rien
  const others = (await listAccounts()).filter((a) => a.id !== currentId);
  return others.length; // >0 → on propose de garder les autres comptes liés
}
