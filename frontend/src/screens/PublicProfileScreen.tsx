// frontend/src/screens/PublicProfileScreen.tsx
import React, { useState, useEffect, useRef } from 'react';
import { 
  View, Text, StyleSheet, Image, FlatList, TouchableOpacity, 
  Dimensions, ActivityIndicator, Alert, Share, Modal , Animated
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PanGestureHandler, State } from 'react-native-gesture-handler'; // 👈 Para deslizar
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
  
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // 👇 1. RESTAURAMOS isFollowing QUE SE HABÍA BORRADO 👇
  const [isFollowing, setIsFollowing] = useState(false);

  // 👇 2. ANIMACIÓN DEL LATIDO 👇
  const blinkAnim = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(blinkAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(blinkAnim, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  useEffect(() => {
    fetchPublicProfile();
  }, [userId]);

  const fetchPublicProfile = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/users/${userId}/public`);
      setProfile(response.data);
      setIsFollowing(response.data.isFollowing || false);
    } catch (error) {
      console.log("Error cargando perfil público:", error);
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
      await axios.post(`${BACKEND_URL}/users/${userId}/follow`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (error) {
      console.log("Error al seguir usuario:", error);
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `¡Mira el perfil de @${profile?.username} en ViralShop! 🚀`,
      });
    } catch (error) {
      console.log("Error al compartir", error);
    }
  };

  const handleMessage = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        Alert.alert("Atención", "Debes iniciar sesión para enviar mensajes.");
        return;
      }
      const response = await axios.post(`${BACKEND_URL}/chats/start/${userId}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      navigation.navigate('ChatDetails', { 
        chatId: response.data.id, 
        chatName: profile?.username 
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

  // 👇 FUNCIÓN PARA VOLVER AL FEED AL DESLIZAR 👇
  const onSwipe = (event: any) => {
    if (event.nativeEvent.oldState === State.ACTIVE) {
      const { translationX, velocityX } = event.nativeEvent;
      if (translationX > 80 || velocityX > 500) {
        if (navigation.canGoBack()) {
          navigation.goBack();
        } else {
          navigation.navigate('Inicio'); // Si falla, lo forzamos al Feed principal
        }
      }
    }
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
    // 👇 ENVOLVEMOS TODA LA PANTALLA EN EL GESTO DE DESLIZAR 👇
    <PanGestureHandler onHandlerStateChange={onSwipe} activeOffsetX={[-30, 30]}>
      <View style={{ flex: 1, backgroundColor: COLORS.background }}>
        
        {/* CABECERA */}
        <View style={[styles.headerTop, { paddingTop: insets.top + 10 }]}>
          <View style={styles.headerLeft}>
            <Image source={require('../../assets/icon.png')} style={styles.appIcon} />
            <Text style={styles.appName}>ViralShop</Text>
          </View>
          <TouchableOpacity 
            style={styles.menuHeaderButton} 
            onPress={() => setReportModalVisible(true)}
          >
            <Ionicons name="ellipsis-vertical" size={24} color={COLORS.text} />
          </TouchableOpacity>
        </View>

        <FlatList
          data={profile?.videos || []}
          numColumns={3}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 120 }} // 👈 EVITA QUE LOS VIDEOS SE TAPEN CON EL MENÚ INFERIOR
          ListHeaderComponent={
            <View>
              <View style={[styles.profileInfo, { paddingHorizontal: 16 }]}>
                
                {/* 1. FILA: FOTO Y DATOS EN COLUMNAS */}
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 15 }}>
                  {/* 👇 FOTO CON ESCUDO 👇 */}
                  <View style={{ position: 'relative' }}>
                    <Image 
                      source={{ uri: avatarUri }} 
                      style={[styles.avatar, profile?.isVerified ? { borderColor: '#1DA1F2', borderWidth: 3 } : { borderColor: COLORS.accent, borderWidth: 3 }]} 
                    />
                    
                    {/* 👇 PUNTO DE CONEXIÓN 👇 */}
                    <Animated.View style={[
                      styles.onlineDotProfile,
                      { backgroundColor: profile?.isOnline ? COLORS.accent : '#888888' },
                      profile?.isOnline ? { opacity: blinkAnim } : { opacity: 1 }
                    ]} />

                    {/* 👇 ESCUDO 👇 */}
                    {profile?.isVerified && (
                      <View style={styles.verifiedBadgePhoto}>
                        <Ionicons name="shield-checkmark" size={22} color="#FFF" />
                      </View>
                    )}
                  </View>

                  <View style={{ flex: 1, marginLeft: 16, justifyContent: 'center' }}>
                    <View style={[styles.nameRow, { marginBottom: 4 }]}>
                      {/* 👇 NOMBRE CON ESCUDO (Actualizado al nuevo icono) 👇 */}
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={styles.name}>{profile?.name}</Text>
                        {profile?.isVerified && (
                          <Ionicons name="shield-checkmark" size={16} color="#1DA1F2" style={{ marginLeft: 4 }} />
                        )}
                      </View>
                      <Text style={styles.username}>@{profile?.username}</Text>
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <View style={{ flexDirection: 'row', marginRight: 8 }}>
                        {[1, 2, 3, 4, 5].map((i) => (
                          <Ionicons key={i} name={i <= 4 ? "star" : "star-outline"} size={14} color={COLORS.accent} style={{ marginRight: 2 }} />
                        ))}
                      </View>
                      <Text style={{ color: COLORS.accent, fontWeight: 'bold', fontSize: 13 }}>98%</Text>
                    </View>
                  </View>
                </View>

                {/* 2. FILA: DESCRIPCIÓN (COMPLETAMENTE ABAJO DE LA FOTO) */}
                <View style={{ marginBottom: 15 }}> 
                  <Text style={[styles.bioText, { textAlign: 'left', paddingHorizontal: 0, fontSize: 13 }]}>
                    {profile?.bio || '¡Hola! Estoy usando ViralShop 🚀'}
                  </Text>
                </View>

                {/* 3. FILA: BOTONES A LO LARGO DE TODA LA PANTALLA */}
                <View style={styles.actionButtonsRow}>
                  <TouchableOpacity 
                    style={[styles.followButton, isFollowing && styles.followingButton, { flex: 2 }]} 
                    onPress={handleFollow}
                  >
                    <Text style={[styles.followButtonText, isFollowing && { color: '#FFF' }]}>
                      {isFollowing ? 'Siguiendo' : 'Seguir'}
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity style={[styles.messageButton, { flex: 1.5 }]} onPress={handleMessage}>
                    <Text style={styles.messageButtonText}>Mensaje</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={[
                      styles.iconActionButton, 
                      profile?.phone ? { backgroundColor: '#25D366' } : { backgroundColor: '#222' }
                    ]}
                    onPress={() => profile?.phone && Alert.alert("WhatsApp", "Abriendo contacto...")}
                  >
                    <Ionicons name="logo-whatsapp" size={20} color={profile?.phone ? "#FFF" : "#555"} />
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.iconActionButton} onPress={handleShare}>
                    <Ionicons name="share-social" size={20} color="#FFF" />
                  </TouchableOpacity>
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

              {/* Pestaña de videos */}
              <View style={styles.tabsRow}>
                <View style={[styles.tab, styles.activeTab]}>
                  <Ionicons name="grid-outline" size={24} color={COLORS.text} />
                </View>
              </View>
            </View>
          }
          renderItem={({ item, index }) => {
            const catIcon = CATEGORIES_DATA.find(c => c.name === item.category)?.icon || 'cube-outline';
            return (
              <TouchableOpacity 
              style={styles.videoThumbnailContainer} 
              onPress={() => {
                // 👇 INYECTAMOS LOS DATOS DEL VENDEDOR 👇
                const videosConUsuario = (profile?.videos || []).map((v: any) => ({
                  ...v,
                  user: { username: profile?.username, avatarUrl: profile?.avatarUrl }
                }));
                navigation.navigate('SingleVideo', { videos: videosConUsuario, initialIndex: index });
              }}
            >
                <Image source={{ uri: getThumbnail(item.videoUrl) }} style={styles.videoThumbnail} />
                <View style={styles.catIconBadge}>
                  <Ionicons name={catIcon as any} size={14} color="#FFF" />
                </View>
                <View style={styles.videoDetailOverlay}>
                  <Text style={styles.videoDetailText} numberOfLines={1}>{item.description}</Text>
                </View>
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
            );
          }}
          ListEmptyComponent={
            <Text style={styles.emptyText}>Este usuario aún no ha subido videos.</Text>
          }
        />
        
        {/* MODAL DE REPORTE */}
        <Modal visible={reportModalVisible} transparent={true} animationType="fade">
          <TouchableOpacity 
            style={styles.modalOverlay} 
            activeOpacity={1} 
            onPress={() => setReportModalVisible(false)}
          >
            <View style={styles.bottomSheetReport}>
              <View style={styles.bottomSheetHandle} />
              <TouchableOpacity 
                style={styles.reportItem}
                onPress={() => {
                  setReportModalVisible(false);
                  Alert.alert("Denuncia recibida", "Gracias por informarnos. Revisaremos este perfil a la brevedad.");
                }}
              >
                <Ionicons name="flag-outline" size={22} color="#FF2D55" />
                <Text style={styles.reportItemText}>Denunciar perfil</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.reportItem, { borderBottomWidth: 0 }]}
                onPress={() => setReportModalVisible(false)}
              >
                <Text style={{ color: COLORS.textMuted, fontSize: 16 }}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>

      </View>
    </PanGestureHandler>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  loadingContainer: { flex: 1, backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center' },
  
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: '#1A0E2A' },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  appIcon: { width: 34, height: 34, borderRadius: 8, marginRight: 8 },
  appName: { color: COLORS.text, fontSize: 18, fontWeight: 'bold' },
  menuHeaderButton: { padding: 5, marginRight: -5 },
  
  profileInfo: { paddingVertical: 15 },
  avatar: { width: 90, height: 90, borderRadius: 45 },
  nameRow: { marginBottom: 10 },
  name: { color: COLORS.text, fontSize: 16, fontWeight: '700' },
  username: { color: COLORS.textMuted, fontSize: 13, fontWeight: '500' },
  bioText: { color: COLORS.text, fontSize: 13, marginTop: 5, lineHeight: 18 },
  verifiedBadgePhoto: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#1DA1F2',
    borderRadius: 12,
    padding: 1,
    borderWidth: 2,
    borderColor: COLORS.background
  },
  onlineDotProfile: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2.5,
    borderColor: COLORS.background, // Borde del color de fondo para que recorte la foto
    zIndex: 10,
  },
  
  // BOTONES (Ocupando todo el ancho)
  actionButtonsRow: { flexDirection: 'row', alignItems: 'center', gap: 8, width: '100%', marginBottom: 20 },
  followButton: { backgroundColor: COLORS.accent, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  followButtonText: { color: '#000', fontSize: 14, fontWeight: 'bold' },
  followingButton: { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#444' },
  messageButton: { backgroundColor: COLORS.surface, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: '#333', alignItems: 'center' },
  messageButtonText: { color: COLORS.text, fontSize: 14, fontWeight: '600' },
  iconActionButton: { width: 44, height: 40, borderRadius: 8, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: '#333', justifyContent: 'center', alignItems: 'center' },

  // Estadísticas
  statsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingVertical: 12, borderTopWidth: 0.5, borderTopColor: '#333', marginTop: 10 },
  statItem: { alignItems: 'center', flex: 1 },
  statSeparator: { width: 1, height: 32, backgroundColor: '#444' },
  statValue: { color: COLORS.text, fontSize: 18, fontWeight: 'bold' },
  statLabel: { color: COLORS.textMuted, fontSize: 12 },
  
  catIconBadge: { position: 'absolute', top: 5, right: 5, backgroundColor: 'rgba(0,0,0,0.4)', padding: 4, borderRadius: 10 },
  videoDetailOverlay: { position: 'absolute', bottom: 25, left: 5, right: 5 },
  videoDetailText: { color: '#FFF', fontSize: 10, fontWeight: '500', textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 },
  bottomDataRow: { position: 'absolute', bottom: 5, left: 5, right: 5, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  miniPriceTag: { backgroundColor: COLORS.accent, paddingHorizontal: 5, paddingVertical: 2, borderRadius: 4 },
  miniPriceText: { color: '#000', fontSize: 10, fontWeight: 'bold' },
  miniViewsContainer: { flexDirection: 'row', alignItems: 'center' },

  tabsRow: { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: '#333' },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 12 },
  activeTab: { borderBottomWidth: 2, borderBottomColor: COLORS.text },
  
  videoThumbnailContainer: { width: COLUMN_WIDTH, height: COLUMN_WIDTH * 1.3, borderWidth: 0.5, borderColor: '#000' },
  videoThumbnail: { width: '100%', height: '100%', backgroundColor: '#222' },
  viewsContainer: { position: 'absolute', bottom: 5, left: 5, flexDirection: 'row', alignItems: 'center' },
  viewsText: { color: '#FFF', fontSize: 12, marginLeft: 3, fontWeight: 'bold' },
  emptyText: { color: COLORS.textMuted, textAlign: 'center', marginTop: 50, fontSize: 16 },

  // Estilos del Modal de Reporte
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  bottomSheetReport: { backgroundColor: COLORS.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 40 },
  bottomSheetHandle: { width: 40, height: 4, backgroundColor: '#555', borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  reportItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 18, borderBottomWidth: 0.5, borderBottomColor: '#333' },
  reportItemText: { color: '#FF2D55', fontSize: 16, fontWeight: 'bold', marginLeft: 15 },
});