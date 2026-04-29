// frontend/src/screens/AdultPublicProfileScreen.tsx
import React, { useState, useEffect, useRef } from 'react';
import { 
  View, Text, StyleSheet, Image, FlatList, TouchableOpacity, 
  Dimensions, ActivityIndicator, Alert, Share, Modal, Animated
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCurrency } from '../context/CurrencyContext';
import { formatCurrency } from '../utils/formatters';

const { width } = Dimensions.get('window');
const COLUMN_WIDTH = width / 3;
const BACKEND_URL = 'https://viralshop-xr9v.onrender.com';

// Paleta Oscura/VIP
const DARK_BG = '#0A0514';
const DARK_SURFACE = '#110A1F';
const DARK_ACCENT = '#b829db';

const REPORT_REASONS = [
  { id: 'fraude', label: 'Fraude o estafa', icon: 'warning-outline', color: '#FF9500' },
  { id: 'acoso', label: 'Acoso o incitación al odio', icon: 'hand-left-outline', color: '#FF3B30' },
  { id: 'falso', label: 'Suplantación de identidad', icon: 'person-remove-outline', color: '#8E8E93' },
  { id: 'violencia', label: 'Violencia explícita o ilegal', icon: 'skull-outline', color: '#FFF' }
];

export default function AdultPublicProfileScreen({ route, navigation }: any) {
  const { userId } = route.params;
  const insets = useSafeAreaInsets();
  const { currency, exchangeRate } = useCurrency();
  
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);

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
    const fetchPublicProfile = async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        // Usa la misma ruta, el backend ya envía todo
        const response = await axios.get(`${BACKEND_URL}/users/${userId}/adult-public`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        setProfile(response.data);
        setIsFollowing(response.data.isFollowing || false);
      } catch (error) {
        Alert.alert("Error", "No se pudo cargar el perfil del creador.");
      } finally {
        setLoading(false);
      }
    };
    fetchPublicProfile();
  }, [userId]);

  const handleFollow = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) return Alert.alert("Atención", "Debes iniciar sesión.");
      setIsFollowing(!isFollowing);
      // Asume que tienes un endpoint para seguir el perfil adulto si lo separaste
      // Si no lo separaste y comparten seguidores, usa el mismo. Aquí asumo que comparten, o ajusta la ruta.
      await axios.post(`${BACKEND_URL}/users/${userId}/adult-follow`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (error) {}
  };

  const handleMessage = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) return Alert.alert("Atención", "Debes iniciar sesión.");
      const response = await axios.post(`${BACKEND_URL}/chats/start/${userId}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Navega al ChatDetails VIP si existe
      navigation.navigate('ChatDetails', { 
        chatId: response.data.id, 
        chatName: profile?.adultUsername || profile?.username 
      });
    } catch (error) {
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

  const onSwipe = (event: any) => {
    if (event.nativeEvent.oldState === State.ACTIVE) {
      const { translationX, velocityX } = event.nativeEvent;
      if (translationX > 80 || velocityX > 500) {
        if (navigation.canGoBack()) navigation.goBack();
        else navigation.navigate('Feed');
      }
    }
  };

  if (loading) return <View style={styles.loadingContainer}><ActivityIndicator size="large" color={DARK_ACCENT} /></View>;

  const displayUsername = profile?.adultUsername || profile?.username || 'Creador';
  const avatarUri = profile?.adultAvatarUrl || `https://ui-avatars.com/api/?name=${displayUsername}&background=0A0514&color=b829db&size=150`;

  // EL MURO: Filtrar los videos de este creador para mostrar solo los de la Bóveda (+18)
  const adultVideos = (profile?.videos || []).filter((v: any) => v.is18Plus === true);

  return (
    <PanGestureHandler onHandlerStateChange={onSwipe} activeOffsetX={[-30, 30]}>
      <View style={{ flex: 1, backgroundColor: DARK_BG }}>
        
        <View style={[styles.headerTop, { paddingTop: insets.top + 10 }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 5 }}>
            <Ionicons name="chevron-back" size={28} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.appName}>@{displayUsername}</Text>
          <TouchableOpacity style={styles.menuHeaderButton} onPress={() => setReportModalVisible(true)}>
            <Ionicons name="ellipsis-vertical" size={24} color="#FFF" />
          </TouchableOpacity>
        </View>

        <FlatList
          data={adultVideos}
          numColumns={3}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 120 }}
          ListHeaderComponent={
            <View>
              <View style={[styles.profileInfo, { paddingHorizontal: 16 }]}>
                
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 15 }}>
                  <View style={{ position: 'relative' }}>
                    <Image source={{ uri: avatarUri }} style={[styles.avatar, profile?.isVerified ? { borderColor: '#1DA1F2', borderWidth: 3 } : { borderColor: DARK_ACCENT, borderWidth: 3 }]} />
                    <Animated.View style={[styles.onlineDotProfile, { backgroundColor: profile?.isOnline ? DARK_ACCENT : '#888888' }, profile?.isOnline ? { opacity: blinkAnim } : { opacity: 1 }]} />
                    {profile?.isVerified && (
                      <View style={styles.verifiedBadgePhoto}>
                        <Ionicons name="shield-checkmark" size={22} color="#FFF" />
                      </View>
                    )}
                  </View>

                  <View style={{ flex: 1, marginLeft: 16, justifyContent: 'center' }}>
                    <View style={[styles.nameRow, { marginBottom: 4 }]}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={styles.name}>{profile?.name || displayUsername}</Text>
                        {profile?.isVerified && <Ionicons name="shield-checkmark" size={16} color="#1DA1F2" style={{ marginLeft: 4 }} />}
                      </View>
                      <Text style={styles.username}>@{displayUsername}</Text>
                    </View>
                  </View>
                </View>

                <View style={{ marginBottom: 15 }}> 
                  <Text style={styles.bioText}>{profile?.adultBio || 'Creador de contenido.'}</Text>
                </View>

                <View style={styles.actionButtonsRow}>
                  <TouchableOpacity style={[styles.followButton, isFollowing && styles.followingButton, { flex: 2 }]} onPress={handleFollow}>
                    <Text style={[styles.followButtonText, isFollowing && { color: '#FFF' }]}>{isFollowing ? 'Siguiendo' : 'Seguir'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.messageButton, { flex: 1.5 }]} onPress={handleMessage}>
                    <Text style={styles.messageButtonText}>Mensaje</Text>
                  </TouchableOpacity>
                </View>

                {/* Asumiendo que usas contadores separados para el perfil adulto */}
                <View style={styles.statsRow}>
                  <View style={styles.statItem}><Text style={styles.statValue}>{profile?.adultFollowingCount || 0}</Text><Text style={styles.statLabel}>Siguiendo</Text></View>
                  <View style={styles.statSeparator} />
                  <View style={styles.statItem}><Text style={styles.statValue}>{profile?.adultFollowersCount || 0}</Text><Text style={styles.statLabel}>Seguidores</Text></View>
                  <View style={styles.statSeparator} />
                  <View style={styles.statItem}><Text style={styles.statValue}>{adultVideos.length}</Text><Text style={styles.statLabel}>Publicaciones</Text></View>
                </View>

              </View>
            </View>
          }
          renderItem={({ item, index }) => (
            <TouchableOpacity 
              style={styles.videoThumbnailContainer} 
              onPress={() => {
                const videosConUsuario = adultVideos.map((v: any) => ({
                  ...v, user: { username: displayUsername, avatarUrl: avatarUri, isVerified: profile?.isVerified }
                }));
                navigation.navigate('SingleVideo', { videos: videosConUsuario, initialIndex: index });
              }}
            >
              <Image source={{ uri: getThumbnail(item.videoUrl) }} style={styles.videoThumbnail} />
              <View style={styles.videoDetailOverlay}>
                <Text style={styles.videoDetailText} numberOfLines={1}>{item.description}</Text>
              </View>
              {item.productPrice && (
                <View style={styles.bottomDataRow}>
                  <View style={styles.miniPriceTag}><Text style={styles.miniPriceText}>{formatCurrency(item.productPrice, currency, exchangeRate)}</Text></View>
                </View>
              )}
            </TouchableOpacity>
          )}
          ListEmptyComponent={<Text style={styles.emptyText}>Este creador no ha publicado contenido.</Text>}
        />

        {/* MODAL DE REPORTE */}
        <Modal visible={reportModalVisible} transparent={true} animationType="slide">
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setReportModalVisible(false)}>
            <View style={[styles.bottomSheetReport, { minHeight: 450 }]}>
              <View style={styles.bottomSheetHandle} />
              <Text style={{ color: '#FFF', fontSize: 18, fontWeight: 'bold', marginBottom: 5, textAlign: 'center' }}>Reportar Creador</Text>
              <Text style={{ color: '#888', fontSize: 13, textAlign: 'center', marginBottom: 20 }}>Tu denuncia es confidencial.</Text>

              <FlatList 
                data={REPORT_REASONS}
                keyExtractor={item => item.id}
                renderItem={({item: reason}) => (
                  <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 0.5, borderBottomColor: '#2A1A3D' }}
                    onPress={() => {
                      setReportModalVisible(false);
                      // Lógica de reporte
                    }}
                  >
                    <Ionicons name={reason.icon as any} size={20} color={reason.color} style={{ marginRight: 15 }} />
                    <Text style={{ color: '#FFF', fontSize: 15, flex: 1 }}>{reason.label}</Text>
                  </TouchableOpacity>
                )}
              />
            </View>
          </TouchableOpacity>
        </Modal>

      </View>
    </PanGestureHandler>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: DARK_BG },
  loadingContainer: { flex: 1, backgroundColor: DARK_BG, justifyContent: 'center', alignItems: 'center' },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: '#1A0E2A' },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  appIcon: { width: 34, height: 34, borderRadius: 8, marginRight: 8 },
  appName: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  menuHeaderButton: { padding: 5, marginRight: -5 },
  profileInfo: { paddingVertical: 15 },
  avatar: { width: 90, height: 90, borderRadius: 45 },
  nameRow: { marginBottom: 10 },
  name: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  username: { color: '#888', fontSize: 13, fontWeight: '500' },
  bioText: { color: '#FFF', fontSize: 13, marginTop: 5, lineHeight: 18 },
  verifiedBadgePhoto: { position: 'absolute', bottom: 0, right: 0, backgroundColor: '#1DA1F2', borderRadius: 12, padding: 1, borderWidth: 2, borderColor: DARK_BG },
  onlineDotProfile: { position: 'absolute', top: 5, right: 5, width: 16, height: 16, borderRadius: 8, borderWidth: 2.5, borderColor: DARK_BG, zIndex: 10 },
  actionButtonsRow: { flexDirection: 'row', alignItems: 'center', gap: 8, width: '100%', marginBottom: 20 },
  followButton: { backgroundColor: DARK_ACCENT, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  followButtonText: { color: '#000', fontSize: 14, fontWeight: 'bold' },
  followingButton: { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#555' },
  messageButton: { backgroundColor: DARK_SURFACE, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: '#2A1A3D', alignItems: 'center' },
  messageButtonText: { color: '#FFF', fontSize: 14, fontWeight: '600' },
  statsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingVertical: 12, borderTopWidth: 0.5, borderTopColor: '#2A1A3D', marginTop: 10 },
  statItem: { alignItems: 'center', flex: 1 },
  statSeparator: { width: 1, height: 32, backgroundColor: '#2A1A3D' },
  statValue: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  statLabel: { color: '#888', fontSize: 12 },
  videoThumbnailContainer: { width: COLUMN_WIDTH, height: COLUMN_WIDTH * 1.3, borderWidth: 0.5, borderColor: '#000' },
  videoThumbnail: { width: '100%', height: '100%', backgroundColor: '#222' },
  videoDetailOverlay: { position: 'absolute', bottom: 25, left: 5, right: 5 },
  videoDetailText: { color: '#FFF', fontSize: 10, fontWeight: '500', textShadowColor: '#000', textShadowRadius: 2 },
  bottomDataRow: { position: 'absolute', bottom: 5, left: 5, right: 5, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  miniPriceTag: { backgroundColor: DARK_ACCENT, paddingHorizontal: 5, paddingVertical: 2, borderRadius: 4 },
  miniPriceText: { color: '#000', fontSize: 10, fontWeight: 'bold' },
  emptyText: { color: '#888', textAlign: 'center', marginTop: 50, fontSize: 16 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  bottomSheetReport: { backgroundColor: DARK_SURFACE, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 40, borderWidth: 1, borderColor: '#2A1A3D' },
  bottomSheetHandle: { width: 40, height: 4, backgroundColor: '#555', borderRadius: 2, alignSelf: 'center', marginBottom: 20 }
});