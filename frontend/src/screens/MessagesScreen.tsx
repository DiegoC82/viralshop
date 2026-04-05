// frontend/src/screens/MessagesScreen.tsx
import React from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity } from 'react-native';
import { COLORS } from '../theme/colors';

const CHATS = [
  { id: '1', name: 'Soporte ViralShop', msg: '¡Tu cuenta ha sido verificada! ✅', time: '10:42 AM', avatar: 'https://i.pravatar.cc/150?img=68' },
  { id: '2', name: 'TechStore', msg: 'Tu pedido de auriculares está en camino.', time: 'Ayer', avatar: 'https://i.pravatar.cc/150?img=11' },
  { id: '3', name: 'Ana Gómez', msg: '¿Sigue disponible la campera?', time: 'Ayer', avatar: 'https://i.pravatar.cc/150?img=5' },
];

export default function MessagesScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.headerTitle}>Bandeja de Entrada</Text>
      
      <FlatList
        data={CHATS}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.chatRow}>
            <Image source={{ uri: item.avatar }} style={styles.avatar} />
            <View style={styles.chatInfo}>
              <Text style={styles.chatName}>{item.name}</Text>
              <Text style={styles.chatMsg} numberOfLines={1}>{item.msg}</Text>
            </View>
            <Text style={styles.chatTime}>{item.time}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, paddingTop: 50 },
  headerTitle: { color: COLORS.text, fontSize: 24, fontWeight: 'bold', paddingHorizontal: 20, paddingBottom: 20 },
  chatRow: { flexDirection: 'row', padding: 15, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: COLORS.surface },
  avatar: { width: 50, height: 50, borderRadius: 25 },
  chatInfo: { flex: 1, marginLeft: 15 },
  chatName: { color: COLORS.text, fontSize: 16, fontWeight: 'bold' },
  chatMsg: { color: COLORS.textMuted, fontSize: 14, marginTop: 3 },
  chatTime: { color: COLORS.textMuted, fontSize: 12 },
});