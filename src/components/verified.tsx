import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';

/**
 * Badge de certification — bleu (créateur vérifié) ou OR (compte officiel/premium).
 * Affiché PARTOUT à côté du nom (feed, messagerie, recherche, profils…).
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

const COLOR: Record<VerifKind, string> = { blue: '#1D9BF0', gold: '#F5A623' };

export function VerifiedBadge({ kind, size = 15 }: { kind: VerifKind | null | undefined; size?: number }) {
  if (!kind) return null;
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: COLOR[kind], alignItems: 'center', justifyContent: 'center' }}>
      <Ionicons name="checkmark-sharp" size={size * 0.62} color="#fff" />
    </View>
  );
}
