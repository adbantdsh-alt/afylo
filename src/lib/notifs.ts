/**
 * Helpers d'affichage des notifications/messages.
 * (Les données réelles viennent de Supabase : voir db.ts — listNotifications,
 * unreadNotifCount, listConversations. Aucun mock ici.)
 */

/** Formate un compteur de badge : « 5 », « 99 », ou « 99+ » au-delà. */
export const badgeText = (n: number) => (n > 99 ? '99+' : String(n));
