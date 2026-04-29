// frontend/src/screens/AdultProfileScreen.tsx
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Image, FlatList, TouchableOpacity, Dimensions, ActivityIndicator, Alert, TextInput, Modal, Animated, Switch } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { useCurrency } from '../context/CurrencyContext';
import { formatCurrency } from '../utils/formatters';
import { ADULT_CATEGORIES } from '../data/adultCategories'; 

const { width } = Dimensions.get('window');
const COLUMN_WIDTH = width / 3;
const BACKEND_URL = 'https://viralshop-xr9v.onrender.com';

const DARK_BG = '#0A0514';
const DARK_SURFACE = '#110A1F';
const DARK_ACCENT = '#b829db'; 
const CELESTE_MAIN = '#1DA1F2'; 

export default function AdultProfileScreen({ navigation, route }: any) {
  const { currency, toggleCurrency, exchangeRate } = useCurrency();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // 👇 SEPARAMOS VIDEOS Y CONTENIDO EN DOS TABS DISTINTOS 👇
  const [activeTab, setActiveTab] = useState<'videos' | 'content' | 'ofertas' | 'liked' | 'metrics'>('videos');
  const [menuVisible, setMenuVisible] = useState(false);

  const [editMenuVisible, setEditMenuVisible] = useState(false);
  const [editAlias, setEditAlias] = useState('');
  const [editBio, setEditBio] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const isPaymentCompleted = route?.params?.paymentCompleted;

  const blinkAnim = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(blinkAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(blinkAnim, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const checkAuthAndFetchProfile = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await axios.get(`${BACKEND_URL}/users/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProfile(response.data);
    } catch (error) {
      console.log("Error en perfil nocturno:", error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { checkAuthAndFetchProfile(); }, []));

  // 👇 LÓGICA DE VERIFICACIÓN COMO CREADOR 👇
  const handleSimulateUploadDNI = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      await axios.patch(`${BACKEND_URL}/users/adult-profile`, { isAdultVerified: true }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      Alert.alert("DNI Subido", "Perfil de creador verificado con éxito.");
      setProfile({ ...profile, isAdultVerified: true });
      navigation.setParams({ paymentCompleted: false });
    } catch (error) {
      Alert.alert("Error", "No se pudo guardar la verificación en el servidor.");
    }
  };

  const handleRemoveVerification = () => {
    setProfile({ ...profile, isAdultVerified: false });
    setEditMenuVisible(false);
    navigation.setParams({ paymentCompleted: false });
    Alert.alert("Modo Test", "Se ha quitado la verificación de creador.");
  };

  // 👇 FILTROS PARA LAS NUEVAS PESTAÑAS 👇
  const getActiveData = () => {
    if (!profile) return [];
    const adultVideos = (profile.videos || []).filter((v: any) => v.is18Plus === true);
    const adultLikes = (profile.likes || []).filter((l: any) => l.video?.is18Plus === true).map((l: any) => l.video);

    switch (activeTab) {
      case 'videos': return adultVideos; 
      case 'content': return []; // Próximamente: filtrar solo fotos o galerías
      case 'ofertas': return adultVideos.filter((v: any) => v.discountPrice != null && v.discountPrice > 0);
      case 'liked': return adultLikes;
      case 'metrics': return [{ id: 'metrics-view' }];
      default: return [];
    }
  };

  const handleSaveIdentity = async () => {
    setIsSavingProfile(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      await axios.patch(`${BACKEND_URL}/users/adult-profile`, 
        { adultUsername: editAlias, adultBio: editBio },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setProfile({ ...profile, adultUsername: editAlias, adultBio: editBio });
      setEditMenuVisible(false);
      Alert.alert("¡Éxito!", "Tu identidad secreta ha sido actualizada.");
    } catch (error) {
      Alert.alert("Error", "No se pudo actualizar el perfil.");
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleLogout = async () => {
    await AsyncStorage.removeItem('userToken');
    navigation.reset({ index: 0, routes: [{ name: 'Auth' }] });
  };

  const getThumbnail = (videoUrl: string) => {
    if (videoUrl && videoUrl.includes('mux.com')) {
      const parts = videoUrl.split('/');
      const playbackId = parts[parts.length - 1].split('.')[0];
      return `https://image.mux.com/${playbackId}/thumbnail.jpg?time=1`;
    }
    return 'https://via.placeholder.com/150';
  };

  if (loading) return <View style={styles.loadingContainer}><ActivityIndicator size="large" color={DARK_ACCENT} /></View>;

  const initialLetter = profile?.name ? profile.name.charAt(0).toUpperCase() : '?';
  const avatarUri = profile?.adultAvatarUrl 
    ? profile.adultAvatarUrl 
    : `https://ui-avatars.com/api/?name=${profile?.adultUsername || initialLetter}&background=0A0514&color=b829db&size=150&bold=true`;
  const displayName = profile?.adultUsername || initialLetter;

  const adultLikesCount = (profile?.likes || []).filter((l: any) => l.video?.is18Plus === true).length;

  return (
    <View style={styles.container}>
      <View style={styles.headerTop}>
        <View style={styles.headerLeft}>
          <Image source={require('../../assets/icon.png')} style={styles.appIcon} />
          <Text style={styles.appName}>ViralShop</Text>
          <Ionicons name="moon" size={12} color={DARK_ACCENT} style={{marginLeft: 5}} />
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={() => setMenuVisible(true)}>
            <Ionicons name="menu-outline" size={28} color="#FFF" />
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        key={activeTab === 'metrics' ? 'metrics-list' : 'video-grid'} 
        numColumns={activeTab === 'metrics' ? 1 : 3} 
        data={getActiveData()}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
        ListHeaderComponent={
          <View>
            <View style={styles.profileInfo}>
              
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 }}>
                <TouchableOpacity onPress={() => Alert.alert("Foto", "Próximamente: Subida de avatar independiente.")}>
                  <View style={{ position: 'relative' }}>
                    <Image source={{ uri: avatarUri }} style={[styles.avatar, profile?.isAdultVerified && { borderColor: DARK_ACCENT, borderWidth: 3 }]} />
                    <Animated.View style={[styles.onlineDotProfile, { backgroundColor: profile?.isOnline ? DARK_ACCENT : '#888888' }, profile?.isOnline ? { opacity: blinkAnim } : { opacity: 1 }]} />
                    
                    {profile?.isAdultVerified && (
                      <View style={styles.verifiedBadgePhoto}>
                        <Ionicons name="shield-checkmark" size={18} color="#FFF" />
                      </View>
                    )}
                  </View>
                </TouchableOpacity>

                <View style={{ flex: 1, marginLeft: 16 }}>
                  <View style={styles.nameRow}>
                    <Text style={styles.name}>{displayName}</Text>
                    {profile?.isAdultVerified && <Ionicons name="shield-checkmark" size={16} color={DARK_ACCENT} style={{ marginLeft: 4 }} />}
                  </View>
                  <Text style={styles.username}>@{displayName}</Text>

                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10, marginTop: 4 }}>
                    <View style={{ flexDirection: 'row', marginRight: 8 }}>
                      {[1, 2, 3, 4, 5].map((i) => (
                        <Ionicons key={i} name={i <= 4 ? "star" : "star-outline"} size={14} color={DARK_ACCENT} style={{ marginRight: 2 }} />
                      ))}
                    </View>
                    <Text style={{ color: DARK_ACCENT, fontWeight: 'bold', fontSize: 13 }}>
                      98% <Text style={{ color: '#888', fontWeight: 'normal', fontSize: 11 }}>positivas</Text>
                    </Text>
                  </View>

                  <View style={styles.actionButtonsRow}>
                    <TouchableOpacity style={styles.editProfileButton} onPress={() => {
                        setEditAlias(profile?.adultUsername || '');
                        setEditBio(profile?.adultBio || '');
                        setEditMenuVisible(true);
                      }}>
                      <Text style={styles.editProfileText}>Editar perfil oculto</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={{ paddingRight: 10 }}> 
                    <Text style={styles.bioText}>{profile?.adultBio || 'Sin descripción.'}</Text>
                  </View>
                </View>
              </View>

              <View style={styles.statsRow}>
                <View style={styles.statItem}><Text style={styles.statValue}>{profile?.adultFollowingCount || 0}</Text><Text style={styles.statLabel}>Siguiendo</Text></View>
                <View style={styles.statSeparator} />
                <View style={styles.statItem}><Text style={styles.statValue}>{profile?.adultFollowersCount || 0}</Text><Text style={styles.statLabel}>Seguidores</Text></View>
                <View style={styles.statSeparator} />
                <View style={styles.statItem}><Text style={styles.statValue}>{adultLikesCount}</Text><Text style={styles.statLabel}>Me gusta</Text></View>
              </View>

              {!profile?.isAdultVerified && (
                <TouchableOpacity 
                  style={[styles.proBanner, { borderColor: CELESTE_MAIN, marginTop: 2 }]} 
                  onPress={() => {
                    if (isPaymentCompleted) {
                      handleSimulateUploadDNI();
                    } else {
                      navigation.navigate('AdultVerifiedUpgrade'); 
                    }
                  }}
                >
                  <View style={[styles.proIconWrap, { backgroundColor: CELESTE_MAIN }]}>
                    <Ionicons name={isPaymentCompleted ? "document-text" : "shield-checkmark"} size={22} color="#FFF" />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.proTitle}>{isPaymentCompleted ? "Solo falta un paso" : "Verificar como Creador"}</Text>
                    <Text style={styles.proSubtitle}>{isPaymentCompleted ? "Subir DNI para terminar" : "Requisito para vender contenido"}</Text>
                  </View>
                  <Ionicons name="chevron-forward-outline" size={20} color="#888" />
                </TouchableOpacity>
              )}

              <TouchableOpacity 
                style={[styles.proBanner, !profile?.isAdultVerified && { opacity: 0.5, borderColor: '#333' }]}
                onPress={() => {
                  if (profile?.isAdultVerified) navigation.navigate('ProUpgrade');
                  else Alert.alert("Acceso Restringido", "Verifícate como creador primero para acceder al Plan Plus.");
                }}
              >
                <View style={[styles.proIconWrap, { backgroundColor: !profile?.isAdultVerified ? '#333' : DARK_ACCENT }]}>
                  <Ionicons name="star" size={22} color={!profile?.isAdultVerified ? DARK_BG : "#FFF"} />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.proTitle}>Plan Plus</Text>
                  <Text style={styles.proSubtitle}>Herramientas avanzadas para creadores</Text>
                </View>
                {profile?.isAdultVerified ? (
                  <Ionicons name="chevron-forward-outline" size={20} color="#888" />
                ) : (
                  <Ionicons name="lock-closed" size={16} color="#888" />
                )}
              </TouchableOpacity>

              <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
                <TouchableOpacity 
                  style={[styles.publishButton, !profile?.isAdultVerified && { opacity: 0.5 }]} 
                  onPress={() => {
                    if (profile?.isAdultVerified) navigation.navigate('Upload', { isAdultMode: true });
                    else Alert.alert("Restringido", "Verifícate como creador primero.");
                  }}
                >
                  <Ionicons name="videocam-outline" size={18} color="#000" style={{ marginRight: 6 }} />
                  <Text style={styles.publishButtonText}>Subir Video</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.uploadContentBtn, !profile?.isAdultVerified && { opacity: 0.5 }]} 
                  onPress={() => {
                    if (profile?.isAdultVerified) navigation.navigate('Upload', { isAdultMode: true });
                    else Alert.alert("Restringido", "Verifícate como creador primero.");
                  }}
                >
                  <Ionicons name="images-outline" size={18} color={DARK_ACCENT} style={{ marginRight: 6 }} />
                  <Text style={styles.uploadContentText}>Contenido</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* 👇 NUEVA BARRA DE PESTAÑAS (Con Videos y Contenido separados) 👇 */}
            <View style={styles.tabsRow}>
              <TouchableOpacity style={[styles.tab, activeTab === 'videos' && styles.activeTab]} onPress={() => setActiveTab('videos')}>
                <Ionicons name="videocam-outline" size={24} color={activeTab === 'videos' ? DARK_ACCENT : '#555'} />
              </TouchableOpacity>
              <TouchableOpacity style={[styles.tab, activeTab === 'content' && styles.activeTab]} onPress={() => setActiveTab('content')}>
                <Ionicons name="images-outline" size={24} color={activeTab === 'content' ? DARK_ACCENT : '#555'} />
              </TouchableOpacity>
              <TouchableOpacity style={[styles.tab, activeTab === 'ofertas' && styles.activeTab]} onPress={() => setActiveTab('ofertas')}>
                <Ionicons name="pricetag-outline" size={24} color={activeTab === 'ofertas' ? DARK_ACCENT : '#555'} />
              </TouchableOpacity>
              <TouchableOpacity style={[styles.tab, activeTab === 'liked' && styles.activeTab]} onPress={() => setActiveTab('liked')}>
                <Ionicons name="heart-outline" size={24} color={activeTab === 'liked' ? DARK_ACCENT : '#555'} />
              </TouchableOpacity>
              <TouchableOpacity style={[styles.tab, activeTab === 'metrics' && styles.activeTab]} onPress={() => setActiveTab('metrics')}>
                <Ionicons name="stats-chart-outline" size={24} color={activeTab === 'metrics' ? DARK_ACCENT : '#555'} />
              </TouchableOpacity>
            </View>
          </View>
        }

        renderItem={({ item, index }) => {
          if (activeTab === 'metrics') {
            return (
              <View style={{ width: width, padding: 20 }}>
                <Text style={{ color: '#FFF', fontSize: 18, fontWeight: 'bold', marginBottom: 15 }}>Resumen de cuenta</Text>
                <View style={{ backgroundColor: DARK_SURFACE, padding: 15, borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: '#2A1A3D' }}>
                  <Text style={{ color: '#888', fontSize: 12 }}>Visualizaciones totales</Text>
                  <Text style={{ color: DARK_ACCENT, fontSize: 24, fontWeight: 'bold' }}>{profile?.metrics?.totalViews || 0}</Text>
                </View>
              </View>
            );
          }

          const catIcon = ADULT_CATEGORIES.find(c => c.name === item.category)?.icon || 'cube-outline';

          return (
            <TouchableOpacity style={styles.videoThumbnailContainer} onPress={() => navigation.navigate('SingleVideo', { videos: getActiveData(), initialIndex: index })}>
              <Image source={{ uri: getThumbnail(item.videoUrl) }} style={styles.videoThumbnail} />
              
              <View style={styles.catIconBadge}>
                <Ionicons name={catIcon as any} size={14} color="#FFF" />
              </View>

              <View style={styles.videoDetailOverlay}>
                <Text style={styles.videoDetailText} numberOfLines={1}>{item.description}</Text>
              </View>
              {item.productPrice && (
                <View style={styles.bottomDataRow}>
                  <View style={styles.miniPriceTag}><Text style={styles.miniPriceText}>{formatCurrency(item.productPrice, currency, exchangeRate)}</Text></View>
                </View>
              )}
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            {/* 👇 Mensajes dinámicos si no hay nada 👇 */}
            {activeTab === 'content' ? 'Aún no has subido fotos o galerías.' : 'No hay videos aquí aún.'}
          </Text>
        }
      />

      <Modal visible={menuVisible} transparent={true} animationType="slide">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setMenuVisible(false)}>
          <View style={styles.bottomSheet}>
            <View style={styles.bottomSheetHandle} />
            <Text style={styles.menuTitle}>Ajustes</Text>
            <View style={[styles.menuItem, { justifyContent: 'space-between' }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}><Ionicons name="cash-outline" size={24} color="#FFF" /><Text style={styles.menuItemText}>Mostrar precios en USD</Text></View>
              <Switch value={currency === 'USD'} onValueChange={toggleCurrency} trackColor={{ false: '#333', true: DARK_ACCENT }} thumbColor={'#FFF'} />
            </View>
            <TouchableOpacity style={styles.menuItem} onPress={() => { setMenuVisible(false); navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] }); }}><Ionicons name="sunny-outline" size={24} color="#FFF" /><Text style={styles.menuItemText}>Volver al perfil normal</Text></TouchableOpacity>
            <View style={styles.divider} />
            <TouchableOpacity style={styles.menuItem} onPress={handleLogout}><Ionicons name="log-out-outline" size={24} color="#FF2D55" /><Text style={[styles.menuItemText, { color: '#FF2D55' }]}>Cerrar Sesión</Text></TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={editMenuVisible} transparent={true} animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.bottomSheet, { minHeight: 350 }]}>
            <View style={styles.bottomSheetHandle} />
            <Text style={styles.menuTitle}>Editar Identidad Secreta</Text>

            <Text style={{ color: DARK_ACCENT, fontSize: 13, marginBottom: 8 }}>Alias (@)</Text>
            <TextInput style={styles.input} placeholder="Ej: Leo_Hot" placeholderTextColor="#555" value={editAlias} onChangeText={setEditAlias} />

            <Text style={{ color: DARK_ACCENT, fontSize: 13, marginBottom: 8, marginTop: 10 }}>Biografía</Text>
            <TextInput style={[styles.input, { minHeight: 80, textAlignVertical: 'top' }]} placeholder="Descripción..." placeholderTextColor="#555" multiline={true} value={editBio} onChangeText={setEditBio} />

            <TouchableOpacity style={[styles.publishButton, { marginTop: 20 }]} onPress={handleSaveIdentity} disabled={isSavingProfile}>
              {isSavingProfile ? <ActivityIndicator color="#000" /> : <Text style={styles.publishButtonText}>Guardar Cambios</Text>}
            </TouchableOpacity>

            {profile?.isAdultVerified && (
              <TouchableOpacity style={{ marginTop: 20, alignItems: 'center' }} onPress={handleRemoveVerification}>
                <Text style={{ color: '#FF2D55', fontWeight: 'bold' }}>Quitar verificación (Modo Prueba)</Text>
              </TouchableOpacity>
            )}

          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: DARK_BG },
  loadingContainer: { flex: 1, backgroundColor: DARK_BG, justifyContent: 'center', alignItems: 'center' },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 50, paddingHorizontal: 20, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#2A1A3D' },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  headerRight: { flexDirection: 'row', alignItems: 'center' },
  appIcon: { width: 34, height: 34, borderRadius: 8, marginRight: 8 },
  appName: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  profileInfo: { paddingVertical: 15, paddingHorizontal: 16 },
  avatar: { width: 100, height: 100, borderRadius: 50, borderWidth: 2, borderColor: DARK_ACCENT },
  onlineDotProfile: { position: 'absolute', top: 5, right: 5, width: 16, height: 16, borderRadius: 8, borderWidth: 2.5, borderColor: DARK_BG, zIndex: 10 },
  verifiedBadgePhoto: { position: 'absolute', bottom: 0, right: 0, backgroundColor: DARK_ACCENT, borderRadius: 12, padding: 1, borderWidth: 2, borderColor: DARK_BG },
  nameRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
  username: { color: '#888', fontSize: 13, fontWeight: '500' },
  name: { color: '#FFF', fontSize: 18, fontWeight: '700' },
  actionButtonsRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, marginTop: 5 },
  editProfileButton: { backgroundColor: DARK_SURFACE, paddingVertical: 6, paddingHorizontal: 14, borderRadius: 6, borderWidth: 1, borderColor: '#2A1A3D' },
  editProfileText: { color: '#FFF', fontSize: 12, fontWeight: '600' },
  bioText: { color: '#FFF', fontSize: 14, lineHeight: 18, marginBottom: 10 },
  statsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingVertical: 12, borderTopWidth: 0.5, borderTopColor: '#2A1A3D', marginBottom: 10 },
  statItem: { alignItems: 'center', flex: 1 },
  statSeparator: { width: 1, height: 32, backgroundColor: '#2A1A3D' },
  statValue: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  statLabel: { color: '#888', fontSize: 12 },
  
  proBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: DARK_SURFACE, borderRadius: 12, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#2A1A3D' },
  proIconWrap: { width: 40, height: 40, borderRadius: 20, backgroundColor: DARK_ACCENT, alignItems: 'center', justifyContent: 'center' },
  proTitle: { color: '#FFF', fontSize: 15, fontWeight: '700' },
  proSubtitle: { color: '#888', fontSize: 12, marginTop: 2 },

  publishButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: DARK_ACCENT, paddingVertical: 12, borderRadius: 10 },
  publishButtonText: { color: '#000', fontSize: 15, fontWeight: '700' },
  
  uploadContentBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent', borderWidth: 1, borderColor: DARK_ACCENT, paddingVertical: 12, borderRadius: 10 },
  uploadContentText: { color: DARK_ACCENT, fontSize: 15, fontWeight: '700' },
  
  tabsRow: { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: '#2A1A3D' },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 12 },
  activeTab: { borderBottomWidth: 2, borderBottomColor: DARK_ACCENT },
  
  videoThumbnailContainer: { width: COLUMN_WIDTH, height: COLUMN_WIDTH * 1.5, borderWidth: 0.5, borderColor: '#000' },
  videoThumbnail: { width: '100%', height: '100%', backgroundColor: '#111' },
  catIconBadge: { position: 'absolute', top: 5, right: 5, backgroundColor: 'rgba(0,0,0,0.4)', padding: 4, borderRadius: 10 },
  videoDetailOverlay: { position: 'absolute', bottom: 25, left: 5, right: 5 },
  videoDetailText: { color: '#FFF', fontSize: 10, fontWeight: '500', textShadowColor: '#000', textShadowRadius: 2 },
  bottomDataRow: { position: 'absolute', bottom: 5, left: 5, right: 5 },
  miniPriceTag: { backgroundColor: DARK_ACCENT, paddingHorizontal: 5, paddingVertical: 2, borderRadius: 4, alignSelf: 'flex-start' },
  miniPriceText: { color: '#000', fontSize: 10, fontWeight: 'bold' },
  emptyText: { color: '#888', textAlign: 'center', marginTop: 50, fontSize: 16 },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  bottomSheet: { backgroundColor: DARK_SURFACE, borderTopLeftRadius: 15, borderTopRightRadius: 15, padding: 20, paddingBottom: 40, borderWidth: 1, borderColor: '#2A1A3D' },
  bottomSheetHandle: { width: 40, height: 4, backgroundColor: '#555', borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  menuTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15 },
  menuItemText: { color: '#FFF', fontSize: 16, marginLeft: 15, fontWeight: '500' },
  divider: { height: 1, backgroundColor: '#2A1A3D', marginVertical: 10 },
  input: { backgroundColor: '#000', color: '#FFF', borderRadius: 12, padding: 15, fontSize: 15, borderWidth: 1, borderColor: '#333' }
});