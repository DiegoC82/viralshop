import React, { useState, useEffect, useRef } from 'react';
import { 
  View, Text, StyleSheet, FlatList, Image, TouchableOpacity, 
  ActivityIndicator, RefreshControl, Animated, Modal, TextInput, Alert, Keyboard
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS } from '../theme/colors';

const BACKEND_URL = 'https://viralshop-xr9v.onrender.com';

interface Chat {
  id: string;
  name: string;
  lastMessage: string;
  time: string;
  avatar: string;
  unreadCount?: number;
  isVerified?: boolean;
  isOnline?: boolean;
  category: 'NORMAL' | 'COMPRA' | 'REMATE'; // 👈 NUEVO: Categoría del chat
}

// Datos de prueba con categorías asignadas
const MOCK_CHATS: Chat[] = [
  { id: '1', name: 'Soporte ViralShop', lastMessage: '¡Tu cuenta ha sido verificada! ✅', time: '10:42 AM', avatar: 'https://i.pravatar.cc/150?img=68', unreadCount: 1, category: 'NORMAL', isVerified: true },
  { id: '2', name: 'TechStore', lastMessage: 'Tu pedido de aros de luz está en camino.', time: 'Ayer', avatar: 'https://i.pravatar.cc/150?img=11', unreadCount: 0, category: 'COMPRA' },
  { id: '3', name: 'Ana Gómez', lastMessage: '¿Sigue disponible la campera?', time: 'Ayer', avatar: 'https://i.pravatar.cc/150?img=5', unreadCount: 3, category: 'NORMAL' },
  { id: '4', name: 'Subastas VIP', lastMessage: '¡Has ganado el remate del iPhone 13!', time: 'Lunes', avatar: 'https://i.pravatar.cc/150?img=12', unreadCount: 1, category: 'REMATE' },
];

