/**
 * Moteur de rémunération Afryko — calcule le portefeuille RÉEL d'un créateur
 * à partir des commandes (`orders`), des commissions d'affiliation et des
 * Creator Rewards. Aucune donnée fictive : un nouveau compte démarre à ZÉRO.
 *
 * Flux d'argent :
 *  - Vente produit : le vendeur touche  montant − commission revendeur − frais Afryko (5 %).
 *  - Affiliation   : le revendeur touche la commission du produit sur les ventes qu'il a générées.
 *  - Rewards       : 100 FCFA / 1 000 vues qualifiées (barème dans algo.ts).
 *  - Séquestre     : l'argent d'une commande payée est bloqué jusqu'à livraison,
 *                    puis « libéré » (disponible au retrait).
 */
import { viewsEarning } from './algo';
import { getMyReachStats, listMyOrders } from './db';
import type { Order, OrderStatus } from '@/types/db';

export type WalletTx = {
  id: string;
  kind: 'sale' | 'tip' | 'affiliation' | 'payout' | 'escrow';
  label: string;
  sub: string;
  amount: number;
  date: string;
};

export type WalletSummary = {
  available: number; // net libéré, retirable
  pending: number; // en séquestre (payé, pas encore livré/libéré)
  currency: string;
  salesNet: number; // ventes libérées (net vendeur)
  affiliationNet: number; // commissions revendeur libérées
  rewardsNet: number; // Creator Rewards (vues qualifiées)
  feeTotal: number; // total prélevé par Afryko (5 %)
  breakdown: { label: string; value: number; dim?: boolean }[];
  transactions: WalletTx[];
  reach: { followers: number; posts: number; views: number; sales: number };
  topPosts: { id: string; thumbnail_url: string | null; media_url: string | null; view_count: number }[];
};

const RELEASED: OrderStatus[] = ['delivered', 'released'];
const ESCROW: OrderStatus[] = ['paid', 'shipped'];

/** Net qui revient au vendeur sur une commande (après commission affilié + frais Afryko). */
const sellerNet = (o: Order) => Math.max(0, (o.amount_cfa || 0) - (o.commission_cfa || 0) - (o.platform_fee_cfa || 0));

function timeAgo(iso: string): string {
  const t = new Date(iso).getTime();
  const s = Math.floor((Date.now() - t) / 1000);
  if (s < 60) return "à l'instant";
  const m = Math.floor(s / 60);
  if (m < 60) return `il y a ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `il y a ${h} h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `il y a ${d} j`;
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

export const EMPTY_WALLET: WalletSummary = {
  available: 0,
  pending: 0,
  currency: 'FCFA',
  salesNet: 0,
  affiliationNet: 0,
  rewardsNet: 0,
  feeTotal: 0,
  breakdown: [],
  transactions: [],
  reach: { followers: 0, posts: 0, views: 0, sales: 0 },
  topPosts: [],
};

/**
 * Construit le portefeuille réel de l'utilisateur connecté.
 * @param myId          l'id du compte connecté (pour distinguer ventes / affiliation)
 * @param affiliateExtra commissions d'affiliation « optimistes » côté client (repartages Pro non encore persistés)
 */
export async function getWalletSummary(myId: string | null, affiliateExtra = 0): Promise<WalletSummary> {
  if (!myId) return EMPTY_WALLET;
  const [orders, reach] = await Promise.all([listMyOrders(), getMyReachStats()]);

  let salesAvail = 0;
  let salesPend = 0;
  let affAvail = 0;
  let affPend = 0;
  let feeTotal = 0;
  let salesCount = 0;
  const txs: WalletTx[] = [];

  for (const o of orders) {
    const released = RELEASED.includes(o.status);
    const escrow = ESCROW.includes(o.status);

    if (o.seller_id === myId) {
      const net = sellerNet(o);
      feeTotal += o.platform_fee_cfa || 0;
      if (released) {
        salesAvail += net;
        salesCount += 1;
        txs.push({ id: `o-${o.id}`, kind: 'sale', label: 'Vente produit', sub: 'livré · libéré', amount: net, date: timeAgo(o.created_at) });
      } else if (escrow) {
        salesPend += net;
        txs.push({ id: `e-${o.id}`, kind: 'escrow', label: 'Séquestre vente', sub: 'en attente de livraison', amount: net, date: timeAgo(o.created_at) });
      }
    }

    if (o.reseller_id === myId) {
      const c = o.commission_cfa || 0;
      if (released) {
        affAvail += c;
        txs.push({ id: `a-${o.id}`, kind: 'affiliation', label: 'Commission affiliation', sub: 'vente revendue', amount: c, date: timeAgo(o.created_at) });
      } else if (escrow) {
        affPend += c;
      }
    }
  }

  const rewardsNet = viewsEarning(reach.views);
  const affiliationNet = affAvail + Math.max(0, affiliateExtra);
  const available = salesAvail + affiliationNet + rewardsNet;
  const pending = salesPend + affPend;

  const breakdown: WalletSummary['breakdown'] = [];
  if (salesAvail > 0) breakdown.push({ label: 'Ventes produits', value: salesAvail });
  if (affiliationNet > 0) breakdown.push({ label: 'Commissions affiliation', value: affiliationNet });
  if (rewardsNet > 0) breakdown.push({ label: 'Creator Rewards (vues)', value: rewardsNet });
  if (feeTotal > 0) breakdown.push({ label: 'Commission Afryko (5 %)', value: -feeTotal, dim: true });

  if (rewardsNet > 0) {
    txs.unshift({ id: 'rw', kind: 'tip', label: 'Creator Rewards · vues', sub: `${reach.views.toLocaleString('fr-FR')} vues`, amount: rewardsNet, date: 'ce mois' });
  }

  return {
    available,
    pending,
    currency: 'FCFA',
    salesNet: salesAvail,
    affiliationNet,
    rewardsNet,
    feeTotal,
    breakdown,
    transactions: txs,
    reach: { followers: reach.followers, posts: reach.posts, views: reach.views, sales: salesCount },
    topPosts: reach.topPosts,
  };
}
