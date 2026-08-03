/**
 * Enregistrement vidéo « snap » sur le WEB.
 * expo-camera ne sait pas filmer sur navigateur (recordAsync est natif only),
 * alors on enregistre nous-mêmes le flux MediaStream de la caméra via MediaRecorder.
 * (Sur mobile on utilise camRef.recordAsync — ce fichier n'est jamais appelé là-bas.)
 */

let mediaRecorder: MediaRecorder | null = null;
let chunks: Blob[] = [];

/** Le <video> d'expo-camera (celui qui porte le MediaStream de la caméra). */
function getCameraVideoEl(): HTMLVideoElement | null {
  if (typeof document === 'undefined') return null;
  const videos = Array.from(document.querySelectorAll('video')) as HTMLVideoElement[];
  for (const v of videos) {
    const s = v.srcObject as MediaStream | null;
    if (s && typeof s.getVideoTracks === 'function' && s.getVideoTracks().length > 0) return v;
  }
  return null;
}

/** Récupère le flux caméra affiché par expo-camera. */
function getCameraStream(): MediaStream | null {
  return (getCameraVideoEl()?.srcObject as MediaStream | null) ?? null;
}

/**
/** Dessine la frame vidéo dans un canvas, éventuellement retournée horizontalement. */
function drawFrame(v: HTMLVideoElement, mirror: boolean): HTMLCanvasElement | null {
  const canvas = document.createElement('canvas');
  canvas.width = v.videoWidth;
  canvas.height = v.videoHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  if (mirror) { ctx.translate(canvas.width, 0); ctx.scale(-1, 1); } // retourne pour correspondre à l'aperçu
  ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
  return canvas;
}

/**
 * Capture la PHOTO du flux. `mirror` (= caméra frontale) retourne l'image pour
 * qu'elle soit à l'endroit comme l'arrière (le flux frontal brut est en miroir).
 * Renvoie null si pas de flux → l'appelant se rabat sur takePictureAsync.
 */
export function captureWebPhoto(mirror = false): Promise<string | null> {
  const v = getCameraVideoEl();
  if (!v || !v.videoWidth || typeof document === 'undefined') return Promise.resolve(null);
  const canvas = drawFrame(v, mirror);
  if (!canvas) return Promise.resolve(null);
  return new Promise((resolve) => {
    canvas.toBlob((b) => resolve(b ? URL.createObjectURL(b) : null), 'image/jpeg', 0.92);
  });
}

/**
 * Fige la frame courante en data URL (SYNCHRONE) — masque l'écran noir pendant
 * la bascule. `mirror` (frontal) pour correspondre exactement à l'aperçu affiché.
 */
export function captureWebFrameDataUrl(mirror = false): string | null {
  const v = getCameraVideoEl();
  if (!v || !v.videoWidth || typeof document === 'undefined') return null;
  try {
    const canvas = drawFrame(v, mirror);
    return canvas ? canvas.toDataURL('image/jpeg', 0.8) : null;
  } catch {
    return null;
  }
}

const MIRROR_STYLE_ID = 'afryko-cam-mirror';

/**
 * Impose l'orientation de l'aperçu caméra web via une feuille de style `!important`
 * (bat l'inline d'expo, sans course). Frontal = retourné (scaleX(-1)) pour être à
 * l'endroit comme l'arrière ; arrière = aucune transformation.
 */
export function setCameraMirror(mirror: boolean) {
  if (typeof document === 'undefined') return;
  let el = document.getElementById(MIRROR_STYLE_ID) as HTMLStyleElement | null;
  if (!el) {
    el = document.createElement('style');
    el.id = MIRROR_STYLE_ID;
    document.head.appendChild(el);
  }
  const t = mirror ? 'scaleX(-1)' : 'none';
  el.textContent = `video{transform:${t} !important;-webkit-transform:${t} !important;}`;
}

export function clearCameraMirror() {
  if (typeof document === 'undefined') return;
  document.getElementById(MIRROR_STYLE_ID)?.remove();
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
