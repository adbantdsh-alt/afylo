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

/** Garde le live actif dans une mini-fenêtre flottante quand on navigue ailleurs dans l'app. */
export function LivePipProvider({ children }: { children: ReactNode }) {
  const [pip, setPip] = useState<PipLive | null>(null);
  return (
    <LivePipContext.Provider value={{ pip, openPip: setPip, closePip: () => setPip(null) }}>
      {children}
    </LivePipContext.Provider>
  );
}
