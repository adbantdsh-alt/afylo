/**
 * Notifications & messages (démo). Source unique pour le badge de la cloche
 * et la page notifications catégorisée.
 */
import { avatar } from '@/lib/mock';

export type NotifKind = 'mention' | 'comment' | 'like' | 'rating' | 'follow' | 'sale';
export type Notif = { id: string; kind: NotifKind; avatar: string; text: string; time: string; unread?: boolean };

export const NOTIFS: Notif[] = [
  { id: 'n1', kind: 'sale', avatar: avatar(9), text: 'Awa a acheté ton « Ensemble wax premium » — 18 500 F en séquestre.', time: '5 min', unread: true },
  { id: 'n2', kind: 'follow', avatar: avatar(15), text: 'Modou Beats a commencé à te suivre.', time: '22 min', unread: true },
  { id: 'n3', kind: 'mention', avatar: avatar(20), text: 'Sokhna t\'a mentionné : « regarde ça @toi 🔥 »', time: '40 min', unread: true },
  { id: 'n4', kind: 'like', avatar: avatar(33), text: 'Cheikh et 42 autres ont aimé ta publication.', time: '1 h', unread: true },
  { id: 'n5', kind: 'comment', avatar: avatar(45), text: 'Mariama a commenté : « Trop belle cette tenue 😍 »', time: '3 h' },
  { id: 'n6', kind: 'rating', avatar: avatar(5), text: 'Fatou a noté ta vidéo 9/10 ⭐', time: '3 h', unread: true },
  { id: 'n7', kind: 'sale', avatar: avatar(28), text: 'Ibou a acheté « Sneakers urbaines » — 25 000 F.', time: '5 h' },
  { id: 'n8', kind: 'follow', avatar: avatar(12), text: 'Aïda et 8 autres ont commencé à te suivre.', time: '6 h', unread: true },
  { id: 'n9', kind: 'comment', avatar: avatar(3), text: 'Ousmane a répondu à ton commentaire.', time: '8 h' },
  { id: 'n10', kind: 'mention', avatar: avatar(50), text: 'Khady t\'a identifié dans une story.', time: '10 h' },
  { id: 'n11', kind: 'like', avatar: avatar(41), text: 'Serigne a aimé ton repartage.', time: '12 h' },
  { id: 'n12', kind: 'sale', avatar: avatar(19), text: 'Commission d\'affiliation : +2 775 F (Coffret soin visage).', time: '1 j' },
  { id: 'n13', kind: 'rating', avatar: avatar(37), text: 'Bineta a réagi 🔥 à ta vidéo.', time: '1 j' },
  { id: 'n14', kind: 'follow', avatar: avatar(24), text: 'Lamine a commencé à te suivre.', time: '2 j' },
];

export type Conversation = { id: string; name: string; avatar: string; last: string; time: string; unread: number; online?: boolean };

export const CONVERSATIONS: Conversation[] = [
  { id: 'c1', name: 'Awa Cosmetics', avatar: avatar(9), last: 'Le coffret est dispo ?', time: '2 min', unread: 2, online: true },
  { id: 'c2', name: 'Modou Beats', avatar: avatar(15), last: 'Merci pour la commande 🙏', time: '1 h', unread: 0, online: true },
  { id: 'c3', name: 'Sokhna Créations', avatar: avatar(20), last: 'Livraison demain à Dakar', time: '3 h', unread: 0, online: false },
  { id: 'c4', name: 'Cheikh Tech', avatar: avatar(33), last: 'Tu as vu mon live hier ?', time: '1 j', unread: 1, online: false },
  { id: 'c5', name: 'Mariama Cuisine', avatar: avatar(45), last: 'Je te réserve le lot 👌', time: '2 j', unread: 0, online: false },
];

export const notifUnread = NOTIFS.filter((n) => n.unread).length;
export const msgUnread = CONVERSATIONS.reduce((s, c) => s + (c.unread || 0), 0);
export const totalUnread = notifUnread + msgUnread;

/** « 5 », « 99 », ou « 99+ » au-delà. */
export const badgeText = (n: number) => (n > 99 ? '99+' : String(n));
