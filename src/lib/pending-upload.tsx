/**
 * Publication en arrière-plan avec barre de progression.
 * L'utilisateur appuie sur « Publier » → on revient tout de suite à l'accueil,
 * l'upload des médias se fait en tâche de fond et une barre montre l'avancement.
 * Quand c'est fini, le post est créé et le feed se recharge (feedVersion++).
 */
import { createContext, useCallback, useContext, useRef, useState } from 'react';

import { createPost } from './db';
import { uploadToStorage } from './upload';

export type PendingMedia = { uri: string; type: 'image' | 'video' };

export type PublishArgs = {
  media: PendingMedia[];
  caption?: string;
  aspect_ratio?: number | null;
  productIds?: string[];
};

export type PendingState = {
  thumb: string;
  count: number;
  progress: number; // 0 → 1
  status: 'uploading' | 'error';
  error?: string;
};

type Ctx = {
  pending: PendingState | null;
  feedVersion: number;
  publish: (a: PublishArgs) => void;
  retry: () => void;
  dismiss: () => void;
};

const PendingUploadCtx = createContext<Ctx>({
  pending: null,
  feedVersion: 0,
  publish: () => {},
  retry: () => {},
  dismiss: () => {},
});

export function PendingUploadProvider({ children }: { children: React.ReactNode }) {
  const [pending, setPending] = useState<PendingState | null>(null);
  const [feedVersion, setFeedVersion] = useState(0);
  const lastArgs = useRef<PublishArgs | null>(null);

  const run = useCallback(async (args: PublishArgs) => {
    lastArgs.current = args;
    const total = Math.max(1, args.media.length);
    setPending({ thumb: args.media[0]?.uri ?? '', count: args.media.length, progress: 0, status: 'uploading' });
    try {
      const urls: string[] = [];
      let hasVideo = false;
      for (let i = 0; i < args.media.length; i++) {
        const m = args.media[i];
        if (m.type === 'video') hasVideo = true;
        const url = await uploadToStorage('media', m.uri, (frac) => {
          setPending((cur) => (cur ? { ...cur, progress: (i + frac) / total } : cur));
        });
        urls.push(url);
      }
      await createPost({
        kind: hasVideo && args.media[0]?.type === 'video' ? 'video' : 'image',
        caption: args.caption,
        media_url: urls[0],
        media_urls: urls,
        aspect_ratio: args.aspect_ratio ?? null,
        productIds: args.productIds,
      });
      setPending(null);
      setFeedVersion((v) => v + 1);
    } catch (e: any) {
      setPending((cur) => (cur ? { ...cur, status: 'error', error: e?.message ?? 'Échec de la publication.' } : cur));
    }
  }, []);

  const publish = useCallback((a: PublishArgs) => { void run(a); }, [run]);
  const retry = useCallback(() => { if (lastArgs.current) void run(lastArgs.current); }, [run]);
  const dismiss = useCallback(() => setPending(null), []);

  return (
    <PendingUploadCtx.Provider value={{ pending, feedVersion, publish, retry, dismiss }}>
      {children}
    </PendingUploadCtx.Provider>
  );
}

export const usePendingUpload = () => useContext(PendingUploadCtx);
