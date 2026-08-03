/**
 * Enregistrement vidéo « snap » sur le WEB.
 * expo-camera ne sait pas filmer sur navigateur (recordAsync est natif only),
 * alors on enregistre nous-mêmes le flux MediaStream de la caméra via MediaRecorder.
 * (Sur mobile on utilise camRef.recordAsync — ce fichier n'est jamais appelé là-bas.)
 */

let mediaRecorder: MediaRecorder | null = null;
let chunks: Blob[] = [];

/** Récupère le flux caméra affiché par expo-camera (son <video> a le MediaStream en srcObject). */
function getCameraStream(): MediaStream | null {
  if (typeof document === 'undefined') return null;
  const videos = Array.from(document.querySelectorAll('video')) as HTMLVideoElement[];
  for (const v of videos) {
    const s = v.srcObject as MediaStream | null;
    if (s && typeof s.getVideoTracks === 'function' && s.getVideoTracks().length > 0) return s;
  }
  return null;
}

export function canWebRecord(): boolean {
  return typeof MediaRecorder !== 'undefined' && !!getCameraStream();
}

/** Démarre l'enregistrement. Renvoie false si aucun flux caméra (→ repli galerie). */
export function startWebRecording(): boolean {
  const stream = getCameraStream();
  if (!stream || typeof MediaRecorder === 'undefined') return false;
  chunks = [];
  const prefer = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm', 'video/mp4'];
  const mimeType = prefer.find((m) => {
    try { return MediaRecorder.isTypeSupported(m); } catch { return false; }
  });
  try {
    mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
  } catch {
    return false;
  }
  mediaRecorder.ondataavailable = (e) => { if (e.data && e.data.size > 0) chunks.push(e.data); };
  mediaRecorder.start();
  return true;
}

export function isWebRecording(): boolean {
  return !!mediaRecorder && mediaRecorder.state === 'recording';
}

/** Stoppe et renvoie une URL blob lisible (ou null). */
export function stopWebRecording(): Promise<string | null> {
  return new Promise((resolve) => {
    const mr = mediaRecorder;
    if (!mr || mr.state === 'inactive') { mediaRecorder = null; return resolve(null); }
    mr.onstop = () => {
      const type = chunks[0]?.type || 'video/webm';
      const blob = new Blob(chunks, { type });
      chunks = [];
      mediaRecorder = null;
      resolve(blob.size > 0 ? URL.createObjectURL(blob) : null);
    };
    try { mr.stop(); } catch { mediaRecorder = null; resolve(null); }
  });
}
