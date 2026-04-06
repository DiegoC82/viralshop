// frontend/src/screens/MessagesScreen.tsx
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  Image, 
  TouchableOpacity, 
  ActivityIndicator,
  RefreshControl 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { COLORS } from '../theme/colors';

const BACKEND_URL = 'https://viralshop-xr9v.onrender.com';

interface Chat {
  id: string;
  name: string;
  lastMessage: string;
  time: string;
  avatar: string;
  unreadCount?: number;
}

// Datos de prueba temporales mientras creamos la ruta en el backend
const MOCK_CHATS: Chat[] = [
  { id: '1', name: 'Soporte ViralShop', lastMessage: '¡Tu cuenta ha sido verificada! ✅', time: '10:42 AM', avatar: 'https://i.pravatar.cc/150?img=68', unreadCount: 1 },
  { id: '2', name: 'TechStore', lastMessage: 'Tu pedido de aros de luz está en camino.', time: 'Ayer', avatar: 'https://i.pravatar.cc/150?img=11', unreadCount: 0 },
  { id: '3', name: 'Ana Gómez', lastMessage: '¿Sigue disponible la campera?', time: 'Ayer', avatar: 'https://i.pravatar.cc/150?img=5', unreadCount: 3 },
];

export default function MessagesScreen({ navigation }: any) {
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchChats = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/chats`);
      setChats(response.data);
    } catch (error) {
      console.log("Error 404: La ruta /chats no existe aún. Cargando datos de prueba...");
      // Inyectamos los datos de prueba si falla el backend
      setChats(MOCK_CHATS); 
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchChats();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchChats();
  };

  return (
    <View style={styles.container}>
      {/* CABECERA ESTILO TIKTOK */}
      <View style={styles.header}>
        <View style={styles.headerSpacer} />
        <Text style={styles.headerTitle}>Bandeja de entrada</Text>
        <TouchableOpacity style={styles.headerIcon}>
          <Ionicons name="add-circle-outline" size={28} color={COLORS.text} />
        </TouchableOpacity>
      </View>
      
      {/* LISTA DE MENSAJES */}
      {loading && !refreshing ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.accent} />
        </View>
      ) : (
        <FlatList
          data={chats}
          keyExtractor={item => item.id}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh} 
              tintColor={COLORS.accent}
              colors={[COLORS.accent]}
            />
          }
          ListEmptyComponent={
            <View style={styles.centerContainer}>
              <Ionicons name="chatbubbles-outline" size={60} color={COLORS.textMuted} />
              <Text style={styles.emptyText}>No tienes mensajes aún</Text>
              <Text style={styles.emptySubtext}>Conecta con vendedores y creadores.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={styles.chatRow}
              onPress={() => console.log('Navegar al chat', item.id)}
            >
              <Image 
                source={{ uri: item.avatar || 'https://via.placeholder.com/150' }} 
                style={styles.avatar} 
              />
              <View style={styles.chatInfo}>
                <Text style={styles.chatName}>{item.name}</Text>
                <Text style={styles.chatMsg} numberOfLines={1}>
                  {item.lastMessage}
                </Text>
              </View>

              <View style={styles.rightContent}>
                <Text style={styles.chatTime}>{item.time}</Text>
                {/* Solución al error del <Text>: simplificamos la validación */}
                {item.unreadCount ? (
                  <View style={styles.unreadBadge}>
                    <Text style={styles.unreadText}>{item.unreadCount}</Text>
                  </View>
                ) : null}
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { 
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 50, paddingBottom: 15, paddingHorizontal: 20, 
    borderBottomWidth: 0.5, borderBottomColor: '#333' 
  },
  headerSpacer: { width: 28 },
  headerTitle: { color: COLORS.text, fontSize: 18, fontWeight: 'bold' },
  headerIcon: { padding: 5 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 50 },
  emptyText: { color: COLORS.text, fontSize: 16, fontWeight: 'bold', marginTop: 15 },
  emptySubtext: { color: COLORS.textMuted, fontSize: 14, marginTop: 5 },
  chatRow: { flexDirection: 'row', paddingVertical: 12, paddingHorizontal: 15, alignItems: 'center' },
  avatar: { width: 56, height: 56, borderRadius: 28 },
  chatInfo: { flex: 1, marginLeft: 15, justifyContent: 'center' },
  chatName: { color: COLORS.text, fontSize: 16, fontWeight: '600', marginBottom: 4 },
  chatMsg: { color: COLORS.textMuted, fontSize: 14 },
  rightContent: { alignItems: 'flex-end', justifyContent: 'center' },
  chatTime: { color: COLORS.textMuted, fontSize: 12, marginBottom: 5 },
  unreadBadge: {
    backgroundColor: COLORS.accent, borderRadius: 10, minWidth: 20, height: 20,
    justifyContent: 'center', alignItems: 'center', paddingHorizontal: 5
  },
  unreadText: { color: '#000', fontSize: 10, fontWeight: 'bold' }
});