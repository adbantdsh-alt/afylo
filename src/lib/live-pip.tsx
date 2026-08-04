import { createContext, useContext, useState, type ReactNode } from 'react';

/** Live minimisé en lecteur flottant (PiP). */
export type PipLive = { name: string; avatar: string; liveId?: string };

type Ctx = {
  pip: PipLive | null;
  openPip: (l: PipLive) => void;
  closePip: () => void;
};

const LivePipContext = createContext<Ctx>({ pip: null, openPip: () => {}, closePip: () => {} });

export const useLivePip = () => useContext(LivePipContext);

/**
 * Snapshot d'une session live (hors React, pour survivre au démontage de l'écran) :
 * quand on réduit un live en PiP, on sauvegarde son état ; en le rouvrant, on le restaure
 * tel quel (commentaires, likes, supporters, PK…) au lieu de repartir de zéro.
 */
export type LiveSnapshot = {
  comments: unknown[];
  likeCount: number;
  supporters: unknown[];
  viewers: number;
  followed: boolean;
};
const snapshots: Record<string, LiveSnapshot> = {};
export const saveLiveSnapshot = (key: string, s: LiveSnapshot) => { snapshots[key] = s; };
export const takeLiveSnapshot = (key: string): LiveSnapshot | undefined => snapshots[key];
export const clearLiveSnapshot = (key: string) => { delete snapshots[key]; };

/** Garde le live actif dans une mini-fenêtre flottante quand on navigue ailleurs dans l'app. */
export function LivePipProvider({ children }: { children: ReactNode }) {
  const [pip, setPip] = useState<PipLive | null>(null);
  return (
    <LivePipContext.Provider value={{ pip, openPip: setPip, closePip: () => setPip(null) }}>
      {children}
    </LivePipContext.Provider>
  );
}
