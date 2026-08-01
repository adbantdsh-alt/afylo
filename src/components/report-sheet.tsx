import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { Afryko, Font, Radius, Type } from '@/constants/brand';
import { REPORT_REASONS } from '@/lib/moderation';

export function ReportSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const [done, setDone] = useState(false);
  const close = () => { setDone(false); onClose(); };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={close} />
        <View style={styles.sheet}>
          <View style={styles.grip} />
          {done ? (
            <View style={styles.doneBox}>
              <Ionicons name="checkmark-circle" size={48} color={Afryko.green} />
              <Text style={styles.doneTitle}>Merci pour ton signalement</Text>
              <Text style={styles.doneSub}>Notre équipe va l'examiner. Les contenus impliquant des mineurs sont traités en priorité et signalés aux autorités.</Text>
            </View>
          ) : (
            <>
              <Text style={styles.title}>Signaler ce contenu</Text>
              <Text style={styles.sub}>Pourquoi signales-tu cette publication ?</Text>
              {REPORT_REASONS.map((r, i) => (
                <Pressable key={r} onPress={() => setDone(true)} style={[styles.row, i > 0 && styles.rowBorder]}>
                  <Text style={[styles.rowText, i === 0 && { color: Afryko.live, fontFamily: Font.semibold }]}>{r}</Text>
                  <Ionicons name="chevron-forward" size={18} color={Afryko.textFaint} />
                </Pressable>
              ))}
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: '#00000066', justifyContent: 'flex-end' },
  sheet: { backgroundColor: Afryko.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 16, paddingBottom: 30 },
  grip: { width: 40, height: 4, borderRadius: 2, backgroundColor: Afryko.border, alignSelf: 'center', marginBottom: 14 },
  title: { ...Type.subtitle, color: Afryko.text },
  sub: { ...Type.small, color: Afryko.textDim, marginTop: 2, marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14 },
  rowBorder: { borderTopWidth: 1, borderTopColor: Afryko.border },
  rowText: { ...Type.body, color: Afryko.text },
  doneBox: { alignItems: 'center', paddingVertical: 16 },
  doneTitle: { ...Type.title, fontSize: 19, color: Afryko.text, marginTop: 12 },
  doneSub: { ...Type.body, color: Afryko.textDim, textAlign: 'center', marginTop: 8, lineHeight: 22 },
});
