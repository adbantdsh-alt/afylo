import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Afylo, Font, Radius } from '@/constants/brand';

export type RepostPost = {
  name: string;
  avatar: string;
  caption: string;
  image: string;
  product?: { title: string; price: string; commission?: string };
};

type Attach = 'vocal' | 'photo' | 'video';

export function RepostSheet({
  visible,
  post,
  isPro,
  canAffiliate,
  onClose,
  onUpgrade,
  onReposted,
}: {
  visible: boolean;
  post: RepostPost | null;
  isPro: boolean;
  canAffiliate: boolean;
  onClose: () => void;
  onUpgrade: () => void;
  onReposted: (mode: 'simple' | 'quote') => void;
}) {
  const [step, setStep] = useState<'choose' | 'compose'>('choose');
  const [text, setText] = useState('');
  const [attach, setAttach] = useState<Attach[]>([]);
  const [done, setDone] = useState<'simple' | 'quote' | null>(null);

  const reset = () => { setStep('choose'); setText(''); setAttach([]); setDone(null); };
  const close = () => { reset(); onClose(); };
  const toggle = (a: Attach) => setAttach((prev) => (prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]));
  const finish = (mode: 'simple' | 'quote') => { onReposted(mode); setDone(mode); setTimeout(close, 1100); };

  const commission = post?.product?.commission;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <Pressable style={styles.overlay} onPress={close}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation?.()}>
          <View style={styles.handle} />

          {/* --- Confirmation --- */}
          {done ? (
            <View style={styles.center}>
              <View style={styles.okIcon}><Ionicons name="repeat" size={30} color="#fff" /></View>
              <Text style={styles.okTitle}>{done === 'quote' ? 'Citation publiée' : 'Republié !'}</Text>
              <Text style={styles.okSub}>Partagé auprès de ton audience.{commission ? ` Tu gagnes ${commission} sur chaque vente.` : ''}</Text>
            </View>
          ) : !canAffiliate ? (
            /* --- Bloqué : pas d'affiliation --- */
            <View style={styles.center}>
              <View style={[styles.okIcon, { backgroundColor: Afylo.surfaceAlt }]}><Ionicons name="lock-closed" size={26} color={Afylo.textDim} /></View>
              <Text style={styles.okTitle}>Repartage indisponible</Text>
              <Text style={styles.okSub}>Ce vendeur n'a pas activé l'affiliation sur ce produit. Seules les publications en affiliation peuvent être repartagées.</Text>
              <Pressable onPress={close} style={styles.ghostBtn}><Text style={styles.ghostText}>Compris</Text></Pressable>
            </View>
          ) : !isPro ? (
            /* --- Bloqué : réservé Pro --- */
            <View style={styles.center}>
              <View style={[styles.okIcon, { backgroundColor: Afylo.violet }]}><Ionicons name="repeat" size={28} color="#fff" /></View>
              <Text style={styles.okTitle}>Le repartage est Pro</Text>
              <Text style={styles.okSub}>Passe en compte Pro pour repartager les produits en affiliation et gagner une commission sur chaque vente réalisée via ton audience.</Text>
              <Pressable onPress={() => { close(); onUpgrade(); }} style={styles.primaryBtn}><Text style={styles.primaryText}>Passer en Pro</Text></Pressable>
              <Pressable onPress={close} style={styles.ghostBtn}><Text style={styles.ghostText}>Plus tard</Text></Pressable>
            </View>
          ) : (
            /* --- Prêt --- */
            <>
              <Text style={styles.title}>{step === 'choose' ? 'Repartager' : 'Citer la publication'}</Text>

              {/* Aperçu de la publication citée */}
              {post && (
                <View style={styles.quoted}>
                  <Image source={{ uri: post.avatar }} style={styles.qAvatar} contentFit="cover" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.qName}>{post.name}</Text>
                    <Text style={styles.qCaption} numberOfLines={2}>{post.caption}</Text>
                    {post.product && (
                      <View style={styles.qProduct}>
                        <Ionicons name="bag-handle" size={12} color={Afylo.violet} />
                        <Text style={styles.qProductText} numberOfLines={1}>{post.product.title} · {post.product.price}</Text>
                      </View>
                    )}
                  </View>
                  <Image source={{ uri: post.image }} style={styles.qThumb} contentFit="cover" />
                </View>
              )}

              {commission && (
                <View style={styles.commBanner}>
                  <Ionicons name="cash" size={16} color={Afylo.green} />
                  <Text style={styles.commText}>Affiliation active — tu touches <Text style={{ fontFamily: Font.bold }}>{commission}</Text> sur chaque vente via ton repartage.</Text>
                </View>
              )}

              {step === 'choose' ? (
                <>
                  <Pressable style={styles.choice} onPress={() => finish('simple')}>
                    <View style={styles.choiceIcon}><Ionicons name="repeat" size={22} color={Afylo.text} /></View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.choiceTitle}>Republier</Text>
                      <Text style={styles.choiceSub}>Partage tel quel à ton audience.</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={Afylo.textFaint} />
                  </Pressable>
                  <Pressable style={styles.choice} onPress={() => setStep('compose')}>
                    <View style={styles.choiceIcon}><Ionicons name="create-outline" size={22} color={Afylo.text} /></View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.choiceTitle}>Citer</Text>
                      <Text style={styles.choiceSub}>Ajoute un mot, un vocal, une photo ou une vidéo.</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={Afylo.textFaint} />
                  </Pressable>
                </>
              ) : (
                <>
                  <TextInput
                    style={styles.input}
                    value={text}
                    onChangeText={setText}
                    placeholder="Ajoute ton avis, une recommandation…"
                    placeholderTextColor={Afylo.textFaint}
                    multiline
                  />
                  <View style={styles.attachRow}>
                    <AttachBtn icon="mic" label="Vocal" on={attach.includes('vocal')} onPress={() => toggle('vocal')} />
                    <AttachBtn icon="image" label="Photo" on={attach.includes('photo')} onPress={() => toggle('photo')} />
                    <AttachBtn icon="videocam" label="Vidéo" on={attach.includes('video')} onPress={() => toggle('video')} />
                  </View>
                  <Pressable style={styles.primaryBtn} onPress={() => finish('quote')}>
                    <Text style={styles.primaryText}>Publier</Text>
                  </Pressable>
                  <Pressable onPress={() => setStep('choose')} style={styles.ghostBtn}><Text style={styles.ghostText}>Retour</Text></Pressable>
                </>
              )}
            </>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function AttachBtn({ icon, label, on, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.attach, on && styles.attachOn]}>
      <Ionicons name={on ? 'checkmark-circle' : icon} size={18} color={on ? '#fff' : Afylo.text} />
      <Text style={[styles.attachText, on && { color: '#fff' }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: '#00000066', justifyContent: 'flex-end' },
  sheet: { backgroundColor: Afylo.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 30 },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: Afylo.border, alignSelf: 'center', marginBottom: 16 },
  title: { color: Afylo.text, fontFamily: Font.bold, fontSize: 19, marginBottom: 14 },

  quoted: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: Afylo.surface, borderWidth: 1, borderColor: Afylo.border, borderRadius: Radius.lg, padding: 10 },
  qAvatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: Afylo.surfaceAlt },
  qName: { color: Afylo.text, fontFamily: Font.bold, fontSize: 13 },
  qCaption: { color: Afylo.textDim, fontSize: 12, marginTop: 1 },
  qProduct: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  qProductText: { color: Afylo.violet, fontFamily: Font.semibold, fontSize: 11, flex: 1 },
  qThumb: { width: 46, height: 46, borderRadius: 10, backgroundColor: Afylo.surfaceAlt },

  commBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Afylo.green + '18', borderRadius: Radius.md, padding: 12, marginTop: 12 },
  commText: { flex: 1, color: Afylo.text, fontSize: 13, lineHeight: 18 },

  choice: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: Afylo.surfaceAlt },
  choiceIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: Afylo.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  choiceTitle: { color: Afylo.text, fontFamily: Font.bold, fontSize: 15 },
  choiceSub: { color: Afylo.textDim, fontSize: 13, marginTop: 1 },

  input: { minHeight: 80, maxHeight: 160, backgroundColor: Afylo.surface, borderWidth: 1, borderColor: Afylo.border, borderRadius: Radius.md, padding: 14, color: Afylo.text, fontSize: 15, marginTop: 14, textAlignVertical: 'top' },
  attachRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  attach: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 44, borderRadius: Radius.pill, backgroundColor: Afylo.surface, borderWidth: 1, borderColor: Afylo.border },
  attachOn: { backgroundColor: Afylo.violet, borderColor: Afylo.violet },
  attachText: { color: Afylo.text, fontFamily: Font.semibold, fontSize: 13 },

  center: { alignItems: 'center', paddingVertical: 10 },
  okIcon: { width: 60, height: 60, borderRadius: 30, backgroundColor: Afylo.green, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  okTitle: { color: Afylo.text, fontFamily: Font.bold, fontSize: 19, textAlign: 'center' },
  okSub: { color: Afylo.textDim, fontSize: 14, textAlign: 'center', marginTop: 8, lineHeight: 20, paddingHorizontal: 8 },

  primaryBtn: { backgroundColor: Afylo.violet, height: 52, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center', marginTop: 18, alignSelf: 'stretch' },
  primaryText: { color: '#fff', fontFamily: Font.bold, fontSize: 16 },
  ghostBtn: { alignItems: 'center', paddingVertical: 12, marginTop: 4 },
  ghostText: { color: Afylo.textDim, fontFamily: Font.semibold, fontSize: 15 },
});