export default function MessagesScreen({ navigation }: any) {
  // 1. Estados de Datos
  const [currentUser, setCurrentUser] = useState<any>(null); // Para saber si es PRO
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // 2. Estados de UI (Pestañas y Modal)
  const [activeTab, setActiveTab] = useState<'Todos' | 'Compras' | 'Remates'>('Todos');
  const [menuVisible, setMenuVisible] = useState(false);
  
  // 3. Estados de Búsqueda
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const blinkAnim = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(blinkAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(blinkAnim, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const fetchInitialData = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      // Obtenemos los chats y el perfil del usuario actual a la vez
      const [chatsRes, userRes] = await Promise.all([
        axios.get(`${BACKEND_URL}/chats`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => null),
        axios.get(`${BACKEND_URL}/users/me`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => null)
      ]);

      if (userRes?.data) setCurrentUser(userRes.data);
      if (chatsRes?.data && chatsRes.data.length > 0) {
        setChats(chatsRes.data);
      } else {
        setChats(MOCK_CHATS); // Fallback a datos de prueba
      }
    } catch (error) {
      setChats(MOCK_CHATS); 
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchInitialData();
  };

  // 👇 LÓGICA DEL BUSCADOR EN TIEMPO REAL 👇
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchQuery.trim().length > 1) {
        setIsSearching(true);
        try {
          const res = await axios.get(`${BACKEND_URL}/users/search?q=${searchQuery}`);
          setSearchResults(res.data);
        } catch (error) {
          console.log("Error buscando usuarios", error);
        } finally {
          setIsSearching(false);
        }
      } else {
        setSearchResults([]);
      }
    }, 500); // Espera 500ms después de que dejas de escribir para no saturar el servidor

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  // 👇 FILTRADO DE PESTAÑAS 👇
  const filteredChats = chats.filter(chat => {
    if (activeTab === 'Compras') return chat.category === 'COMPRA';
    if (activeTab === 'Remates') return chat.category === 'REMATE';
    return true; // "Todos"
  });

  const handleStartChat = async (userId: string, username: string, avatar: string, verified: boolean) => {
    setMenuVisible(false);
    try {
      const token = await AsyncStorage.getItem('userToken');
      // Llama a tu endpoint existente para crear o buscar el chat
      const response = await axios.post(`${BACKEND_URL}/chats/start/${userId}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      navigation.navigate('ChatDetails', { 
        chatId: response.data.id, 
        chatName: username,
        avatar: avatar,
        isVerified: verified
      });
    } catch (error) {
      Alert.alert("Error", "No se pudo iniciar la conversación.");
    }
  };

  return (
    <View style={styles.container}>
      {/* CABECERA */}
      <View style={styles.header}>
        <View style={styles.headerSpacer} />
        <Text style={styles.headerTitle}>Bandeja de entrada</Text>
        <TouchableOpacity style={styles.headerIcon} onPress={() => { setMenuVisible(true); setSearchQuery(''); setSearchResults([]); }}>
          <Ionicons name="add-circle-outline" size={28} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      {/* 👇 NUEVAS PESTAÑAS DE FILTRADO 👇 */}
      <View style={styles.tabsContainer}>
        {['Todos', 'Compras', 'Remates'].map((tab) => (
          <TouchableOpacity 
            key={tab} 
            style={[styles.tabButton, activeTab === tab && styles.tabButtonActive]}
            onPress={() => setActiveTab(tab as any)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </View>
      
      {/* LISTA DE MENSAJES */}
      {loading && !refreshing ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.accent} />
        </View>
      ) : (
        <FlatList
          data={filteredChats}
          keyExtractor={item => item.id}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.accent} colors={[COLORS.accent]} />
          }
          ListEmptyComponent={
            <View style={styles.centerContainer}>
              <Ionicons name="chatbubbles-outline" size={60} color={COLORS.textMuted} />
              <Text style={styles.emptyText}>No hay mensajes de {activeTab.toLowerCase()}</Text>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={styles.chatRow}
              onPress={() => navigation.navigate('ChatDetails', { 
                chatId: item.id, chatName: item.name, avatar: item.avatar, isVerified: item.isVerified, isOnline: item.isOnline 
              })}
            >
              <View style={{ position: 'relative' }}>
                <Image source={{ uri: item.avatar || 'https://via.placeholder.com/150' }} style={[styles.avatar, item.isVerified && { borderColor: '#1DA1F2', borderWidth: 2 }]} />
                <Animated.View style={[styles.onlineDotChat, { backgroundColor: item.isOnline ? COLORS.accent : '#888888' }, item.isOnline ? { opacity: blinkAnim } : { opacity: 1 }]} />
                {item.isVerified && (
                  <View style={styles.verifiedBadgePhoto}>
                    <Ionicons name="shield-checkmark" size={10} color="#FFF" />
                  </View>
                )}
              </View>

              <View style={styles.chatInfo}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                  <Text style={styles.chatName}>{item.name}</Text>
                  {item.isVerified && <Ionicons name="shield-checkmark" size={14} color="#1DA1F2" style={{ marginLeft: 4 }} />}
                  {/* Etiqueta Visual de Compra o Remate */}
                  {item.category === 'COMPRA' && <Ionicons name="cart" size={14} color="#4CD964" style={{ marginLeft: 6 }} />}
                  {item.category === 'REMATE' && <Ionicons name="hammer" size={14} color={COLORS.accent} style={{ marginLeft: 6 }} />}
                </View>
                <Text style={styles.chatMsg} numberOfLines={1}>{item.lastMessage}</Text>
              </View>

              <View style={styles.rightContent}>
                <Text style={styles.chatTime}>{item.time}</Text>
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

      {/* ========================================== */}
      {/* 👇 MODAL DEL BOTÓN "+" (BUSCADOR Y OPCIONES) 👇 */}
      {/* ========================================== */}
      <Modal visible={menuVisible} transparent={true} animationType="slide">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => { setMenuVisible(false); Keyboard.dismiss(); }}>
          <TouchableOpacity activeOpacity={1} style={styles.bottomSheet}>
            <View style={styles.bottomSheetHandle} />
            <Text style={{ color: COLORS.text, fontSize: 18, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' }}>Nuevo Mensaje</Text>

            {/* BUSCADOR */}
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#1A0E2A', borderRadius: 12, paddingHorizontal: 15, marginBottom: 20, borderWidth: 1, borderColor: '#333' }}>
              <Ionicons name="search-outline" size={20} color={COLORS.textMuted} />
              <TextInput 
                style={{ flex: 1, color: COLORS.text, fontSize: 16, paddingVertical: 12, paddingHorizontal: 10 }} 
                placeholder="Buscar por @usuario o nombre..." 
                placeholderTextColor={COLORS.textMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {isSearching && <ActivityIndicator size="small" color={COLORS.accent} />}
            </View>

            {/* RESULTADOS DE BÚSQUEDA (Si hay texto) */}
            {searchQuery.length > 0 ? (
              <FlatList
                data={searchResults}
                keyExtractor={item => item.id}
                keyboardShouldPersistTaps="handled"
                style={{ maxHeight: 200, marginBottom: 15 }}
                ListEmptyComponent={
                  !isSearching ? <Text style={{ color: COLORS.textMuted, textAlign: 'center', marginVertical: 10 }}>No se encontraron usuarios.</Text> : null
                }
                renderItem={({ item }) => (
                  <TouchableOpacity style={styles.searchResultItem} onPress={() => handleStartChat(item.id, item.username, item.avatarUrl, item.isVerified)}>
                    <Image source={{ uri: item.avatarUrl || `https://ui-avatars.com/api/?name=${item.username}&background=random&color=fff` }} style={{ width: 40, height: 40, borderRadius: 20, marginRight: 12 }} />
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={{ color: COLORS.text, fontWeight: 'bold', fontSize: 15 }}>{item.name}</Text>
                        {item.isVerified && <Ionicons name="shield-checkmark" size={12} color="#1DA1F2" style={{ marginLeft: 4 }} />}
                      </View>
                      <Text style={{ color: COLORS.textMuted, fontSize: 13 }}>@{item.username}</Text>
                    </View>
                  </TouchableOpacity>
                )}
              />
            ) : (
              /* MENÚ NORMAL (Si el buscador está vacío) */
              <>
                {/* OPCIÓN: DIFUSIÓN (SOLO PRO/VERIFICADOS) */}
                <TouchableOpacity style={styles.menuItem} onPress={() => { 
                  if (currentUser?.isVerified) {
                    setMenuVisible(false);
                    Alert.alert('Difusión PRO', 'Selecciona los usuarios o envía a todos tus seguidores.');
                  } else {
                    Alert.alert('Acceso Restringido', 'La difusión masiva es exclusiva para cuentas con Perfil Verificado (PRO). Obtén tu insignia en tu perfil.');
                  }
                }}>
                  <View style={[styles.menuIconBox, { backgroundColor: currentUser?.isVerified ? 'rgba(184, 41, 219, 0.1)' : 'rgba(100, 100, 100, 0.1)' }]}>
                    <Ionicons name="megaphone-outline" size={20} color={currentUser?.isVerified ? COLORS.accent : '#666'} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.menuItemText, !currentUser?.isVerified && { color: '#888' }]}>Nueva difusión masiva</Text>
                    <Text style={{ color: COLORS.textMuted, fontSize: 12 }}>Avisa de tus ofertas a tus seguidores.</Text>
                  </View>
                  {!currentUser?.isVerified && <Ionicons name="lock-closed" size={16} color="#666" />}
                </TouchableOpacity>

                {/* OPCIÓN: SOPORTE */}
                <TouchableOpacity style={[styles.menuItem, { borderBottomWidth: 0 }]} onPress={() => { 
                  setMenuVisible(false); 
                  navigation.navigate('ChatDetails', { 
                    chatId: 'soporte_viralshop', chatName: 'Soporte ViralShop',
                    avatar: 'https://ui-avatars.com/api/?name=Soporte+ViralShop&background=1DA1F2&color=fff', 
                    isVerified: true, isOnline: true 
                  });
                }}>
                  <View style={[styles.menuIconBox, { backgroundColor: 'rgba(29, 161, 242, 0.1)' }]}>
                    <Ionicons name="help-buoy-outline" size={20} color="#1DA1F2" />
                  </View>
                  <View>
                    <Text style={styles.menuItemText}>Contactar a Soporte</Text>
                    <Text style={{ color: COLORS.textMuted, fontSize: 12 }}>Ayuda oficial de ViralShop.</Text>
                  </View>
                </TouchableOpacity>
              </>
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { 
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 50, paddingBottom: 15, paddingHorizontal: 20, 
  },
  headerSpacer: { width: 28 },
  headerTitle: { color: COLORS.text, fontSize: 18, fontWeight: 'bold' },
  headerIcon: { padding: 5 },
  
  // 👇 ESTILOS DE TABS 👇
  tabsContainer: { flexDirection: 'row', paddingHorizontal: 20, marginBottom: 10, gap: 10 },
  tabButton: { paddingVertical: 6, paddingHorizontal: 16, borderRadius: 20, backgroundColor: '#1A0E2A', borderWidth: 1, borderColor: '#333' },
  tabButtonActive: { backgroundColor: COLORS.text, borderColor: COLORS.text },
  tabText: { color: COLORS.textMuted, fontSize: 13, fontWeight: '600' },
  tabTextActive: { color: COLORS.background, fontWeight: 'bold' },

  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 50 },
  emptyText: { color: COLORS.text, fontSize: 16, fontWeight: 'bold', marginTop: 15 },
  chatRow: { flexDirection: 'row', paddingVertical: 12, paddingHorizontal: 15, alignItems: 'center' },
  avatar: { width: 56, height: 56, borderRadius: 28 },
  chatInfo: { flex: 1, marginLeft: 15, justifyContent: 'center' },
  chatName: { color: COLORS.text, fontSize: 16, fontWeight: '600' },
  verifiedBadgePhoto: { position: 'absolute', bottom: 0, right: 0, backgroundColor: '#1DA1F2', borderRadius: 8, padding: 2, borderWidth: 1.5, borderColor: COLORS.background, zIndex: 2 },
  onlineDotChat: { position: 'absolute', top: 2, right: 0, width: 12, height: 12, borderRadius: 6, borderWidth: 1.5, borderColor: COLORS.background, zIndex: 10 },
  chatMsg: { color: COLORS.textMuted, fontSize: 14 },
  rightContent: { alignItems: 'flex-end', justifyContent: 'center' },
  chatTime: { color: COLORS.textMuted, fontSize: 12, marginBottom: 5 },
  unreadBadge: { backgroundColor: COLORS.accent, borderRadius: 10, minWidth: 20, height: 20, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 5 },
  unreadText: { color: '#000', fontSize: 10, fontWeight: 'bold' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  bottomSheet: { backgroundColor: COLORS.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 40, minHeight: 350 },
  bottomSheetHandle: { width: 40, height: 4, backgroundColor: '#555', borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 0.5, borderBottomColor: '#222' },
  menuIconBox: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  menuItemText: { color: COLORS.text, fontSize: 16, fontWeight: '600', marginBottom: 2 },
  searchResultItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: '#222' }
});