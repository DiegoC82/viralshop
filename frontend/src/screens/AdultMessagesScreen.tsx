// frontend/src/screens/AdultMessagesScreen.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, ActivityIndicator, RefreshControl, Modal, TextInput, Keyboard, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BACKEND_URL = 'https://viralshop-xr9v.onrender.com';

// Paleta Modo Nocturno
const DARK_BG = '#0A0514';
const DARK_SURFACE = '#110A1F';
const DARK_ACCENT = '#b829db';

export default function AdultMessagesScreen({ navigation }: any) {
  const [chats, setChats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  const [menuVisible, setMenuVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const fetchChats = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) return;

      const meResponse = await axios.get(`${BACKEND_URL}/users/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCurrentUserId(meResponse.data.id);

      const response = await axios.get(`${BACKEND_URL}/chats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setChats(response.data);
    } catch (error) {
      console.log("Error al cargar chats secretos:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchChats();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchChats();
  };

  const handleSearchUsers = async (text: string) => {
    setSearchQuery(text);
    if (text.length < 2) {
      setSearchResults([]);
      return;
    }
    try {
      const response = await axios.get(`${BACKEND_URL}/users/search?q=${text}`);
      setSearchResults(response.data);
    } catch (error) {
      console.log("Error buscando usuarios:", error);
    }
  };

  const handleStartChat = async (targetUserId: string, targetAdultUsername: string) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await axios.post(`${BACKEND_URL}/chats/start/${targetUserId}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setMenuVisible(false);
      setSearchQuery('');
      setSearchResults([]);
      
      navigation.navigate('ChatDetails', { 
        chatId: response.data.id, 
        chatName: targetAdultUsername
      });
    } catch (error) {
      Alert.alert("Error", "No se pudo iniciar la conversación.");
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerSpacer} />
        <Text style={styles.headerTitle}>Bandeja Secreta</Text>
        <TouchableOpacity style={styles.headerIcon} onPress={() => { setMenuVisible(true); setSearchQuery(''); setSearchResults([]); }}>
          <Ionicons name="add-circle-outline" size={28} color="#FFF" />
        </TouchableOpacity>
      </View>

      {loading && !refreshing ? (
        <View style={styles.centerContainer}><ActivityIndicator size="large" color={DARK_ACCENT} /></View>
      ) : (
        <FlatList
          data={chats}
          keyExtractor={item => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} tintColor={DARK_ACCENT} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={styles.centerContainer}>
              <Ionicons name="chatbubbles-outline" size={60} color="#333" />
              <Text style={styles.emptyText}>Bandeja vacía.</Text>
            </View>
          }
          renderItem={({ item }) => {
            // 👇 PROTECCIÓN ANTI-CRASH APLICADA AQUÍ (item.participants?.find) 👇
            const otherUser = item.participants?.find((p: any) => p.id !== currentUserId);
            
            // Si el backend no mandó al otro usuario, mostramos "Usuario Desconocido" en vez de crashear
            const displayUsername = otherUser?.adultUsername || otherUser?.username || 'Usuario Desconocido';
            const avatarUri = otherUser?.adultAvatarUrl || `https://ui-avatars.com/api/?name=${displayUsername}&background=0A0514&color=b829db&size=150`;
            const lastMessage = item.messages?.[0]?.text || "Toca para conversar...";

            return (
              <TouchableOpacity 
                style={styles.chatRow}
                onPress={() => navigation.navigate('ChatDetails', { chatId: item.id, chatName: displayUsername })}
              >
                <Image source={{ uri: avatarUri }} style={styles.avatar} />
                <View style={styles.chatInfo}>
                  <Text style={styles.chatName}>@{displayUsername}</Text>
                  <Text style={styles.chatMsg} numberOfLines={1}>{lastMessage}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#333" />
              </TouchableOpacity>
            );
          }}
        />
      )}

      {/* MODAL DE BÚSQUEDA SECRETA */}
      <Modal visible={menuVisible} transparent={true} animationType="slide">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => { setMenuVisible(false); Keyboard.dismiss(); }}>
          <TouchableOpacity activeOpacity={1} style={styles.bottomSheet}>
            <View style={styles.bottomSheetHandle} />
            <Text style={{ color: '#FFF', fontSize: 18, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' }}>Nuevo Chat Secreto</Text>

            <View style={styles.searchBar}>
              <Ionicons name="search-outline" size={20} color="#555" />
              <TextInput 
                style={styles.searchInput} 
                placeholder="Buscar alias secreto..." 
                placeholderTextColor="#555"
                value={searchQuery}
                onChangeText={handleSearchUsers}
                autoFocus={true}
              />
            </View>

            <FlatList
                data={searchResults}
                keyExtractor={item => item.id}
                style={{ maxHeight: 250, marginBottom: 15 }}
                keyboardShouldPersistTaps="handled"
                ListEmptyComponent={<Text style={{ color: '#555', textAlign: 'center', marginVertical: 10 }}>Busca a otros creadores por su nombre.</Text>}
                renderItem={({ item }) => {
                  const displayUsername = item.adultUsername || item.username;
                  const avatarUri = item.adultAvatarUrl || `https://ui-avatars.com/api/?name=${displayUsername}&background=0A0514&color=b829db&size=150`;

                  return (
                    <TouchableOpacity 
                      style={styles.searchResultRow}
                      onPress={() => handleStartChat(item.id, displayUsername)}
                    >
                      <Image source={{ uri: avatarUri }} style={styles.searchAvatar} />
                      <Text style={{ color: '#FFF', fontSize: 16, fontWeight: '500' }}>@{displayUsername}</Text>
                    </TouchableOpacity>
                  );
                }}
              />
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: DARK_BG },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 50, paddingBottom: 15, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: '#2A1A3D' },
  headerSpacer: { width: 28 },
  headerTitle: { color: DARK_ACCENT, fontSize: 18, fontWeight: 'bold' },
  headerIcon: { padding: 5 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 50 },
  emptyText: { color: '#888', fontSize: 16, fontWeight: 'bold', marginTop: 15 },
  
  chatRow: { flexDirection: 'row', paddingVertical: 15, paddingHorizontal: 20, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#1A0E2A' },
  avatar: { width: 56, height: 56, borderRadius: 28, borderWidth: 1, borderColor: DARK_ACCENT },
  chatInfo: { flex: 1, marginLeft: 15, justifyContent: 'center' },
  chatName: { color: '#FFF', fontSize: 16, fontWeight: '600', marginBottom: 3 },
  chatMsg: { color: '#888', fontSize: 14 },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  bottomSheet: { backgroundColor: DARK_SURFACE, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 40, minHeight: 400, borderWidth: 1, borderColor: '#2A1A3D' },
  bottomSheetHandle: { width: 40, height: 4, backgroundColor: '#555', borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#000', borderRadius: 12, paddingHorizontal: 15, marginBottom: 20, borderWidth: 1, borderColor: '#2A1A3D' },
  searchInput: { flex: 1, color: '#FFF', fontSize: 16, paddingVertical: 12, paddingHorizontal: 10 },
  
  searchResultRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#1A0E2A' },
  searchAvatar: { width: 40, height: 40, borderRadius: 20, marginRight: 15, borderWidth: 1, borderColor: DARK_ACCENT }
});