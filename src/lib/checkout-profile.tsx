import { createContext, useContext, useState, type ReactNode } from 'react';

export type PayMethod = 'wave' | 'om' | 'card';
export type CheckoutProfile = {
  name: string;
  phone: string;
  card: string; // n° de carte (pour paiement carte via XaalisPay) — stocké localement, affiché masqué
  preferred: PayMethod;
};

const EMPTY: CheckoutProfile = { name: '', phone: '', card: '', preferred: 'wave' };

type Ctx = {
  profile: CheckoutProfile;
  isComplete: boolean;
  setProfile: (p: Partial<CheckoutProfile>) => void;
};
const CheckoutCtx = createContext<Ctx | null>(null);

export function CheckoutProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfileState] = useState<CheckoutProfile>(EMPTY);
  const setProfile: Ctx['setProfile'] = (p) => setProfileState((prev) => ({ ...prev, ...p }));
  const isComplete = profile.name.trim().length >= 2 && profile.phone.trim().length >= 6;
  return <CheckoutCtx.Provider value={{ profile, isComplete, setProfile }}>{children}</CheckoutCtx.Provider>;
}

export function useCheckoutProfile() {
  const c = useContext(CheckoutCtx);
  if (!c) throw new Error('useCheckoutProfile hors CheckoutProfileProvider');
  return c;
}

/** Masque un numéro de carte : 1234 5678 9012 3456 → •••• 3456 */
export function maskCard(card: string): string {
  const digits = card.replace(/\D/g, '');
  if (digits.length < 4) return '';
  return `•••• ${digits.slice(-4)}`;
}
/** Masque un numéro de téléphone : 77 123 45 67 → 77 •• •• 67 */
export function maskPhone(phone: string): string {
  const d = phone.replace(/\s/g, '');
  if (d.length < 4) return phone;
  return `${d.slice(0, 2)} •• •• ${d.slice(-2)}`;
}
