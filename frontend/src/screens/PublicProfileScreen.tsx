// frontend/src/screens/PublicProfileScreen.tsx
import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, Image, FlatList, TouchableOpacity, 
  Dimensions, ActivityIndicator, Alert 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CATEGORIES_DATA } from '../data/categories';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS } from '../theme/colors';

const { width } = Dimensions.get('window');
const COLUMN_WIDTH = width / 3;
const BACKEND_URL = 'https://viralshop-xr9v.onrender.com';

export default function PublicProfileScreen({ route, navigation }: any) {
  const { userId } = route.params;
  const insets = useSafeAreaInsets();
  
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);

  useEffect(() => {
    fetchPublicProfile();
  }, [userId]);

  const fetchPublicProfile = async () => {
    try {
      // 👇 CONEXIÓN REAL: Usamos el ID para traer los datos reales del backend
      const response = await axios.get(`${BACKEND_URL}/users/${userId}/public`);
      setProfile(response.data);
      setIsFollowing(response.data.isFollowing || false);
    } catch (error) {
      console.log("Error cargando perfil público:", error);
      // En caso de error, mostramos un aviso al usuario
      Alert.alert("Error", "No se pudo cargar la información del perfil.");
    } finally {
      setLoading(false);
    }
  };

  const handleFollow = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        Alert.alert("Atención", "Debes iniciar sesión para seguir a otros usuarios.");
        return;
      }
      setIsFollowing(!isFollowing);
      // Endpoint para registrar el seguimiento en la base de datos
      await axios.post(`${BACKEND_URL}/users/${userId}/follow`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (error) {
      console.log("Error al seguir usuario:", error);
    }
  };

  const handleMessage = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        Alert.alert("Atención", "Debes iniciar sesión para enviar mensajes.");
        return;
      }
      
      // 1. Llamamos al backend para que nos dé o nos cree el chat
      const response = await axios.post(`${BACKEND_URL}/chats/start/${userId}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // 2. Viajamos a la pantalla de chat pasándole el ID real de la conversación
      navigation.navigate('ChatDetails', { 
        chatId: response.data.id, // 👈 Ahora enviamos el ID del chat
        participantName: profile?.username 
      });
      
    } catch (error) {
      console.log("Error al iniciar el chat:", error);
      Alert.alert("Error", "No se pudo abrir la conversación.");
    }
  };

  const getThumbnail = (videoUrl: string) => {
    if (videoUrl && videoUrl.includes('mux.com')) {
      const parts = videoUrl.split('/');
      const playbackId = parts[parts.length - 1].split('.')[0];
      return `https://image.mux.com/${playbackId}/thumbnail.jpg?time=1`;
    }
    return 'https://via.placeholder.com/150';
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.accent} />
      </View>
    );
  }

  const avatarUri = profile?.avatarUrl 
    ? profile.avatarUrl 
    : `https://ui-avatars.com/api/?name=${profile?.username || 'User'}&background=random&color=fff&size=150`;

  return (
    <View style={styles.container}>
      {/* 1. CABECERA CON LOGO (Estilo idéntico a tu ProfileScreen) */}
      <View style={[styles.headerTop, { paddingTop: insets.top + 10 }]}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: 15 }}>
            <Ionicons name="chevron-back" size={28} color="#FFF" />
          </TouchableOpacity>
          <Image source={require('../../assets/icon.png')} style={styles.appIcon} />
          <Text style={styles.appName}>ViralShop</Text>
        </View>
        <TouchableOpacity style={styles.shareButton}>
          <Ionicons name="share-social-outline" size={24} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={profile?.videos || []}
        numColumns={3}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View>
            {/* 2. INFO DEL PERFIL */}
            <View style={[styles.profileInfo, { paddingHorizontal: 16 }]}>
              
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 }}>
                <Image source={{ uri: avatarUri }} style={[styles.avatar, { borderColor: COLORS.accent, borderWidth: 3 }]} />

                <View style={{ flex: 1, marginLeft: 16 }}>
                  {/* Nombre y Username */}
                  <View style={styles.nameRow}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={styles.name}>{profile?.name}</Text>
                      {profile?.isVerified && (
                        <Ionicons name="checkmark-circle" size={16} color="#1DA1F2" style={{ marginLeft: 4 }} />
                      )}
                    </View>
                    <Text style={styles.username}>@{profile?.username}</Text>
                  </View>

                  {/* 👇 BOTONES DE INTERACCIÓN 👇 */}
                  <View style={styles.actionButtonsRow}>
                    <TouchableOpacity 
                      style={[styles.followButton, isFollowing && styles.followingButton]} 
                      onPress={handleFollow}
                    >
                      <Text style={[styles.followButtonText, isFollowing && { color: '#FFF' }]}>
                        {isFollowing ? 'Siguiendo' : 'Seguir'}
                      </Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity style={styles.messageButton} onPress={handleMessage}>
                      <Text style={styles.messageButtonText}>Mensaje</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Biografía */}
                  <View style={{ paddingRight: 20 }}> 
                    <Text style={styles.bioText}>
                      {profile?.bio || '¡Hola! Estoy usando ViralShop 🚀'}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Estadísticas del perfil */}
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{profile?.followingCount || 0}</Text>
                  <Text style={styles.statLabel}>Siguiendo</Text>
                </View>
                <View style={styles.statSeparator} />
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{profile?.followersCount || 0}</Text>
                  <Text style={styles.statLabel}>Seguidores</Text>
                </View>
                <View style={styles.statSeparator} />
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{profile?.likesCount || 0}</Text>
                  <Text style={styles.statLabel}>Me gusta</Text>
                </View>
              </View>
            </View>

            {/* Pestaña de videos (Única pública) */}
            <View style={styles.tabsRow}>
              <View style={[styles.tab, styles.activeTab]}>
                <Ionicons name="grid-outline" size={24} color={COLORS.text} />
              </View>
            </View>
          </View>
        }
        renderItem={({ item }) => { // ✅ 1. ABRIR CON LLAVE
          const catIcon = CATEGORIES_DATA.find(c => c.name === item.category)?.icon || 'cube-outline';

          return (
            <TouchableOpacity style={styles.videoThumbnailContainer} onPress={() => navigation.navigate('SingleVideo', { video: item })}>
              <Image source={{ uri: getThumbnail(item.videoUrl) }} style={styles.videoThumbnail} />
              
              {/* Ícono de Categoría (Arriba-Derecha) */}
              <View style={styles.catIconBadge}>
                <Ionicons name={catIcon as any} size={14} color="#FFF" />
              </View>

              {/* Detalle/Descripción corta (Sobre el precio) */}
              <View style={styles.videoDetailOverlay}>
                <Text style={styles.videoDetailText} numberOfLines={1}>{item.description}</Text>
              </View>

              {/* Fila inferior: Precio y Vistas */}
              <View style={styles.bottomDataRow}>
                {item.productPrice ? (
                  <View style={styles.miniPriceTag}>
                    <Text style={styles.miniPriceText}>${item.productPrice}</Text>
                  </View>
                ) : <View />}

                <View style={styles.miniViewsContainer}>
                  <Ionicons name="play-outline" size={10} color="#FFF" />
                  <Text style={styles.viewsText}>{item.viewCount || 0}</Text>
                </View>
              </View>
            </TouchableOpacity>
          ); // ✅ 2. CERRAMOS EL RETURN
        }} // ✅ 3. CERRAMOS CON LLAVE
        ListEmptyComponent={
          <Text style={styles.emptyText}>Este usuario aún no ha subido videos.</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  loadingContainer: { flex: 1, backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center' },
  
  // Estilos de cabecera
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: '#1A0E2A' },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  appIcon: { width: 34, height: 34, borderRadius: 8, marginRight: 8 },
  appName: { color: COLORS.text, fontSize: 18, fontWeight: 'bold' },
  shareButton: { padding: 5 },
  
  // Perfil Info
  profileInfo: { paddingVertical: 15 },
  avatar: { width: 100, height: 100, borderRadius: 50 },
  nameRow: { marginBottom: 10 },
  name: { color: COLORS.text, fontSize: 16, fontWeight: '700' },
  username: { color: COLORS.textMuted, fontSize: 13, fontWeight: '500' },
  bioText: { color: COLORS.text, fontSize: 13, marginTop: 5, lineHeight: 18 },
  
  // Botones de interacción
  actionButtonsRow: { flexDirection: 'row', gap: 10, marginVertical: 10 },
  followButton: { flex: 1, backgroundColor: COLORS.accent, paddingVertical: 8, borderRadius: 6, alignItems: 'center' },
  followButtonText: { color: '#000', fontSize: 14, fontWeight: 'bold' },
  followingButton: { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#444' },
  messageButton: { flex: 1, backgroundColor: COLORS.surface, paddingVertical: 8, borderRadius: 6, borderWidth: 1, borderColor: '#333', alignItems: 'center' },
  messageButtonText: { color: COLORS.text, fontSize: 14, fontWeight: '600' },

  // Estadísticas
  statsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingVertical: 12, borderTopWidth: 0.5, borderTopColor: '#333', marginTop: 10 },
  statItem: { alignItems: 'center', flex: 1 },
  statSeparator: { width: 1, height: 32, backgroundColor: '#444' },
  statValue: { color: COLORS.text, fontSize: 18, fontWeight: 'bold' },
  statLabel: { color: COLORS.textMuted, fontSize: 12 },
  
  // 👇 ESTILOS PARA MINIATURAS ENRIQUECIDAS 👇
  catIconBadge: { 
    position: 'absolute', top: 5, right: 5, 
    backgroundColor: 'rgba(0,0,0,0.4)', padding: 4, borderRadius: 10 
  },
  videoDetailOverlay: { 
    position: 'absolute', bottom: 25, left: 5, right: 5 
  },
  videoDetailText: { 
    color: '#FFF', fontSize: 10, fontWeight: '500', 
    textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 
  },
  bottomDataRow: { 
    position: 'absolute', bottom: 5, left: 5, right: 5, 
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' 
  },
  miniPriceTag: { 
    backgroundColor: COLORS.accent, paddingHorizontal: 5, paddingVertical: 2, borderRadius: 4 
  },
  miniPriceText: { color: '#000', fontSize: 10, fontWeight: 'bold' },
  miniViewsContainer: { flexDirection: 'row', alignItems: 'center' },


  // Tabs
  tabsRow: { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: '#333' },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 12 },
  activeTab: { borderBottomWidth: 2, borderBottomColor: COLORS.text },
  
  // Grilla de Videos
  videoThumbnailContainer: { width: COLUMN_WIDTH, height: COLUMN_WIDTH * 1.3, borderWidth: 0.5, borderColor: '#000' },
  videoThumbnail: { width: '100%', height: '100%', backgroundColor: '#222' },
  viewsContainer: { position: 'absolute', bottom: 5, left: 5, flexDirection: 'row', alignItems: 'center' },
  viewsText: { color: '#FFF', fontSize: 12, marginLeft: 3, fontWeight: 'bold' },
  emptyText: { color: COLORS.textMuted, textAlign: 'center', marginTop: 50, fontSize: 16 },
});