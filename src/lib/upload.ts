/**
 * Upload direct vers Supabase Storage avec suivi de progression (XHR).
 * Le client @supabase/storage-js n'expose pas la progression : on passe donc
 * par l'endpoint REST du Storage avec XMLHttpRequest (upload.onprogress).
 */
import { Platform } from 'react-native';

import { supabase, SUPABASE_ANON_KEY, SUPABASE_URL } from './supabase';

export type UploadBucket = 'avatars' | 'products' | 'media';

const extFor = (type: string, uri: string) => {
  if (type.includes('png')) return 'png';
  if (type.includes('webp')) return 'webp';
  if (type.includes('gif')) return 'gif';
  if (type.includes('quicktime') || type.includes('mov')) return 'mov';
  if (type.includes('mp4') || type.includes('video')) return 'mp4';
  const m = uri.split('?')[0].match(/\.(\w{2,5})$/);
  if (m) return m[1].toLowerCase();
  return type.startsWith('video') ? 'mp4' : 'jpg';
};

const guessType = (uri: string) => {
  const m = uri.split('?')[0].match(/\.(\w{2,5})$/);
  const e = m ? m[1].toLowerCase() : '';
  if (e === 'png') return 'image/png';
  if (e === 'webp') return 'image/webp';
  if (e === 'gif') return 'image/gif';
  if (e === 'mp4') return 'video/mp4';
  if (e === 'mov') return 'video/quicktime';
  return 'application/octet-stream';
};

/**
 * Envoie un média local (uri http/blob/file) et renvoie son URL publique.
 * onProgress reçoit une fraction 0→1.
 */
export async function uploadToStorage(
  bucket: UploadBucket,
  uri: string,
  onProgress?: (fraction: number) => void,
): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const userId = data.session?.user?.id;
  if (!token || !userId) throw new Error('Session requise pour publier.');

  // Récupère le binaire (fonctionne pour blob:, file:, http(s):)
  const resp = await fetch(uri);
  const blob = await resp.blob();
  const contentType = blob.type || resp.headers.get('content-type') || guessType(uri);
  const ext = extFor(contentType, uri);
  const path = `${userId}/${Date.now()}-${Math.round(Math.random() * 1e9)}.${ext}`;
  const endpoint = `${SUPABASE_URL}/storage/v1/object/${bucket}/${path}`;

  // Corps : Blob sur web, objet fichier pour React Native.
  const body: any =
    Platform.OS === 'web'
      ? blob
      : ({ uri, name: path.split('/').pop(), type: contentType } as any);

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', endpoint);
    xhr.setRequestHeader('apikey', SUPABASE_ANON_KEY);
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.setRequestHeader('x-upsert', 'true');
    xhr.setRequestHeader('Content-Type', contentType);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress(e.loaded / e.total);
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) { onProgress?.(1); resolve(); }
      else reject(new Error(`Upload échoué (${xhr.status}) ${xhr.responseText?.slice(0, 120)}`));
    };
    xhr.onerror = () => reject(new Error('Erreur réseau pendant l’upload.'));
    xhr.send(body);
  });

  return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`;
}
