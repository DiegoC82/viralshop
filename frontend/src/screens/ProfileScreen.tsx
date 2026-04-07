// frontend/src/screens/ProfileScreen.tsx
import React, { useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Image, 
  FlatList, 
  TouchableOpacity, 
  Dimensions, 
  ActivityIndicator, 
  Alert,
  Modal 
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';

const { width } = Dimensions.get('window');
const COLUMN_WIDTH = width / 3;
const BACKEND_URL = 'https://viralshop-xr9v.onrender.com';

export default function ProfileScreen({ navigation }: any) {
  // Estados de Datos
  const [profile, setProfile] = useState<any>(null);
  
  // Estados de UI y Auth
  const [loading, setLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isGuest, setIsGuest] = useState(false);
  const [activeTab, setActiveTab] = useState<'uploaded' | 'liked' | 'saved'>('uploaded');
  const [menuVisible, setMenuVisible] = useState(false);

  // 1. OBTENER DATOS DEL PERFIL
  const checkAuthAndFetchProfile = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      
      if (!token) {
        setIsGuest(true);
        setProfile(null);
        setLoading(false);
        return;
      }

      setIsGuest(false);
      // Aquí el backend debería devolver también tus videos guardados y likes
      const response = await axios.get(`${BACKEND_URL}/users/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProfile(response.data);
    } catch (error: any) {
      console.log("Error en perfil:", error.message);
      if (error.response?.status === 401) {
        await AsyncStorage.removeItem('userToken');
        setIsGuest(true);
      }
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      checkAuthAndFetchProfile();
    }, [])
  );

  // 2. SUBIR FOTO DE PERFIL (Tu lógica original con fetch)
  const handleChangeAvatar = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso denegado', 'Necesitamos acceso a tu galería para cambiar la foto.');
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5, 
    });

    if (!result.canceled) {
      setIsUploading(true);
      try {
        const token = await AsyncStorage.getItem('userToken');
        const formData = new FormData();
        
        const localUri = result.assets[0].uri;
        const filename = localUri.split('/').pop() || `avatar-${Date.now()}.jpg`;
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : `image/jpeg`;

        formData.append('avatar', { uri: localUri, name: filename, type: type } as any);

        const response = await axios.post(`${BACKEND_URL}/users/avatar`, formData, {
          headers: { 
            'Content-Type': 'multipart/form-data',
            'Authorization': `Bearer ${token}` 
          },
        });

        const responseData = response.data;
        setProfile({ ...profile, avatarUrl: responseData.avatarUrl });
        Alert.alert("¡Éxito!", "Foto de perfil actualizada.");
      } catch (error: any) {
        console.error("Error al subir foto:", error.response?.data || error.message);
        Alert.alert("Error", error.response?.data?.message || "No se pudo actualizar la foto.");
      } finally {
        setIsUploading(false);
      }
    }
  };

  // 3. CERRAR SESIÓN
  const handleLogout = async () => {
    await AsyncStorage.removeItem('userToken');
    setMenuVisible(false); // Cerramos el menú
    setIsGuest(true); 
    setProfile(null);
  };

  // 4. GENERADOR DE MINIATURAS MUX
  const getThumbnail = (videoUrl: string) => {
    if (videoUrl && videoUrl.includes('mux.com')) {
      const parts = videoUrl.split('/');
      const filePart = parts[parts.length - 1];
      const playbackId = filePart.split('.')[0];
      return `https://image.mux.com/${playbackId}/thumbnail.jpg?time=1`;
    }
    return 'https://via.placeholder.com/150';
  };

  // 5. DETERMINAR QUÉ LISTA DE VIDEOS MOSTRAR SEGÚN EL TAB
  const getActiveData = () => {
    if (!profile) return [];
    if (activeTab === 'uploaded') return profile.videos || [];
    if (activeTab === 'liked') return profile.likedVideos || []; // Asumiendo que el backend envía esto
    if (activeTab === 'saved') return profile.savedVideos || []; // Asumiendo que el backend envía esto
    return [];
  };

  // SUBCOMPONENTE: Estadísticas
  const StatItem = ({ label, value }: { label: string, value: string | number }) => (
    <View style={styles.statItem}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );

  // -------------------------------------------------------------
  // PARTE 2: RENDERIZADO Y ESTILOS
  // -------------------------------------------------------------

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.accent} />
      </View>
    );
  }

  // PANTALLA DE INVITADO
  if (isGuest) {
    return (
      <View style={styles.guestContainer}>
        <View style={styles.guestIconContainer}>
          <Ionicons name="person-outline" size={80} color={COLORS.textMuted} />
        </View>
        <Text style={styles.guestTitle}>Perfil de Invitado</Text>
        <Text style={styles.guestSubtitle}>
          Guarda tus videos favoritos, sigue a creadores y compra productos de forma 100% segura.
        </Text>
        <TouchableOpacity style={styles.guestButton} onPress={() => navigation.navigate('Auth')}>
          <Text style={styles.guestButtonText}>Registrarse o Iniciar Sesión</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const avatarUri = profile?.avatarUrl 
    ? `${profile.avatarUrl}?t=${new Date().getTime()}`
    : `https://ui-avatars.com/api/?name=${profile?.username || 'User'}&background=random&color=fff&size=150`;

  return (
    <View style={styles.container}>
      {/* 1. CABECERA SUPERIOR */}
      <View style={styles.headerTop}>
        <Ionicons name="person-add-outline" size={24} color={COLORS.text} />
        <Text style={styles.headerUsername}>@{profile?.username}</Text>
        <TouchableOpacity onPress={() => setMenuVisible(true)}>
          <Ionicons name="menu-outline" size={28} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={getActiveData()}
        keyExtractor={(item) => item.id}
        numColumns={3}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View>
            {/* 2. INFO DEL PERFIL */}
            <View style={styles.profileInfo}>
              <TouchableOpacity onPress={handleChangeAvatar} disabled={isUploading}>
                {isUploading ? (
                  <View style={[styles.avatar, { justifyContent: 'center', alignItems: 'center' }]}>
                    <ActivityIndicator color={COLORS.accent} />
                  </View>
                ) : (
                  <Image source={{ uri: avatarUri }} style={styles.avatar} />
                )}
              </TouchableOpacity>
              <Text style={styles.name}>{profile?.name}</Text>
              
              <View style={styles.statsRow}>
                {/* Asumimos que conectarás estos campos en el backend luego */}
                <StatItem value={profile?.followingCount || 0} label="Siguiendo" />
                <StatItem value={profile?.followersCount || 0} label="Seguidores" />
                <StatItem value={profile?.totalLikes || 0} label="Me gusta" />
              </View>

              {profile?.bio ? (
                <Text style={styles.bioText}>{profile.bio}</Text>
              ) : (
                <TouchableOpacity style={styles.addBioButton}>
                  <Text style={styles.addBioText}>+ Añadir descripción corta</Text>
                </TouchableOpacity>
              )}

              <View style={styles.actionButtonsRow}>
                <TouchableOpacity style={styles.editProfileButton} onPress={handleChangeAvatar}>
                  <Text style={styles.editProfileText}>Editar perfil</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.shareButton}>
                  <Text style={styles.editProfileText}>Compartir perfil</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* 3. TABS (Subidos, Likes, Guardados) */}
            <View style={styles.tabsRow}>
              <TouchableOpacity style={[styles.tab, activeTab === 'uploaded' && styles.activeTab]} onPress={() => setActiveTab('uploaded')}>
                <Ionicons name="grid-outline" size={24} color={activeTab === 'uploaded' ? COLORS.text : COLORS.textMuted} />
              </TouchableOpacity>
              <TouchableOpacity style={[styles.tab, activeTab === 'liked' && styles.activeTab]} onPress={() => setActiveTab('liked')}>
                <Ionicons name="heart-outline" size={24} color={activeTab === 'liked' ? COLORS.text : COLORS.textMuted} />
              </TouchableOpacity>
              <TouchableOpacity style={[styles.tab, activeTab === 'saved' && styles.activeTab]} onPress={() => setActiveTab('saved')}>
                <Ionicons name="bookmark-outline" size={24} color={activeTab === 'saved' ? COLORS.text : COLORS.textMuted} />
              </TouchableOpacity>
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.videoThumbnailContainer} onPress={() => navigation.navigate('SingleVideo', { video: item })}>
            <Image source={{ uri: getThumbnail(item.videoUrl) }} style={styles.videoThumbnail} />
            <View style={styles.viewsContainer}>
              <Ionicons name="play-outline" size={12} color="#FFF" />
              <Text style={styles.viewsText}>{item.viewCount || 0}</Text>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No hay videos aquí aún.</Text>
        }
      />

      {/* 4. MODAL DEL MENÚ HAMBURGUESA (Con Logout incluido) */}
      <Modal visible={menuVisible} transparent={true} animationType="slide" onRequestClose={() => setMenuVisible(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setMenuVisible(false)}>
          <View style={styles.bottomSheet}>
            <View style={styles.bottomSheetHandle} />
            <Text style={styles.menuTitle}>Herramientas de cuenta</Text>

            <TouchableOpacity 
              style={styles.menuItem}
              onPress={() => {
                setMenuVisible(false); // Cierra el modal
                navigation.navigate('SalesMetrics'); // Viaja a la pantalla
              }}
            >
              <Ionicons name="analytics-outline" size={24} color={COLORS.text} />
              <Text style={styles.menuItemText}>Métricas de Venta</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem}>
              <Ionicons name="wallet-outline" size={24} color={COLORS.text} />
              <Text style={styles.menuItemText}>Billetera e Ingresos</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem}>
              <Ionicons name="cube-outline" size={24} color={COLORS.text} />
              <Text style={styles.menuItemText}>Gestión de Productos</Text>
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
              <Ionicons name="log-out-outline" size={24} color="#FF2D55" />
              <Text style={[styles.menuItemText, { color: '#FF2D55' }]}>Cerrar Sesión</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  loadingContainer: { flex: 1, backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center' },
  
  // Cabecera superior
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 50, paddingHorizontal: 20, paddingBottom: 10 },
  headerUsername: { color: COLORS.text, fontSize: 18, fontWeight: 'bold' },
  
  // Perfil Info
  profileInfo: { alignItems: 'center', paddingVertical: 15 },
  avatar: { width: 96, height: 96, borderRadius: 48, marginBottom: 10, borderWidth: 1, borderColor: '#333' },
  name: { color: COLORS.text, fontSize: 16, fontWeight: '600', marginBottom: 15 },
  
  // Estadísticas
  statsRow: { flexDirection: 'row', width: '70%', justifyContent: 'space-between', marginBottom: 15 },
  statItem: { alignItems: 'center' },
  statValue: { color: COLORS.text, fontSize: 18, fontWeight: 'bold' },
  statLabel: { color: COLORS.textMuted, fontSize: 12 },
  
  // Biografía
  bioText: { color: COLORS.text, fontSize: 14, textAlign: 'center', paddingHorizontal: 40, marginBottom: 15 },
  addBioButton: { marginBottom: 15 },
  addBioText: { color: COLORS.accent, fontSize: 14, fontWeight: '600' },
  
  // Botones de acción
  actionButtonsRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  editProfileButton: { backgroundColor: COLORS.surface, paddingVertical: 10, paddingHorizontal: 30, borderRadius: 4, borderWidth: 1, borderColor: '#333' },
  shareButton: { backgroundColor: COLORS.surface, paddingVertical: 10, paddingHorizontal: 30, borderRadius: 4, borderWidth: 1, borderColor: '#333' },
  editProfileText: { color: COLORS.text, fontSize: 14, fontWeight: '600' },
  
  // Tabs
  tabsRow: { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: '#333' },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 12 },
  activeTab: { borderBottomWidth: 2, borderBottomColor: COLORS.text },
  
  // Grilla de Videos
  videoThumbnailContainer: { width: COLUMN_WIDTH, height: COLUMN_WIDTH * 1.3, borderWidth: 0.5, borderColor: '#000' },
  videoThumbnail: { width: '100%', height: '100%', backgroundColor: '#222' },
  viewsContainer: { position: 'absolute', bottom: 5, left: 5, flexDirection: 'row', alignItems: 'center' },
  viewsText: { color: '#FFF', fontSize: 12, marginLeft: 3, fontWeight: 'bold', textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 },
  emptyText: { color: COLORS.textMuted, textAlign: 'center', marginTop: 50, fontSize: 16 },

  // Modal / Menu Hamburguesa
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  bottomSheet: { backgroundColor: COLORS.surface, borderTopLeftRadius: 15, borderTopRightRadius: 15, padding: 20, paddingBottom: 40, minHeight: 300 },
  bottomSheetHandle: { width: 40, height: 4, backgroundColor: '#555', borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  menuTitle: { color: COLORS.text, fontSize: 14, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15 },
  menuItemText: { color: COLORS.text, fontSize: 16, marginLeft: 15, fontWeight: '500' },
  divider: { height: 1, backgroundColor: '#333', marginVertical: 10 },

  // Estilos de Invitado
  guestContainer: { flex: 1, backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center', padding: 30 },
  guestIconContainer: { width: 120, height: 120, borderRadius: 60, backgroundColor: COLORS.surface, justifyContent: 'center', alignItems: 'center', marginBottom: 30, borderWidth: 1, borderColor: '#333' },
  guestTitle: { fontSize: 24, fontWeight: 'bold', color: COLORS.text, marginBottom: 15 },
  guestSubtitle: { fontSize: 16, color: COLORS.textMuted, textAlign: 'center', marginBottom: 40, lineHeight: 24 },
  guestButton: { backgroundColor: COLORS.accent, paddingVertical: 16, paddingHorizontal: 40, borderRadius: 8, width: '100%', alignItems: 'center' },
  guestButtonText: { color: '#000', fontSize: 16, fontWeight: 'bold' }
});