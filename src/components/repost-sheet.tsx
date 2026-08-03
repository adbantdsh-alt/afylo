import { Ionicons } from '@expo/vector-icons';
import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioPlayer,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Afylo, Font, Radius } from '@/constants/brand';
import type { RepostMedia, RepostPostSnap } from '@/lib/reposts';

export type RepostPayload = { mode: 'simple' | 'quote'; text?: string; media?: RepostMedia | null };

export function RepostSheet({
  visible,
  post,
  isPro,
  onClose,
  onUpgrade,
  onPublish,
  editing,
  initial,
}: {
  visible: boolean;
  post: RepostPostSnap | null;
  isPro: boolean;
  onClose: () => void;
  onUpgrade: () => void;
  onPublish: (p: RepostPayload) => void;
  editing?: boolean;
  initial?: { text?: string; media?: RepostMedia | null };
}) {
  const [step, setStep] = useState<'choose' | 'compose'>(editing ? 'compose' : 'choose');
  const [text, setText] = useState(initial?.text ?? '');
  const [media, setMedia] = useState<RepostMedia | null>(initial?.media ?? null);
  const [done, setDone] = useState<'simple' | 'quote' | null>(null);

  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recState = useAudioRecorderState(recorder);

  // (Ré)initialise quand on ouvre
  useEffect(() => {
    if (visible) { setStep(editing ? 'compose' : 'choose'); setText(initial?.text ?? ''); setMedia(initial?.media ?? null); setDone(null); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const close = () => { if (recState.isRecording) recorder.stop().catch(() => {}); onClose(); };
  const finish = (mode: 'simple' | 'quote') => { onPublish({ mode, text: text.trim() || undefined, media }); setDone(mode); setTimeout(close, 1000); };

  const startRec = async () => {
    try {
      const perm = await AudioModule.requestRecordingPermissionsAsync();
      if (!perm.granted) return;
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
    } catch {}
  };
  const stopRec = async () => {
    try {
      await recorder.stop();
      if (recorder.uri) setMedia({ kind: 'vocal', uri: recorder.uri, duration: Math.round((recState.durationMillis ?? 0) / 1000) });
    } catch {}
  };
  const pickImage = async (kind: 'photo' | 'video') => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: kind === 'video' ? ['videos'] : ['images'], quality: 1 });
    if (!res.canceled) setMedia({ kind, uri: res.assets[0].uri });
  };

  const commission = post?.product?.commission;
  const affiliate = !!commission && isPro; // affiliation = produit affilié + compte Pro

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <Pressable style={styles.overlay} onPress={close}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation?.()}>
          <View style={styles.handle} />

          {done ? (
            <View style={styles.center}>
              <View style={styles.okIcon}><Ionicons name="repeat" size={30} color="#fff" /></View>
              <Text style={styles.okTitle}>{editing ? 'Repartage modifié' : done === 'quote' ? 'Citation publiée' : 'Republié !'}</Text>
              <Text style={styles.okSub}>Visible dans ton profil › Republications.{commission ? ` Tu gagnes ${commission} sur chaque vente.` : ''}</Text>
            </View>
          ) : (
            <>
              <Text style={styles.title}>{editing ? 'Modifier le repartage' : step === 'choose' ? 'Repartager' : 'Citer la publication'}</Text>

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

              {affiliate ? (
                <View style={styles.commBanner}>
                  <Ionicons name="cash" size={16} color={Afylo.green} />
                  <Text style={styles.commText}>Affiliation active — tu touches <Text style={{ fontFamily: Font.bold }}>{commission}</Text> sur chaque vente via ton repartage.</Text>
                </View>
              ) : commission ? (
                <Pressable style={styles.upsellBanner} onPress={() => { close(); onUpgrade(); }}>
                  <Ionicons name="lock-closed" size={15} color={Afylo.violet} />
                  <Text style={styles.upsellText}>Passe en <Text style={{ fontFamily: Font.bold }}>Pro</Text> pour toucher {commission} de commission sur les ventes.</Text>
                  <Ionicons name="chevron-forward" size={15} color={Afylo.violet} />
                </Pressable>
              ) : null}

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

                  {/* Média : aperçu ou boutons d'ajout */}
                  {media ? (
                    <MediaPreview media={media} onRemove={() => setMedia(null)} />
                  ) : recState.isRecording ? (
                    <View style={styles.recRow}>
                      <View style={styles.recDot} />
                      <Text style={styles.recTime}>{fmtDur(Math.round((recState.durationMillis ?? 0) / 1000))}</Text>
                      <Text style={styles.recLabel}>Enregistrement…</Text>
                      <Pressable onPress={stopRec} style={styles.recStop}><Ionicons name="stop" size={16} color="#fff" /><Text style={styles.recStopText}>Arrêter</Text></Pressable>
                    </View>
                  ) : (
                    <View style={styles.attachRow}>
                      <AttachBtn icon="mic" label="Vocal" onPress={startRec} />
                      <AttachBtn icon="image" label="Photo" onPress={() => pickImage('photo')} />
                      <AttachBtn icon="videocam" label="Vidéo" onPress={() => pickImage('video')} />
                    </View>
                  )}

                  <Pressable style={styles.primaryBtn} onPress={() => finish('quote')}>
                    <Text style={styles.primaryText}>{editing ? 'Enregistrer' : 'Publier'}</Text>
                  </Pressable>
                  {!editing && <Pressable onPress={() => setStep('choose')} style={styles.ghostBtn}><Text style={styles.ghostText}>Retour</Text></Pressable>}
                </>
              )}
            </>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/* ---------- Aperçus média ---------- */
