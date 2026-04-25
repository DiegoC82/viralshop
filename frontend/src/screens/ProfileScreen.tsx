// frontend/src/screens/ProfileScreen.tsx
import React, { useState, useCallback, useRef, useEffect } from 'react';
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
  TextInput,
  Modal,
  Animated
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CATEGORIES_DATA } from '../data/categories';
import Constants from 'expo-constants';
import axios from 'axios';
import { Switch } from 'react-native'; // 👈 Asegúrate de importar Switch
import { useCurrency } from '../context/CurrencyContext';
import { formatCurrency } from '../utils/formatters';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { COLORS } from '../theme/colors';

const { width } = Dimensions.get('window');
const COLUMN_WIDTH = width / 3;
const BACKEND_URL = 'https://viralshop-xr9v.onrender.com';

export default function ProfileScreen({ navigation, route }: any) {
  // Estados de Datos
  const [profile, setProfile] = useState<any>(null);
  const { currency, toggleCurrency, exchangeRate } = useCurrency(); // 👈 Llama a tu cerebro global
  const blinkAnim = useRef(new Animated.Value(0.3)).current;
  React.useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(blinkAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(blinkAnim, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  // Estados de UI y Auth
  const [loading, setLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isGuest, setIsGuest] = useState(false);
  const [activeTab, setActiveTab] = useState<'uploaded' | 'ofertas' | 'liked' | 'remates' | 'metrics'>('uploaded');
  const [menuVisible, setMenuVisible] = useState(false);

  // Estados para ViralShop Midnight (+18)
  const [midnightVisible, setMidnightVisible] = useState(false);
  const [midnightStep, setMidnightStep] = useState<'warning' | 'pin'>('warning');
  const [enteredPassword, setEnteredPassword] = useState('');
  const [pinError, setPinError] = useState(false);
  
  // 👇 1. AGREGAR ESTOS ESTADOS Y FUNCIONES NUEVAS 👇
  const [editMenuVisible, setEditMenuVisible] = useState(false);
  const isPaymentCompleted = route?.params?.paymentCompleted;

  const [editBio, setEditBio] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const [offerModalVisible, setOfferModalVisible] = useState(false);
  const [selectedVideoToOffer, setSelectedVideoToOffer] = useState<any>(null);
  const [newDiscountPrice, setNewDiscountPrice] = useState('');

  const handleSimulateUploadDNI = async () => {
  try {
    const token = await AsyncStorage.getItem('userToken');
    // 👇 ESTO LE AVISA AL BACKEND QUE AHORA SOS VERIFICADO
    await axios.patch(`${BACKEND_URL}/users/profile`, { isVerified: true }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    Alert.alert("DNI Subido", "Perfil verificado con éxito.");
    setProfile({ ...profile, isVerified: true });
    navigation.setParams({ paymentCompleted: false });
  } catch (error) {
    Alert.alert("Error", "No se pudo guardar la verificación en el servidor.");
  }
};

  const handleRemoveVerification = () => {
    setProfile({ ...profile, isVerified: false });
    setEditMenuVisible(false);
    navigation.setParams({ paymentCompleted: false });
    Alert.alert("Modo Test", "Se ha quitado la verificación de tu perfil.");
  };

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

  const [tempThumbTime, setTempThumbTime] = useState(1);
const [isSavingThumb, setIsSavingThumb] = useState(false);

const handleSaveThumbnail = async () => {
  setIsSavingThumb(true);
  try {
    const token = await AsyncStorage.getItem('userToken');
    await axios.patch(`${BACKEND_URL}/videos/${selectedVideoToOffer.id}/thumbnail`, 
      { time: tempThumbTime },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    Alert.alert("¡Portada actualizada!", "La nueva imagen se verá en el feed en unos momentos.");
    setOfferModalVisible(false);
    checkAuthAndFetchProfile();
  } catch (error) {
    Alert.alert("Error", "No se pudo guardar la portada.");
  } finally {
    setIsSavingThumb(false);
  }
};
  
  // --- GUARDAR PERFIL (BIOGRAFÍA) ---
  const handleSaveProfile = async () => {
    setIsSavingProfile(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      // Enviamos la nueva bio al servidor
      await axios.patch(`${BACKEND_URL}/users/profile`, 
        { bio: editBio },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Actualizamos la pantalla instantáneamente sin recargar
      setProfile({ ...profile, bio: editBio });
      setEditMenuVisible(false);
      Alert.alert("¡Éxito!", "Tu descripción se ha actualizado.");
    } catch (error) {
      console.error("Error al guardar perfil:", error);
      Alert.alert("Error", "No se pudo actualizar el perfil.");
    } finally {
      setIsSavingProfile(false);
    }
  };

  // 3. CERRAR SESIÓN (CORREGIDO)
  const handleLogout = async () => {
    try {
      // 1. Borramos el token
      await AsyncStorage.removeItem('userToken');
      
      // 2. Limpiamos estados visuales
      setMenuVisible(false); 
      setIsGuest(true); 
      setProfile(null);

      // 3. ¡EXPULSIÓN AL LOGIN! Reset de la navegación
      navigation.reset({
        index: 0,
        routes: [{ name: 'Auth' }],
      });
      
    } catch (error) {
      console.error('Error cerrando sesión:', error);
    }
  };

  // 4. GENERADOR DE MINIATURAS MUX
  const getThumbnail = (videoUrl: string, time: number = 1) => {
  if (videoUrl && videoUrl.includes('mux.com')) {
    const parts = videoUrl.split('/');
    const playbackId = parts[parts.length - 1].split('.')[0];
    return `https://image.mux.com/${playbackId}/thumbnail.jpg?time=${time}`;
  }
  return 'https://via.placeholder.com/150';
};


  // 5. DETERMINAR QUÉ LISTA DE VIDEOS MOSTRAR SEGÚN EL TAB
  const getActiveData = () => {
    if (!profile) return [];
    
    switch (activeTab) {
      case 'uploaded':
        return profile.videos || [];
      case 'ofertas':
        // Filtra los videos que tienen un precio de descuento (oferta)
        return (profile.videos || []).filter((v: any) => v.discountPrice != null && v.discountPrice > 0);
      case 'liked':
        // Extrae los videos de la tabla de "likes"
        return (profile.likes || []).map((l: any) => l.video);
      case 'remates':
        // Filtra los videos que son remates/subastas
        return (profile.videos || []).filter((v: any) => v.isAuction === true);
      case 'metrics':
        return [{ id: 'metrics-view' }];
      default:
        return [];
    }
  };

  const handleApplyOffer = async () => {
    if (!newDiscountPrice || !selectedVideoToOffer) return;
    try {
      const token = await AsyncStorage.getItem('userToken');
      await axios.patch(`${BACKEND_URL}/videos/${selectedVideoToOffer.id}/oferta`, 
        { discountPrice: parseFloat(newDiscountPrice) },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      Alert.alert("¡Oferta aplicada!", "El producto ahora tiene descuento.");
      setOfferModalVisible(false);
      checkAuthAndFetchProfile(); // Recargamos para ver el cambio
    } catch (error) {
      Alert.alert("Error", "No se pudo aplicar la oferta.");
    }
  };

  const handleDeleteVideo = () => {
    Alert.alert(
      "¿Eliminar Video?",
      "Esta acción borrará el video permanentemente. ¿Estás seguro?",
      [
        { text: "Cancelar", style: "cancel" },
        { 
          text: "Eliminar", 
          style: "destructive",
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('userToken');
              await axios.delete(`${BACKEND_URL}/videos/${selectedVideoToOffer.id}`, {
                headers: { Authorization: `Bearer ${token}` }
              });
              Alert.alert("Eliminado", "El video se borró con éxito.");
              setOfferModalVisible(false);
              checkAuthAndFetchProfile(); // Recarga el perfil para que desaparezca
            } catch (error) {
              Alert.alert("Error", "No se pudo eliminar el video.");
            }
          }
        }
      ]
    );
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

  const handleAdultPanelAccess = () => {
    // Si algún día quieres bloquear a los no verificados, descomenta el if:
    /*
    if (!profile?.isVerified) {
      Alert.alert("Acceso VIP", "Debes verificar tu identidad para entrar al Modo Nocturno.");
      return;
    }
    */
    setMenuVisible(false); // Cierra el menú lateral
    setMidnightStep('warning'); // Inicia en la pantalla de advertencia
    setEnteredPassword(''); // Limpia el PIN por si había algo
    setPinError(false); // Limpia errores previos
    setMidnightVisible(true); // Abre el Modal Premium
  };

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
        {/* Izquierda: Icono de app + nombre */}
        <View style={styles.headerLeft}>
          <Image source={require('../../assets/icon.png')} style={styles.appIcon} />
          <Text style={styles.appName}>ViralShop</Text>
        </View>
        {/* Derecha: Agregar persona + menú hamburguesa */}
        <View style={styles.headerRight}>
          <Ionicons name="person-add-outline" size={24} color={COLORS.text} style={{ marginRight: 16 }} />
          <TouchableOpacity onPress={() => setMenuVisible(true)}>
            <Ionicons name="menu-outline" size={28} color={COLORS.text} />
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        key={activeTab === 'metrics' ? 'metrics-list' : 'video-grid'} // 👈 Esto evita errores de columnas
        numColumns={activeTab === 'metrics' ? 1 : 3} // 👈 1 columna para métricas, 3 para videos
        data={getActiveData()}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
        ListHeaderComponent={
          <View>
           {/* 2. INFO DEL PERFIL */}
            <View style={[styles.profileInfo, { alignItems: 'stretch', paddingHorizontal: 16 }]}>
              
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 }}>
                {/* Foto con borde rosado circular */}
                <TouchableOpacity onPress={handleChangeAvatar} disabled={isUploading}>
                  <View style={{ position: 'relative' }}>
                    {isUploading ? (
                      <View style={[styles.avatar, { justifyContent: 'center', alignItems: 'center', borderColor: COLORS.accent, borderWidth: 2 }]}>
                        <ActivityIndicator color={COLORS.accent} />
                      </View>
                    ) : (
                      <Image 
                        source={{ uri: avatarUri }} 
                        style={[styles.avatar, profile?.isVerified ? { borderColor: '#1DA1F2', borderWidth: 3 } : { borderColor: COLORS.accent, borderWidth: 3 }]} 
                      />
                    )}
                    
                    {/* 👇 PUNTO DE CONEXIÓN 👇 */}
                    <Animated.View style={[
                      styles.onlineDotProfile,
                      { backgroundColor: profile?.isOnline ? COLORS.accent : '#888888' },
                      profile?.isOnline ? { opacity: blinkAnim } : { opacity: 1 }
                    ]} />

                    {/* 👇 ESCUDO AGREGADO AQUÍ 👇 */}
                    {profile?.isVerified && (
                      <View style={styles.verifiedBadgePhoto}>
                        <Ionicons name="shield-checkmark" size={22} color="#FFF" />
                      </View>
                    )}
                  </View>
                </TouchableOpacity>

                <View style={{ flex: 1, marginLeft: 16 }}>
                  {/* 1. Nombre y @Usuario */}
                  <View style={[styles.nameRow, { marginBottom: 4 }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={[styles.name, { marginBottom: 0 }]}>{profile?.name}</Text>
                      {profile?.isVerified && (
                        <Ionicons name="shield-checkmark" size={16} color="#1DA1F2" style={{ marginLeft: 4 }} />
                      )}
                    </View>
                    <Text style={[styles.username, { marginBottom: 0 }]}>@{profile?.username}</Text>
                  </View>

                  {/* 👇 2. NUEVA SECCIÓN: VALORACIÓN DEL VENDEDOR 👇 */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                    <View style={{ flexDirection: 'row', marginRight: 8 }}>
                      {[1, 2, 3, 4, 5].map((i) => (
                        <Ionicons 
                          key={i} 
                          name={i <= 4 ? "star" : "star-outline"} // Simula 4 estrellas de 5
                          size={14} 
                          color={COLORS.accent} 
                          style={{ marginRight: 2 }}
                        />
                      ))}
                    </View>
                    <Text style={{ color: COLORS.accent, fontWeight: 'bold', fontSize: 13 }}>
                      98% <Text style={{ color: COLORS.textMuted, fontWeight: 'normal', fontSize: 11 }}>positivas</Text>
                    </Text>
                  </View>

                  {/* 3. Botones de Acción (Editar/Compartir) */}
                  <View style={[styles.actionButtonsRow, { marginBottom: 12 }]}>
                    <TouchableOpacity 
                      style={styles.editProfileButton} 
                      onPress={() => {
                        setEditBio(profile?.bio || ''); // 👈 Cargamos la bio actual
                        setEditMenuVisible(true);
                      }}
                    >
                      <Text style={styles.editProfileText}>Editar perfil</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.shareButton}>
                      <Ionicons name="share-social-outline" size={20} color={COLORS.text} />
                    </TouchableOpacity>
                  </View>

                  {/* 👇 4. BIOGRAFÍA REUBICADA (Ahora debajo de los botones) 👇 */}
                  <View style={{ paddingRight: 10 }}> 
                    {profile?.bio ? (
                      <Text style={[styles.bioText, { textAlign: 'left', paddingHorizontal: 0, fontSize: 13, marginBottom: 5 }]}>
                        {profile.bio}
                      </Text>
                    ) : (
                      <TouchableOpacity 
                        style={[styles.addBioButton, { alignItems: 'flex-start' }]} 
                        onPress={() => {
                          setEditBio(''); // 👈 Limpiamos si no hay bio
                          setEditMenuVisible(true);
                        }}
                      >
                        <Text style={styles.addBioText}>+ Añadir descripción corta</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </View>

              {/* Stats con separadores verticales */}
              <View style={styles.statsRow}>
                <StatItem value={profile?.followingCount || 0} label="Siguiendo" />
                <View style={styles.statSeparator} />
                <StatItem value={profile?.followersCount || 0} label="Seguidores" />
                <View style={styles.statSeparator} />
                <StatItem value={profile?.likes?.length || 0} label="Me gusta" />
              </View>

              {/* Botón de Perfil Verificado */}
              {/* Lógica del Botón de Verificación / Subir DNI */}
              {!profile?.isVerified && (
                <TouchableOpacity 
                  style={[styles.proBanner, { borderColor: '#1DA1F2', marginTop: 2 }]} 
                  onPress={() => {
                    // Ahora usamos la variable limpia
                    if (isPaymentCompleted) {
                      handleSimulateUploadDNI();
                    } else {
                      navigation.navigate('VerifiedUpgrade');
                    }
                  }}
                >
                  <View style={[styles.proIconWrap, { backgroundColor: '#1DA1F2' }]}>
                    <Ionicons name={isPaymentCompleted ? "document-text" : "shield-checkmark"} size={22} color="#fff" />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.proTitle}>
                      {isPaymentCompleted ? "Solo falta un paso" : "Perfil Verificado"}
                    </Text>
                    <Text style={styles.proSubtitle}>
                      {isPaymentCompleted ? "Subir DNI para terminar" : "Obtener insignia oficial"}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward-outline" size={20} color={COLORS.textMuted} />
                </TouchableOpacity>
              )}

              {/* Banner ViralShop PRO (Bloqueado si no está verificado) */}
              <TouchableOpacity 
                style={[styles.proBanner, !profile?.isVerified && { opacity: 0.5, borderColor: '#333' }]}
                onPress={() => {
                  if (profile?.isVerified) {
                    navigation.navigate('ProUpgrade');
                  } else {
                    Alert.alert("Acceso Restringido", "Primero debes obtener el Perfil Verificado para acceder a PRO.");
                  }
                }}
              >
                <View style={[styles.proIconWrap, !profile?.isVerified && { backgroundColor: '#555' }]}>
                  <Ionicons name="ribbon-outline" size={22} color="#fff" />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.proTitle}>ViralShop PRO</Text>
                  <Text style={styles.proSubtitle}>Pasar a PRO</Text>
                </View>
                {profile?.isVerified ? (
                  <Ionicons name="chevron-forward-outline" size={20} color={COLORS.textMuted} />
                ) : (
                  <Ionicons name="lock-closed" size={16} color={COLORS.textMuted} />
                )}
              </TouchableOpacity>

              {/* BOTONES DIVIDIDOS: VIDEO Y REMATE */}
              <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
                {/* Botón Publicar Video */}
                <TouchableOpacity 
                  style={[styles.publishButton, { flex: 1 }]}
                  onPress={() => navigation.navigate('Upload')} 
                >
                  <Ionicons name="videocam-outline" size={18} color="#fff" style={{ marginRight: 6 }} />
                  <Text style={styles.publishButtonText}>Subir Video</Text>
                </TouchableOpacity>
                
                {/* Botón Publicar Remate */}
                <TouchableOpacity 
                  style={[styles.publishButton, { flex: 1, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.accent }]}
                  onPress={() => navigation.navigate('UploadRemate')} 
                >
                  {/* 👇 ÍCONO COMPUESTO PEQUEÑO 👇 */}
                  <View style={{ width: 20, height: 20, marginRight: 8 }}>
                    <MaterialCommunityIcons
                      name="gavel"
                      size={18}
                      color={COLORS.accent}
                      style={{ position: 'absolute', top: -4, right: -4, transform: [{ scaleX: -1 }, { rotate: '-15deg' }] }}
                    />
                    <View style={{ position: 'absolute', bottom: 0, left: -2, backgroundColor: COLORS.accent, borderRadius: 7, width: 14, height: 14, justifyContent: 'center', alignItems: 'center' }}>
                      <Text style={{ color: '#000', fontSize: 9, fontWeight: 'bold' }}>$</Text>
                    </View>
                  </View>
                  <Text style={[styles.publishButtonText, { color: COLORS.accent }]}>Nuevo Remate</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* 3. TABS (Subidos, Ofertas, Likes, Remates, Métricas) */}
            <View style={styles.tabsRow}>
              <TouchableOpacity style={[styles.tab, activeTab === 'uploaded' && styles.activeTab]} onPress={() => setActiveTab('uploaded')}>
                <Ionicons name="grid-outline" size={24} color={activeTab === 'uploaded' ? COLORS.text : COLORS.textMuted} />
              </TouchableOpacity>
              
              {/* 👇 NUEVA PESTAÑA: OFERTAS (Etiqueta de precio) 👇 */}
              <TouchableOpacity style={[styles.tab, activeTab === 'ofertas' && styles.activeTab]} onPress={() => setActiveTab('ofertas')}>
                <Ionicons name="pricetag-outline" size={24} color={activeTab === 'ofertas' ? COLORS.text : COLORS.textMuted} />
              </TouchableOpacity>
              
              <TouchableOpacity style={[styles.tab, activeTab === 'liked' && styles.activeTab]} onPress={() => setActiveTab('liked')}>
                <Ionicons name="heart-outline" size={24} color={activeTab === 'liked' ? COLORS.text : COLORS.textMuted} />
              </TouchableOpacity>
              
              <TouchableOpacity style={[styles.tab, activeTab === 'remates' && styles.activeTab]} onPress={() => setActiveTab('remates')}>
                <View style={{ width: 28, height: 28, justifyContent: 'center', alignItems: 'center' }}>
                  <MaterialCommunityIcons name="gavel" size={22} color={activeTab === 'remates' ? COLORS.text : COLORS.textMuted} style={{ position: 'absolute', top: -2, right: 0, transform: [{ scaleX: -1 }, { rotate: '-15deg' }] }} />
                  <View style={{ position: 'absolute', bottom: 2, left: 0, backgroundColor: activeTab === 'remates' ? COLORS.text : COLORS.textMuted, borderRadius: 8, width: 14, height: 14, justifyContent: 'center', alignItems: 'center' }}>
                    <Text style={{ color: COLORS.background, fontSize: 10, fontWeight: 'bold' }}>$</Text>
                  </View>
                </View>
              </TouchableOpacity>
              
              <TouchableOpacity style={[styles.tab, activeTab === 'metrics' && styles.activeTab]} onPress={() => setActiveTab('metrics')}>
                <Ionicons name="stats-chart-outline" size={24} color={activeTab === 'metrics' ? COLORS.text : COLORS.textMuted} />
              </TouchableOpacity>
            </View>
          </View>
        }

        renderItem={({ item, index }) => {
          // 👇 1. SI ESTAMOS EN LA PESTAÑA DE MÉTRICAS, DIBUJAMOS EL PANEL 👇
          if (activeTab === 'metrics') {
            const metrics = profile?.metrics || { totalViews: 0, totalSales: 0, activeAuctionsCount: 0 };
            
            const formattedViews = metrics.totalViews >= 1000 
              ? (metrics.totalViews / 1000).toFixed(1) + 'k' 
              : metrics.totalViews;

            return (
              <View style={{ width: width, padding: 20 }}>
                <Text style={{ color: COLORS.text, fontSize: 18, fontWeight: 'bold', marginBottom: 15 }}>Resumen de cuenta</Text>
                
                <View style={{ backgroundColor: COLORS.surface, padding: 15, borderRadius: 12, marginBottom: 10 }}>
                  <Text style={{ color: COLORS.textMuted, fontSize: 12 }}>Visualizaciones totales</Text>
                  <Text style={{ color: COLORS.accent, fontSize: 24, fontWeight: 'bold' }}>
                    {formattedViews}
                  </Text>
                </View>

                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <View style={{ flex: 1, backgroundColor: COLORS.surface, padding: 15, borderRadius: 12 }}>
                    <Text style={{ color: COLORS.textMuted, fontSize: 12 }}>Ventas ARS</Text>
                    <Text style={{ color: '#4CD964', fontSize: 18, fontWeight: 'bold' }}>
                      ${metrics.totalSales.toLocaleString('es-AR')}
                    </Text>
                  </View>
                  <View style={{ flex: 1, backgroundColor: COLORS.surface, padding: 15, borderRadius: 12 }}>
                    <Text style={{ color: COLORS.textMuted, fontSize: 12 }}>Remates activos</Text>
                    <Text style={{ color: COLORS.accent, fontSize: 18, fontWeight: 'bold' }}>
                      {metrics.activeAuctionsCount}
                    </Text>
                  </View>
                </View>

                <TouchableOpacity 
                  style={{ marginTop: 20, backgroundColor: COLORS.accent, padding: 12, borderRadius: 8, alignItems: 'center' }}
                  onPress={() => navigation.navigate('SalesMetrics')}
                >
                  <Text style={{ color: '#fff', fontWeight: 'bold' }}>Ver métricas detalladas</Text>
                </TouchableOpacity>
              </View>
            );
          }

          // 👇 2. SI NO ES MÉTRICAS, DIBUJAMOS LOS VIDEOS 👇
          const catIcon = CATEGORIES_DATA.find(c => c.name === item.category)?.icon || 'cube-outline';

          return (
            <TouchableOpacity 
              style={styles.videoThumbnailContainer} 
              onPress={() => {
                // 👇 INYECTAMOS LA FOTO Y NOMBRE DEL PERFIL 👇
                const videosConUsuario = getActiveData().map((v: any) => ({
                  ...v,
                  user: { username: profile?.username, avatarUrl: profile?.avatarUrl, isVerified: profile?.isVerified, isOnline: profile?.isOnline}
                }));
                navigation.navigate('SingleVideo', { videos: videosConUsuario, initialIndex: index });
              }}
              onLongPress={() => { 
                setSelectedVideoToOffer(item); 
                setOfferModalVisible(true); 
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
                {item.discountPrice ? (
                  <View style={[styles.miniPriceTag, { backgroundColor: '#FF2D55', flexDirection: 'row', alignItems: 'center' }]}>
                    <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 9, textDecorationLine: 'line-through', marginRight: 4 }}>
                      {formatCurrency(item.productPrice, currency, exchangeRate)}
                    </Text>
                    <Text style={[styles.miniPriceText, { color: '#FFF' }]}>
                      {formatCurrency(item.discountPrice, currency, exchangeRate)}
                    </Text>
                  </View>
                ) : item.productPrice ? (
                  <View style={styles.miniPriceTag}>
                    <Text style={styles.miniPriceText}>
                      {formatCurrency(item.productPrice, currency, exchangeRate)}
                    </Text>
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
          <Text style={styles.emptyText}>No hay videos aquí aún.</Text>
        }
      />

      {/* 4. MODAL DEL MENÚ HAMBURGUESA (Con Logout incluido) */}
      <Modal visible={menuVisible} transparent={true} animationType="slide" onRequestClose={() => setMenuVisible(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setMenuVisible(false)}>
          <View style={styles.bottomSheet}>
            <View style={styles.bottomSheetHandle} />
            <Text style={styles.menuTitle}>Herramientas de cuenta</Text>

            {/* 👇 NUEVO BOTÓN SWITCH DE MONEDA 👇 */}
            <View style={[styles.menuItem, { justifyContent: 'space-between' }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="cash-outline" size={24} color={COLORS.text} />
                <Text style={styles.menuItemText}>Mostrar precios en USD</Text>
              </View>
              <Switch 
                value={currency === 'USD'} 
                onValueChange={toggleCurrency} 
                trackColor={{ false: '#333', true: COLORS.accent }}
                thumbColor={'#FFF'}
              />
            </View>

            <TouchableOpacity style={styles.menuItem} onPress={handleAdultPanelAccess}>
              <Ionicons name="moon-outline" size={24} color="#b829db" />
              <Text style={[styles.menuItemText, { color: '#b829db', fontWeight: 'bold' }]}>Modo Nocturno (+18)</Text>
            </TouchableOpacity>

            <View style={styles.divider} />

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
            <Text style={styles.versionText}>
              v{Constants.expoConfig?.version}
            </Text>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ========================================== */}
      {/* 👇 MODAL DE EDITAR PERFIL 👇 */}
      {/* ========================================== */}
      <Modal visible={editMenuVisible} transparent={true} animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.bottomSheet, { minHeight: 350 }]}>
            <View style={styles.bottomSheetHandle} />
            
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <Text style={{ color: COLORS.text, fontSize: 18, fontWeight: 'bold' }}>Editar Perfil</Text>
              <TouchableOpacity onPress={() => setEditMenuVisible(false)}>
                <Ionicons name="close" size={24} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={{ color: COLORS.textMuted, fontSize: 13, marginBottom: 8 }}>Descripción corta (Biografía)</Text>
            <TextInput
              style={{
                backgroundColor: COLORS.background,
                color: COLORS.text,
                borderRadius: 12,
                padding: 15,
                fontSize: 15,
                borderWidth: 1,
                borderColor: '#333',
                minHeight: 100,
                textAlignVertical: 'top'
              }}
              placeholder="Ej: Tienda oficial de tecnología. Envíos a todo el país 🚀"
              placeholderTextColor="#555"
              multiline={true}
              maxLength={150}
              value={editBio}
              onChangeText={setEditBio}
            />
            <Text style={{ color: '#555', fontSize: 11, textAlign: 'right', marginTop: 5 }}>
              {editBio.length}/150
            </Text>

            <TouchableOpacity 
              style={[styles.publishButton, { marginTop: 20, justifyContent: 'center' }]}
              onPress={handleSaveProfile}
              disabled={isSavingProfile}
            >
              {isSavingProfile ? (
                <ActivityIndicator color="#000" />
              ) : (
                <Text style={styles.publishButtonText}>Guardar Cambios</Text>
              )}
            </TouchableOpacity>

            {/* Botón para quitar Verificación (Solo para testeo, como me pediste antes) */}
            {profile?.isVerified && (
              <TouchableOpacity 
                style={{ marginTop: 20, alignItems: 'center' }}
                onPress={handleRemoveVerification}
              >
                <Text style={{ color: '#FF2D55', fontWeight: 'bold' }}>Quitar verificación (Modo Prueba)</Text>
              </TouchableOpacity>
            )}

          </View>
        </View>
      </Modal>

      {/* ========================================== */}
      {/* 👇 MODAL VIRALSHOP MIDNIGHT (+18) 👇 */}
      {/* ========================================== */}
      <Modal visible={midnightVisible} transparent={true} animationType="slide">
        <View style={styles.midnightOverlay}>
          <View style={styles.midnightCard}>
            
            <TouchableOpacity style={styles.midnightCloseBtn} onPress={() => setMidnightVisible(false)}>
              <Ionicons name="close" size={28} color="#888" />
            </TouchableOpacity>

            {midnightStep === 'warning' ? (
              // --- PASO 1: LA ADVERTENCIA ---
              <View style={styles.midnightContent}>
                <View style={styles.neonIconContainer}>
                  <Ionicons name="moon-outline" size={40} color="#b829db" />
                </View>
                <Text style={styles.midnightTitle}>Modo <Text style={{color: '#b829db', fontStyle: 'italic'}}>Nocturno</Text></Text>
                
                <Text style={styles.midnightDesc}>
                  Estás a punto de ingresar al lado sin censura de nuestra comunidad. Este espacio es exclusivo para adultos.
                </Text>

                <View style={styles.ageTag}>
                  <Text style={styles.ageTagText}>CONTENIDO +18</Text>
                </View>

                <TouchableOpacity style={styles.neonButton} onPress={() => setMidnightStep('pin')}>
                  <Text style={styles.neonButtonText}>Soy mayor de edad, entrar</Text>
                </TouchableOpacity>
              </View>
            ) : (
              // --- PASO 2: EL PIN NEÓN ---
              <View style={styles.midnightContent}>
                <Ionicons name="key-outline" size={32} color={pinError ? "#FF2D55" : "#b829db"} style={{ marginBottom: 15 }} />
                <Text style={styles.midnightTitle}>Pase VIP</Text>
                <Text style={styles.midnightDesc}>
                  {pinError ? "El código es incorrecto." : "Ingresa tu PIN de 6 dígitos para continuar."}
                </Text>

                <TextInput 
                  style={[styles.midnightInput, pinError && { borderColor: '#FF2D55', color: '#FF2D55' }]} 
                  secureTextEntry={true} 
                  placeholder="••••••" 
                  placeholderTextColor="#444"
                  keyboardType="numeric"
                  maxLength={6}
                  value={enteredPassword}
                  onChangeText={(text) => {
                    setEnteredPassword(text);
                    setPinError(false);
                    // Validación automática
                    if (text.length === 6) {
                      if (text === '123456') { // Contraseña provisoria
                        setMidnightVisible(false);
                        setEnteredPassword('');
                        navigation.navigate('AdultFeed');
                      } else {
                        setPinError(true);
                        setTimeout(() => setEnteredPassword(''), 500);
                      }
                    }
                  }}
                  autoFocus={true} 
                />
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* ========================================== */}
      {/* 👇 MODAL UNIFICADO: OPCIONES DE PRODUCTO 👇 */}
      {/* ========================================== */}
      <Modal visible={offerModalVisible} transparent={true} animationType="fade">
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setOfferModalVisible(false)}
        >
          {/* Contenedor Principal (Sólido) */}
          <TouchableOpacity 
            activeOpacity={1} 
            style={[styles.bottomSheet, { minHeight: 500, paddingBottom: 40 }]}
          >
            <View style={styles.bottomSheetHandle} />
            <Text style={[styles.menuTitle, { marginBottom: 25 }]}>Gestión del Producto</Text>

            {/* --- SECCIÓN A: PORTADA DINÁMICA --- */}
            <View style={{ marginBottom: 30 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 15 }}>
                <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(184, 41, 219, 0.1)', justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
                  <Ionicons name="image-outline" size={20} color={COLORS.accent} />
                </View>
                <Text style={{ color: COLORS.text, fontSize: 16, fontWeight: 'bold' }}>Portada del Video</Text>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)', padding: 15, borderRadius: 15, borderWidth: 1, borderColor: '#222' }}>
                <Image 
                  source={{ uri: getThumbnail(selectedVideoToOffer?.videoUrl, tempThumbTime) }} 
                  style={{ width: 90, height: 120, borderRadius: 10, backgroundColor: '#000' }} 
                />
                <View style={{ flex: 1, marginLeft: 20 }}>
                  <Text style={{ color: COLORS.textMuted, fontSize: 12, marginBottom: 5 }}>Desliza para elegir el mejor cuadro:</Text>
                  <Text style={{ color: COLORS.accent, fontSize: 22, fontWeight: '900', marginBottom: 5 }}>{tempThumbTime}s</Text>
                  
                  <Slider
                    style={{ width: '100%', height: 40 }}
                    minimumValue={0}
                    maximumValue={30} // Ajustar según duración promedio
                    step={1}
                    value={tempThumbTime}
                    onValueChange={setTempThumbTime}
                    minimumTrackTintColor={COLORS.accent}
                    maximumTrackTintColor="#333"
                    thumbTintColor={COLORS.accent}
                  />

                  <TouchableOpacity 
                    style={{ marginTop: 10, backgroundColor: COLORS.surface, paddingVertical: 8, borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: COLORS.accent }}
                    onPress={handleSaveThumbnail}
                    disabled={isSavingThumb}
                  >
                    {isSavingThumb ? <ActivityIndicator size="small" color={COLORS.accent} /> : <Text style={{ color: COLORS.accent, fontWeight: 'bold', fontSize: 12 }}>Actualizar Portada</Text>}
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* --- SECCIÓN B: OFERTA Y PRECIO --- */}
            <View style={{ marginBottom: 30 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 15 }}>
                <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(76, 217, 100, 0.1)', justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
                  <Ionicons name="pricetag-outline" size={20} color="#4CD964" />
                </View>
                <Text style={{ color: COLORS.text, fontSize: 16, fontWeight: 'bold' }}>Aplicar Oferta</Text>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.background, borderRadius: 12, paddingHorizontal: 15, borderWidth: 1, borderColor: '#333' }}>
                <Text style={{ color: COLORS.text, fontSize: 18, marginRight: 10 }}>$</Text>
                <TextInput 
                  style={{ flex: 1, color: COLORS.text, fontSize: 16, paddingVertical: 15 }} 
                  placeholder="Nuevo precio con descuento" 
                  placeholderTextColor="#555"
                  keyboardType="numeric"
                  value={newDiscountPrice}
                  onChangeText={setNewDiscountPrice}
                />
                <TouchableOpacity 
                  style={{ backgroundColor: COLORS.accent, paddingHorizontal: 15, paddingVertical: 8, borderRadius: 8 }}
                  onPress={handleApplyOffer}
                >
                  <Text style={{ color: '#000', fontWeight: 'bold' }}>Aplicar</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* --- SECCIÓN C: ZONA DE PELIGRO --- */}
            <View style={{ marginTop: 'auto', borderTopWidth: 1, borderTopColor: '#222', paddingTop: 25 }}>
              <TouchableOpacity 
                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255, 45, 85, 0.08)', paddingVertical: 15, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255, 45, 85, 0.3)' }} 
                onPress={handleDeleteVideo}
              >
                <Ionicons name="trash-outline" size={20} color="#FF2D55" style={{ marginRight: 10 }} />
                <Text style={{ color: '#FF2D55', fontWeight: 'bold', fontSize: 15 }}>Eliminar Video Permanentemente</Text>
              </TouchableOpacity>
            </View>

          </TouchableOpacity>
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
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  headerRight: { flexDirection: 'row', alignItems: 'center' },
  appIcon: { width: 34, height: 34, borderRadius: 8, marginRight: 8 },
  appName: { color: COLORS.text, fontSize: 18, fontWeight: 'bold' },
  headerUsername: { color: COLORS.text, fontSize: 18, fontWeight: 'bold' },
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
    borderColor: COLORS.background,
    zIndex: 10,
  },
  
  // Perfil Info
  profileInfo: { paddingVertical: 15, paddingHorizontal: 16 },
  profileTopRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  profileRightColumn: { flex: 1, marginLeft: 16, justifyContent: 'center' },
  avatar: { width: 100, height: 100, borderRadius: 50 },
  nameRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  username: { color: COLORS.textMuted, fontSize: 13, fontWeight: '500' },
  name: { color: COLORS.text, fontSize: 15, fontWeight: '700' },
  
  // Estadísticas
  statsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingVertical: 12, borderTopWidth: 0.5, borderTopColor: '#333', marginBottom: 10 },
  statItem: { alignItems: 'center', flex: 1 },
  statSeparator: { width: 1, height: 32, backgroundColor: '#444' },
  statValue: { color: COLORS.text, fontSize: 18, fontWeight: 'bold' },
  statLabel: { color: COLORS.textMuted, fontSize: 12 },
  
  // Biografía
  bioText: { 
    color: COLORS.text, 
    fontSize: 14, 
    lineHeight: 18, // Le da aire al texto
    marginBottom: 10 
  },
  addBioButton: { marginBottom: 15, alignItems: 'center' },
  addBioText: { color: COLORS.accent, fontSize: 14, fontWeight: '600' },
  
  // Botones de acción (Editar + Compartir icono)
  actionButtonsRow: { 
    flexDirection: 'row', 
    alignItems: 'center',
    gap: 10 // Espaciado moderno
  },
  editProfileButton: { backgroundColor: COLORS.surface, paddingVertical: 6, paddingHorizontal: 14, borderRadius: 6, borderWidth: 1, borderColor: '#333', alignItems: 'center' },
  shareButton: { backgroundColor: COLORS.surface, padding: 7, borderRadius: 6, borderWidth: 1, borderColor: '#333', alignItems: 'center', justifyContent: 'center' },
  editProfileText: { color: COLORS.text, fontSize: 12, fontWeight: '600' },

  // Banner ViralShop PRO
  proBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: 12, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#2a2a2a' },
  proIconWrap: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.accent, alignItems: 'center', justifyContent: 'center' },
  proTitle: { color: COLORS.text, fontSize: 15, fontWeight: '700' },
  proSubtitle: { color: COLORS.textMuted, fontSize: 12, marginTop: 2 },

  // Botones Publicar + Ofertas
  mainButtonsRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  publishButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.accent, paddingVertical: 12, borderRadius: 10 },
  publishButtonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  offersButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.surface, paddingVertical: 11, paddingHorizontal: 20, borderRadius: 8, borderWidth: 1, borderColor: '#333' },
  offersButtonText: { color: COLORS.text, fontSize: 15, fontWeight: '600' },
  
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

  // Modal / Menu Hamburguesa
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  bottomSheet: { backgroundColor: COLORS.surface, borderTopLeftRadius: 15, borderTopRightRadius: 15, padding: 20, paddingBottom: 40, minHeight: 300 },
  bottomSheetHandle: { width: 40, height: 4, backgroundColor: '#555', borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  menuTitle: { color: COLORS.text, fontSize: 14, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  input: { backgroundColor: '#000', color: '#FFF', borderRadius: 10, padding: 15, fontSize: 20, textAlign: 'center', letterSpacing: 10, marginBottom: 20, borderWidth: 1, borderColor: '#333' },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15 },
  menuItemText: { color: COLORS.text, fontSize: 16, marginLeft: 15, fontWeight: '500' },
  divider: { height: 1, backgroundColor: '#333', marginVertical: 10 },
  versionText: {
    color: 'rgba(255, 255, 255, 0.4)', // Blanco semitransparente sutil
    fontSize: 11,
    textAlign: 'center', // Para que quede bien centrado al final
    marginTop: 30,       // Separación desde el botón de cerrar sesión
    letterSpacing: 1.5,
    fontWeight: '400',
  },

  // Estilos de Invitado
  guestContainer: { flex: 1, backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center', padding: 30 },
  guestIconContainer: { width: 120, height: 120, borderRadius: 60, backgroundColor: COLORS.surface, justifyContent: 'center', alignItems: 'center', marginBottom: 30, borderWidth: 1, borderColor: '#333' },
  guestTitle: { fontSize: 24, fontWeight: 'bold', color: COLORS.text, marginBottom: 15 },
  guestSubtitle: { fontSize: 16, color: COLORS.textMuted, textAlign: 'center', marginBottom: 40, lineHeight: 24 },
  guestButton: { backgroundColor: COLORS.accent, paddingVertical: 16, paddingHorizontal: 40, borderRadius: 8, width: '100%', alignItems: 'center' },
  guestButtonText: { color: '#000', fontSize: 16, fontWeight: 'bold' },

  // 👇 Estilos de ViralShop Midnight 👇
  midnightOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center' },
  midnightCard: { width: '85%', backgroundColor: '#0A0514', borderRadius: 24, padding: 25, borderWidth: 1, borderColor: '#2A1A3D', shadowColor: '#b829db', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 15 },
  midnightCloseBtn: { position: 'absolute', top: 15, right: 15, zIndex: 10 },
  midnightContent: { alignItems: 'center', paddingTop: 10 },
  neonIconContainer: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(184, 41, 219, 0.1)', justifyContent: 'center', alignItems: 'center', marginBottom: 15, borderWidth: 1, borderColor: 'rgba(184, 41, 219, 0.3)' },
  midnightTitle: { color: '#FFF', fontSize: 24, fontWeight: 'bold', marginBottom: 15, letterSpacing: 1 },
  midnightDesc: { color: '#AAA', fontSize: 14, textAlign: 'center', lineHeight: 22, marginBottom: 25, paddingHorizontal: 10 },
  ageTag: { backgroundColor: 'transparent', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: '#FF2D55', marginBottom: 30 },
  ageTagText: { color: '#FF2D55', fontSize: 11, fontWeight: 'bold', letterSpacing: 2 },
  neonButton: { width: '100%', backgroundColor: '#b829db', paddingVertical: 16, borderRadius: 12, alignItems: 'center', shadowColor: '#b829db', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 10 },
  neonButtonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold', letterSpacing: 0.5 },
  midnightInput: { width: '100%', backgroundColor: '#000', color: '#b829db', fontSize: 32, textAlign: 'center', letterSpacing: 15, paddingVertical: 15, borderRadius: 12, borderWidth: 1, borderColor: '#b829db', marginBottom: 10 },
});