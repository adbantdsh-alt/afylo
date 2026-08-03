import Svg, { Defs, Ellipse, LinearGradient, Path, Stop } from 'react-native-svg';

/**
 * Badge de certification — bleu (créateur vérifié) ou OR (compte officiel).
 * Rendu en SVG avec relief 3D (dégradé + reflet + coche ombrée) : net à toute
 * taille et NON imitable par un simple emoji. Affiché partout à côté du nom.
 */
export type VerifKind = 'blue' | 'gold';

// Comptes officiels certifiés OR (fallback tant que la colonne verified_type n'est pas remplie)
const GOLD_HANDLES = new Set(['adbaecomx', 'sanebusinesstrading']);

export function verifiedKind(p?: { handle?: string | null; is_verified?: boolean | null; verified_type?: string | null } | null): VerifKind | null {
  if (!p) return null;
  const h = (p.handle ?? '').replace(/^@/, '').toLowerCase();
  if (p.verified_type === 'gold' || GOLD_HANDLES.has(h)) return 'gold';
  if (p.verified_type === 'blue' || p.is_verified) return 'blue';
  return null;
}

/** Contour « festonné » (lobes arrondis) façon sceau de certification, lissé. */
function scallopPath(cx: number, cy: number, rOuter: number, rInner: number, lobes: number): string {
  const N = lobes * 2;
  const pts: [number, number][] = [];
  for (let i = 0; i < N; i++) {
    const ang = (Math.PI * 2 * i) / N - Math.PI / 2;
    const r = i % 2 === 0 ? rOuter : rInner;
    pts.push([cx + r * Math.cos(ang), cy + r * Math.sin(ang)]);
  }
  const mid = (a: [number, number], b: [number, number]): [number, number] => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const m0 = mid(pts[N - 1], pts[0]);
  let d = `M ${m0[0].toFixed(2)} ${m0[1].toFixed(2)} `;
  for (let i = 0; i < N; i++) {
    const cur = pts[i];
    const m = mid(cur, pts[(i + 1) % N]);
    d += `Q ${cur[0].toFixed(2)} ${cur[1].toFixed(2)} ${m[0].toFixed(2)} ${m[1].toFixed(2)} `;
  }
  return d + 'Z';
}

const SEAL = scallopPath(50, 50, 47, 39, 9);
const SEAL_SHADOW = scallopPath(50, 53, 47, 39, 9); // décalé de 3px vers le bas (relief)
const CHECK = 'M34 51 L45 62 L67 39';
const CHECK_SHADOW = 'M34 53 L45 64 L67 41'; // décalé de 2px

const GRAD: Record<VerifKind, [string, string, string]> = {
  // [clair (haut), foncé (bas), bord/ombre]
  blue: ['#5CB8F7', '#1483D8', '#0E6BB8'],
  gold: ['#F7C560', '#E39A16', '#B9790A'],
};

export function VerifiedBadge({ kind, size = 15 }: { kind: VerifKind | null | undefined; size?: number }) {
  if (!kind) return null;
  const [light, dark, edge] = GRAD[kind];
  const gid = `vb-${kind}`;
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <LinearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={light} />
          <Stop offset="1" stopColor={dark} />
        </LinearGradient>
      </Defs>
      {/* Ombre portée du sceau (relief) */}
      <Path d={SEAL_SHADOW} fill={edge} opacity={0.5} />
      {/* Corps du sceau */}
      <Path d={SEAL} fill={`url(#${gid})`} />
      {/* Reflet haut-gauche (brillance 3D) */}
      <Ellipse cx={38} cy={32} rx={22} ry={14} fill="#ffffff" opacity={0.22} />
      {/* Ombre de la coche (profondeur) */}
      <Path d={CHECK_SHADOW} stroke={edge} strokeWidth={11} strokeLinecap="round" strokeLinejoin="round" fill="none" opacity={0.35} />
      {/* Coche blanche */}
      <Path d={CHECK} stroke="#ffffff" strokeWidth={10} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </Svg>
  );
}