export function MediaPreview({ media, onRemove }: { media: RepostMedia; onRemove?: () => void }) {
  return (
    <View style={styles.previewWrap}>
      {media.kind === 'vocal' ? (
        <AudioPreview uri={media.uri} duration={media.duration} />
      ) : media.kind === 'video' ? (
        <VideoPreview uri={media.uri} />
      ) : (
        <Image source={{ uri: media.uri }} style={styles.previewMedia} contentFit="cover" />
      )}
      {onRemove && (
        <Pressable onPress={onRemove} style={styles.previewRemove}><Ionicons name="close" size={16} color="#fff" /></Pressable>
      )}
    </View>
  );
}

function AudioPreview({ uri, duration }: { uri: string; duration?: number }) {
  const player = useAudioPlayer(uri);
  const [playing, setPlaying] = useState(false);
  const toggle = () => {
    if (playing) { player.pause(); setPlaying(false); }
    else { player.seekTo(0); player.play(); setPlaying(true); }
  };
  return (
    <Pressable onPress={toggle} style={styles.audioPill}>
      <View style={styles.audioPlay}><Ionicons name={playing ? 'pause' : 'play'} size={16} color="#fff" /></View>
      <View style={styles.audioWave}>
        {[8, 16, 11, 20, 13, 22, 10, 17, 9, 14].map((h, i) => <View key={i} style={[styles.waveBar, { height: h }]} />)}
      </View>
      <Text style={styles.audioDur}>{fmtDur(duration ?? 0)}</Text>
    </Pressable>
  );
}

function VideoPreview({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, (p) => { p.loop = true; p.muted = true; p.play(); });
  return <VideoView player={player} style={styles.previewMedia} contentFit="cover" nativeControls={false} />;
}

function AttachBtn({ icon, label, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.attach}>
      <Ionicons name={icon} size={18} color={Afylo.text} />
      <Text style={styles.attachText}>{label}</Text>
    </Pressable>
  );
}

function fmtDur(s: number) { const m = Math.floor(s / 60); const r = s % 60; return `${m}:${r.toString().padStart(2, '0')}`; }

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
  upsellBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#3E5BFF12', borderWidth: 1, borderColor: '#3E5BFF33', borderRadius: Radius.md, padding: 12, marginTop: 12 },
  upsellText: { flex: 1, color: Afylo.text, fontSize: 13, lineHeight: 18 },

  choice: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: Afylo.surfaceAlt },
  choiceIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: Afylo.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  choiceTitle: { color: Afylo.text, fontFamily: Font.bold, fontSize: 15 },
  choiceSub: { color: Afylo.textDim, fontSize: 13, marginTop: 1 },

  input: { minHeight: 70, maxHeight: 150, backgroundColor: Afylo.surface, borderWidth: 1, borderColor: Afylo.border, borderRadius: Radius.md, padding: 14, color: Afylo.text, fontSize: 15, marginTop: 14, textAlignVertical: 'top' },
  attachRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  attach: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 44, borderRadius: Radius.pill, backgroundColor: Afylo.surface, borderWidth: 1, borderColor: Afylo.border },
  attachText: { color: Afylo.text, fontFamily: Font.semibold, fontSize: 13 },

  recRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, backgroundColor: Afylo.surface, borderWidth: 1, borderColor: Afylo.border, borderRadius: Radius.pill, paddingLeft: 14, paddingRight: 6, height: 46 },
  recDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Afylo.live },
  recTime: { color: Afylo.text, fontFamily: Font.bold, fontSize: 14 },
  recLabel: { flex: 1, color: Afylo.textDim, fontSize: 13 },
  recStop: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: Afylo.live, borderRadius: Radius.pill, paddingHorizontal: 14, height: 34 },
  recStopText: { color: '#fff', fontFamily: Font.semibold, fontSize: 13 },

  previewWrap: { marginTop: 12 },
  previewMedia: { width: '100%', height: 190, borderRadius: Radius.md, backgroundColor: Afylo.surfaceAlt },
  previewRemove: { position: 'absolute', top: 8, right: 8, width: 30, height: 30, borderRadius: 15, backgroundColor: '#000000aa', alignItems: 'center', justifyContent: 'center' },
  audioPill: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: Afylo.surface, borderWidth: 1, borderColor: Afylo.border, borderRadius: Radius.pill, paddingHorizontal: 12, height: 52 },
  audioPlay: { width: 34, height: 34, borderRadius: 17, backgroundColor: Afylo.violet, alignItems: 'center', justifyContent: 'center' },
  audioWave: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 3 },
  waveBar: { width: 3, borderRadius: 2, backgroundColor: Afylo.violet2 },
  audioDur: { color: Afylo.textDim, fontFamily: Font.semibold, fontSize: 13 },

  center: { alignItems: 'center', paddingVertical: 10 },
  okIcon: { width: 60, height: 60, borderRadius: 30, backgroundColor: Afylo.green, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  okTitle: { color: Afylo.text, fontFamily: Font.bold, fontSize: 19, textAlign: 'center' },
  okSub: { color: Afylo.textDim, fontSize: 14, textAlign: 'center', marginTop: 8, lineHeight: 20, paddingHorizontal: 8 },

  primaryBtn: { backgroundColor: Afylo.violet, height: 52, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center', marginTop: 18, alignSelf: 'stretch' },
  primaryText: { color: '#fff', fontFamily: Font.bold, fontSize: 16 },
  ghostBtn: { alignItems: 'center', paddingVertical: 12, marginTop: 4 },
  ghostText: { color: Afylo.textDim, fontFamily: Font.semibold, fontSize: 15 },
});
