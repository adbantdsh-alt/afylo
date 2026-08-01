import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Afryko, Font, Radius, Type } from '@/constants/brand';
import { searchSounds, type Sound } from '@/lib/sounds';

export function SoundPicker({ visible, onSelect, onClose }: { visible: boolean; onSelect: (s: Sound) => void; onClose: () => void }) {
  const [q, setQ] = useState('');
  const list = searchSounds(q);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.root}>
        <SafeAreaView edges={['top']} style={{ backgroundColor: Afryko.bg }}>
          <View style={styles.header}>
            <Ionicons name="close" size={26} color={Afryko.text} onPress={onClose} />
            <Text style={styles.title}>Ajouter un son</Text>
            <View style={{ width: 26 }} />
          </View>
          <View style={styles.searchBox}>
            <Ionicons name="search" size={18} color={Afryko.textDim} />
            <TextInput style={styles.searchInput} value={q} onChangeText={setQ} placeholder="Rechercher un son, un artiste" placeholderTextColor={Afryko.textFaint} autoFocus />
          </View>
        </SafeAreaView>

        <ScrollView contentContainerStyle={{ padding: 12 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {!q && <Text style={styles.section}>Sons populaires</Text>}
          {list.map((s) => (
            <Pressable key={s.id} onPress={() => onSelect(s)} style={styles.row}>
              <Image source={{ uri: s.cover }} style={styles.cover} contentFit="cover" />
              <View style={{ flex: 1 }}>
                <Text style={styles.name} numberOfLines={1}>{s.title}</Text>
                <Text style={styles.meta} numberOfLines={1}>{s.artist} · {s.duration} · {s.uses}</Text>
              </View>
              <View style={styles.useBtn}><Text style={styles.useText}>Utiliser</Text></View>
            </Pressable>
          ))}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Afryko.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 8 },
  title: { ...Type.subtitle, color: Afryko.text },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Afryko.surfaceAlt, borderRadius: Radius.pill, paddingHorizontal: 14, height: 44, marginHorizontal: 12, marginBottom: 6 },
  searchInput: { flex: 1, ...Type.body, fontSize: 15, color: Afryko.text, height: '100%' },
  section: { ...Type.small, fontFamily: Font.semibold, color: Afryko.textDim, marginBottom: 8, marginLeft: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  cover: { width: 52, height: 52, borderRadius: 10, backgroundColor: Afryko.surfaceAlt },
  name: { ...Type.body, fontFamily: Font.semibold, color: Afryko.text },
  meta: { ...Type.caption, color: Afryko.textDim, marginTop: 2 },
  useBtn: { backgroundColor: Afryko.violet, paddingHorizontal: 14, paddingVertical: 8, borderRadius: Radius.pill },
  useText: { color: '#fff', fontFamily: Font.semibold, fontSize: 13 },
});
