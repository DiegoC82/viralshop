// frontend/src/screens/FeedScreen.tsx
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { StyleSheet, Text, View, FlatList, Dimensions, TouchableOpacity, Image, ActivityIndicator, RefreshControl, Alert, Share, Modal, TextInput, KeyboardAvoidingView, Platform, Animated, useWindowDimensions, ScrollView } from 'react-native'; //
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import { useFocusEffect, useNavigation, useIsFocused } from '@react-navigation/native'; 
import { useVideoPlayer, VideoView } from 'expo-video';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import axios from 'axios';
import { COLORS } from '../theme/colors';
import { TouchableWithoutFeedback } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCurrency } from '../context/CurrencyContext';
import { formatCurrency } from '../utils/formatters';

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';

const BASE_URL = 'https://viralshop-xr9v.onrender.com';

const REPORT_REASONS = [
  { id: 'fraude', label: 'Fraude, estafa o bienes falsos', icon: 'warning-outline', color: '#FF9500' },
  { id: 'sexual', label: 'Contenido sexual o desnudez', icon: 'body-outline', color: '#FF2D55' },
  { id: 'acoso', label: 'Acoso o incitación al odio', icon: 'hand-left-outline', color: '#FF3B30' },
  { id: 'spam', label: 'Spam o información engañosa', icon: 'megaphone-outline', color: '#5856D6' },
  { id: 'falso', label: 'Suplantación de identidad', icon: 'person-remove-outline', color: '#8E8E93' },
  { id: 'violencia', label: 'Violencia o actividades peligrosas', icon: 'skull-outline', color: '#FFF' }
];

const handleSendReport = async (targetId: string, type: 'VIDEO' | 'PROFILE', reason: string) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        Alert.alert("Atención", "Debes iniciar sesión para reportar contenido.");
        return;
      }
      
      // Enviamos al backend
      await axios.post(`${BASE_URL}/videos/report`, // Ajusta la ruta según dónde la pongas
        { targetId, type, reason },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      Alert.alert(
        "Denuncia recibida", 
        "Gracias por ayudarnos a mantener segura la comunidad. Nuestro equipo lo revisará en menos de 24hs."
      );
    } catch (error) {
      Alert.alert("Error", "No se pudo enviar el reporte. Intenta más tarde.");
    }
  };

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true, 
    shouldShowList: true,   
  }),
});

async function registerForPushNotificationsAsync() {
  let token;

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Fallo al obtener el token para notificaciones push');
      return;
    }

    token = (await Notifications.getExpoPushTokenAsync()).data;

    try {
      const userToken = await AsyncStorage.getItem('userToken');
      if (userToken) {
        await axios.patch(`${BASE_URL}/users/update-push-token`, 
          { pushToken: token },
          { headers: { Authorization: `Bearer ${userToken}` } }
        );
      }
    } catch (error) {
      console.error("Error guardando el token en el servidor:", error);
    }
  }

  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  return token;
}

// 👇 Recibimos el estado de "Mute Global" como propiedades 👇
const FeedItem = React.memo(({ item, isActive, isGlobalMuted, setIsGlobalMuted, width, height }: { item: any; isActive: boolean; isGlobalMuted: boolean; setIsGlobalMuted: any; width: number; height: number }) => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets(); 

  const player = useVideoPlayer(item.videoUrl, player => {
    player.loop = true;
    player.muted = isGlobalMuted; 
  });

  // Si cambia el Mute Global, actualizamos este reproductor al instante
  useEffect(() => {
    player.muted = isGlobalMuted;
  }, [isGlobalMuted, player]);

  useEffect(() => {
    if (isActive) player.play();
    else player.pause();
  }, [isActive, player]); 

  const avatarUri = item.user?.avatarUrl || 'https://i.pravatar.cc/150?u=' + item.userId;

  const [isLiked, setIsLiked] = useState(item.isLiked || false);
  const [showComments, setShowComments] = useState(false);
  const [likesCount, setLikesCount] = useState(item._count?.likes || 0);
  const [commentsCount, setCommentsCount] = useState(item._count?.comments || 0);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);

  const { currency, exchangeRate } = useCurrency(); // 👈 Llama a tu cerebro global

  const goToProfile = (userIdToNavigate: string) => {
    setShowComments(false); 
    navigation.navigate('PublicProfile', { userId: userIdToNavigate });
  };

  const translateX = useRef(new Animated.Value(0)).current;

  const onGestureEvent = Animated.event(
    [{ nativeEvent: { translationX: translateX } }],
    { useNativeDriver: true }
  );

  const blinkAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(blinkAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(blinkAnim, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const onHandlerStateChange = (event: any) => {
    if (event.nativeEvent.oldState === State.ACTIVE) {
      const { translationX, velocityX } = event.nativeEvent;

      if (translationX < -100 || velocityX < -500) {
        Animated.timing(translateX, {
          toValue: -width,
          duration: 200,
          useNativeDriver: true,
        }).start(() => {
          goToProfile(item.userId);
          setTimeout(() => translateX.setValue(0), 500); 
        });
      } else {
        Animated.spring(translateX, {
          toValue: 0,
          useNativeDriver: true,
        }).start();
      }
    }
  };

  const handleProtectedAction = async (actionCallback: () => void) => {
    const token = await AsyncStorage.getItem('userToken');
    if (!token) {
      Alert.alert(
        "¡Únete a la comunidad! 🚀",
        "Regístrate gratis para interactuar con tus videos favoritos.",
        [
          { text: "Seguir mirando", style: "cancel" },
          { text: "Registrarme", onPress: () => navigation.navigate('Auth') }
        ]
      );
      return;
    }
    actionCallback();
  };

  const shareVideo = async () => {
    try {
      await Share.share({
        message: `¡Mira este increíble video en ViralShop! 🚀 ${item.description || ''}`,
      });
    } catch (error) {
      console.log("Error al compartir:", error);
    }
  };

  const toggleLike = async () => {
    const previousState = isLiked;
    const previousCount = likesCount; // 👈 Guardamos el número anterior

    setIsLiked(!isLiked); 
    setLikesCount(isLiked ? likesCount - 1 : likesCount + 1); // 👈 Sumamos o restamos 1

    try {
      const token = await AsyncStorage.getItem('userToken');
      await axios.post(`${BASE_URL}/videos/${item.id}/like`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (error) {
      setIsLiked(previousState); 
      setLikesCount(previousCount); // 👈 Revertimos si hay error
    }
  };

  const openComments = async () => {
    setShowComments(true);
    setLoadingComments(true);
    try {
      const response = await axios.get(`${BASE_URL}/videos/${item.id}/comments`);
      setComments((response.data || []).reverse());
    } catch (error) {
      console.log("Error al cargar comentarios", error);
    } finally {
      setLoadingComments(false);
    }
  };

  const postComment = async () => {
    if (newComment.trim() === '') return;
    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await axios.post(`${BASE_URL}/videos/${item.id}/comments`, 
        { text: newComment },
        { headers: { Authorization: `Bearer ${token}` }}
      );
      setComments([response.data, ...comments]); 
      setCommentsCount(commentsCount + 1); // 👈 AGREGAR ESTA LÍNEA
      setNewComment(''); 
    } catch (error) {
      Alert.alert("Error", "No se pudo enviar el comentario.");
    }
  };

  // 👇 El mute ahora invierte el estado global para todos los videos 👇
  const toggleMute = () => {
    setIsGlobalMuted(!isGlobalMuted);
  };

  const toggleFollow = () => {
    console.log("Llamar a la API para Seguir al usuario: ", item.userId);
  };

  return (
    <View style={[styles.videoWrapper, { width, height }]}>
      
      <View style={styles.profileIndicator}>
        <Image source={{ uri: avatarUri }} style={styles.profileIndicatorImg} />
        <Text style={styles.profileIndicatorText}>Ir al perfil</Text>
        <Ionicons name="chevron-forward" size={24} color={COLORS.textMuted} />
      </View>

      <PanGestureHandler
        onGestureEvent={onGestureEvent}
        onHandlerStateChange={onHandlerStateChange}
        activeOffsetX={[-20, 20]} 
      >
        <Animated.View style={[styles.videoContainer, { width, height, transform: [{ translateX }] }]}>
          <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="cover" nativeControls={false} />
          <View style={styles.darkOverlay} />

          {/* 👇 REEMPLAZA TU VIDEOVIEW POR ESTE BLOQUE 👇 */}
          <TouchableWithoutFeedback onPress={toggleMute}>
            <View style={StyleSheet.absoluteFill}>
              <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="cover" nativeControls={false} />
            </View>
          </TouchableWithoutFeedback>
          
          <View style={styles.infoOverlay}>
            <TouchableOpacity onPress={() => goToProfile(item.userId)} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
              <Text style={[styles.username, { marginBottom: 0 }]}>@{item.user?.username || 'usuario'}</Text>
              {item.user?.isVerified && (
                <Ionicons name="shield-checkmark" size={16} color="#1DA1F2" style={{ marginLeft: 6, textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 3 }} />
              )}
            </TouchableOpacity>
            <Text style={styles.description}>{item.description}</Text>

            {item.productName ? (
              <TouchableOpacity style={styles.productTag}>
                <Ionicons name="cart" size={16} color="#000" />
                <Text style={styles.productName} numberOfLines={1}>{item.productName}</Text>
                
                {/* 👇 AHORA SÍ LEEMOS EL DESCUENTO 👇 */}
                {item.discountPrice ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={{ color: '#555', textDecorationLine: 'line-through', fontSize: 11, marginRight: 5 }}>
                      {formatCurrency(item.productPrice, currency, exchangeRate)}
                    </Text>
                    <Text style={[styles.productPrice, { color: '#b829db' }]}>
                      {formatCurrency(item.discountPrice, currency, exchangeRate)}
                    </Text>
                  </View>
                ) : item.productPrice ? (
                  <Text style={styles.productPrice}>
                    {formatCurrency(item.productPrice, currency, exchangeRate)}
                  </Text>
                ) : null}

                <Ionicons name="chevron-forward" size={14} color="#000" />
              </TouchableOpacity>
            ) : null}
          </View>

          {/* 👇 NUEVO ORDEN DEL MENÚ DERECHO INVERTIDO Y TRANSPARENTE 👇 */}
          <View style={styles.actionOverlay}>
            {/* 👇 AGREGA ESTE BLOQUE EXACTAMENTE AQUÍ (Arriba del corazón) 👇 */}
            {isGlobalMuted && (
              <TouchableOpacity style={styles.actionButton} onPress={toggleMute}>
                <Ionicons name="volume-mute" size={32} color="rgba(255,255,255,0.8)" />
              </TouchableOpacity>
            )}

           {/* 2. Like */}
            <TouchableOpacity style={styles.actionButton} onPress={() => handleProtectedAction(toggleLike)}>
              <Ionicons name={isLiked ? "heart" : "heart-outline"} size={32} color={isLiked ? "#FF2D55" : "rgba(255,255,255,0.7)"} />
              <Text style={styles.actionText}>{likesCount}</Text>
            </TouchableOpacity>

            {/* 3. Comentarios */}
            <TouchableOpacity style={styles.actionButton} onPress={() => handleProtectedAction(openComments)}>
              <Ionicons name="chatbubble-ellipses" size={28} color="rgba(255,255,255,0.7)" />
              <Text style={styles.actionText}>{commentsCount}</Text>
            </TouchableOpacity>

            {/* 4. Compartir */}
            <TouchableOpacity style={styles.actionButton} onPress={shareVideo}>
              <Ionicons name="arrow-redo" size={28} color="rgba(255,255,255,0.5)" />
            </TouchableOpacity>

            {/* 5. Foto de Perfil (Abajo de todo) */}
            <View style={styles.profileContainer}>
              <TouchableOpacity onPress={() => goToProfile(item.userId)}>
                <View style={{ position: 'relative' }}>
                  <Image 
                    source={{ uri: avatarUri }} 
                    style={[styles.profilePic, item.user?.isVerified && { borderColor: '#1DA1F2' }]} 
                  />
                  {/* 👇 AGREGA EL PUNTO DE CONEXIÓN EXACTAMENTE AQUÍ 👇 */}
                  <Animated.View style={[
                    styles.onlineDotFeed,
                    { backgroundColor: item.user?.isOnline ? COLORS.accent : '#888888' }, // Rosado online, gris offline
                    item.user?.isOnline ? { opacity: blinkAnim } : { opacity: 1 }      // Solo titila si está online
                  ]} />
                  {/* 👇 MINI ESCUDO EN LA FOTO DEL FEED 👇 */}
                  {item.user?.isVerified && (
                    <View style={styles.feedVerifiedBadge}>
                      <Ionicons name="shield-checkmark" size={10} color="#FFF" />
                    </View>
                  )}
                </View>
              </TouchableOpacity>
              <TouchableOpacity style={styles.followButton} onPress={() => handleProtectedAction(() => toggleFollow())}>
                <Ionicons name="add" size={14} color="#FFF" />
              </TouchableOpacity>
            </View>

          </View>

        </Animated.View>
      </PanGestureHandler>

      <Modal visible={showComments} animationType="slide" transparent={true} onRequestClose={() => setShowComments(false)}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === "ios" ? "padding" : undefined} 
          keyboardVerticalOffset={Platform.OS === "android" ? 20 : 0}
          style={styles.modalContainer}
        >
          {/* 👇 2. Aumentamos el padding inferior en Android para alejarlo de los botones del celular 👇 */}
          <View style={[
            styles.bottomSheet, 
            { 
              height: Dimensions.get('window').height * 0.55, 
              paddingBottom: Math.max(insets.bottom, 15)
            }
          ]}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Comentarios</Text>
              <TouchableOpacity onPress={() => setShowComments(false)}>
                <Ionicons name="close-circle" size={28} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>

            {loadingComments ? (
              <ActivityIndicator size="large" color={COLORS.accent} style={{ marginTop: 20 }} />
            ) : (
              <FlatList
                data={comments}
                keyExtractor={(c, index) => index.toString()}
                renderItem={({ item: comment }) => (
                  <View style={styles.commentBox}>
                    <TouchableOpacity onPress={() => goToProfile(comment.userId)}>
                      <Image source={{ uri: comment.user?.avatarUrl || `https://ui-avatars.com/api/?name=${comment.user?.username || 'User'}&background=random&color=fff&size=150` }} style={styles.commentAvatar} />
                    </TouchableOpacity>
                    <View style={styles.commentContent}>
                      <TouchableOpacity onPress={() => goToProfile(comment.userId)}>
                        <Text style={styles.commentUser}>@{comment.user?.username || 'usuario'}</Text>
                      </TouchableOpacity>
                      <Text style={styles.commentText}>{comment.text}</Text>
                    </View>
                  </View>
                )}
                ListEmptyComponent={<Text style={styles.emptyText}>Sé el primero en comentar.</Text>}
              />
            )}

            <View style={styles.inputContainer}>
              <TextInput 
                style={styles.commentInput} 
                placeholder="Añadir un comentario..." 
                placeholderTextColor={COLORS.textMuted}
                value={newComment}
                onChangeText={setNewComment}
              />
              <TouchableOpacity style={styles.sendButton} onPress={postComment}>
                <Ionicons name="send" size={20} color={newComment.trim() ? COLORS.accent : COLORS.textMuted} />
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
// 👇 2. Agregamos esta función matemática justo antes de cerrar el FeedItem 👇
}, (prevProps, nextProps) => {
  // Solo se re-dibuja si cambia el ID, si se activa/pausa, o si se mutea
  return prevProps.item.id === nextProps.item.id && 
         prevProps.isActive === nextProps.isActive &&
         prevProps.isGlobalMuted === nextProps.isGlobalMuted;
});

export default function FeedScreen() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [videos, setVideos] = useState<any[]>([]); 
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('Para ti'); 

  const [optionsModalVisible, setOptionsModalVisible] = useState(false);
  const [reportModalVisible, setReportModalVisible] = useState(false);

  const { width } = useWindowDimensions();
  const [listHeight, setListHeight] = useState(0);

  // 👇 1. NUEVA FUNCIÓN: Cambia la pestaña y reinicia el video al primero 👇
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setActiveIndex(0);
  };

  // 👇 Estado global de Mute manejado desde la pantalla principal 👇
  const [isGlobalMuted, setIsGlobalMuted] = useState(false);

  const isFocused = useIsFocused();
  const navigation = useNavigation<any>();

  useEffect(() => {
    registerForPushNotificationsAsync();
  }, []);

  const fetchVideos = async () => {
    try {
      // 👇 1. ENVIAMOS EL TOKEN AL SERVIDOR PARA QUE SEPA QUIÉNES SOMOS 👇
      const token = await AsyncStorage.getItem('userToken');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const response = await axios.get(`${BASE_URL}/videos/feed`, { headers });
      setVideos(response.data);
    } catch (error) {
      console.error("Error al traer videos:", error);
    } finally {
      setLoading(false);
      setRefreshing(false); 
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchVideos();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchVideos();
  };

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 50 }).current;
  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) setActiveIndex(viewableItems[0].index);
  }).current;

  const keyExtractor = useCallback((item: any) => item.id, []);

  // 👇 2. NUEVO FILTRO: Oculta los remates en "Para ti" 👇
  const filteredVideos = videos.filter(video => {
    if (activeTab === 'Ofertas') {
      // 👈 AHORA BUSCA VIDEOS CON PRECIO REBAJADO (OFERTAS)
      return video.discountPrice != null; 
    }
    if (activeTab === 'Siguiendo') {
      return video.isFollowing === true; // Muestra solo a los que sigues
    }
    // Pestaña 'Para ti': Muestra todos los videos del feed 
    // (El backend ya se encargó de ocultar los remates con el candado)
    return true; 
  });
  
  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={COLORS.accent} />
      </View>
    );
  }

  return (
    <View style={styles.mainContainer} onLayout={(e) => setListHeight(e.nativeEvent.layout.height)}>
      
      {/* 👇 AQUÍ ESTÁ LA MAGIA: Volvemos a poner el topNavContainer 👇 */}
      <View style={styles.topNavContainer}>
        
        <View style={styles.topNavTabs}>
          <TouchableOpacity onPress={() => handleTabChange('Siguiendo')}>
            <Text style={activeTab === 'Siguiendo' ? styles.topNavTextActive : styles.topNavTextInactive}>Siguiendo</Text>
          </TouchableOpacity>
          
          <TouchableOpacity onPress={() => handleTabChange('Ofertas')}>
            <Text style={activeTab === 'Ofertas' ? styles.topNavTextActive : styles.topNavTextInactive}>Ofertas</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => handleTabChange('Para ti')}>
            <Text style={activeTab === 'Para ti' ? styles.topNavTextActive : styles.topNavTextInactive}>Para ti</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.topNavSearch} onPress={() => setOptionsModalVisible(true)}>
          <Ionicons name="ellipsis-vertical" size={26} color="#FFF" style={{ textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 3 }} />
        </TouchableOpacity>
        
      </View>

      {listHeight > 0 && (
      <FlatList
        data={filteredVideos}
        renderItem={({ item, index }) => (
          <FeedItem 
            item={item} 
            isActive={index === activeIndex && isFocused} 
            isGlobalMuted={isGlobalMuted} 
            setIsGlobalMuted={setIsGlobalMuted}
            width={width}
            height={listHeight} // 👈 Altura exacta del contenedor
          />
        )}
        keyExtractor={keyExtractor}
        pagingEnabled 
        showsVerticalScrollIndicator={false}
        
        // 👇 FRENADO EN SECO (Adiós asomos de videos) 👇
        snapToAlignment="start"
        decelerationRate="fast"
        snapToInterval={listHeight}
        disableIntervalMomentum={true} 
        bounces={false} 
        
        // 👇 MATEMÁTICA EXACTA 👇
        getItemLayout={(data, index) => ({
          length: listHeight,
          offset: listHeight * index,
          index,
        })}

        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.accent} colors={[COLORS.accent]} />
        }
        
        initialNumToRender={3}
        maxToRenderPerBatch={3}
        windowSize={5}
        removeClippedSubviews={true}
      />
      )}

      {/* ========================================== */}
      {/* 👇 MODAL 1: OPCIONES (LOS 3 PUNTITOS) 👇 */}
      {/* ========================================== */}
      <Modal visible={optionsModalVisible} transparent={true} animationType="slide" onRequestClose={() => setOptionsModalVisible(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setOptionsModalVisible(false)}>
          <View style={styles.bottomSheetOptions}>
            <View style={styles.bottomSheetHandle} />
            
            <TouchableOpacity style={styles.optionItem} onPress={() => { setOptionsModalVisible(false); Alert.alert('Calidad de video', 'La calidad está en Automático (HD) para optimizar tus datos.'); }}>
              <Ionicons name="options-outline" size={24} color="#FFF" />
              <Text style={styles.optionText}>Calidad del video</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.optionItem} onPress={() => { 
              setOptionsModalVisible(false); 
              setReportModalVisible(true); // 👈 ESTO ABRE EL SEGUNDO PANEL
            }}>
              <Ionicons name="flag-outline" size={24} color="#FF2D55" />
              <Text style={[styles.optionText, { color: '#FF2D55' }]}>Denunciar video</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ========================================== */}
      {/* 👇 MODAL 2: DENUNCIA PROFESIONAL 👇 */}
      {/* ========================================== */}
      <Modal visible={reportModalVisible} transparent={true} animationType="slide">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setReportModalVisible(false)}>
          <View style={[styles.bottomSheetOptions, { minHeight: 450, paddingBottom: 30 }]}>
            <View style={styles.bottomSheetHandle} />
            <Text style={{ color: '#FFF', fontSize: 18, fontWeight: 'bold', marginBottom: 5, textAlign: 'center' }}>Reportar contenido</Text>
            <Text style={{ color: '#888', fontSize: 13, textAlign: 'center', marginBottom: 20 }}>Tu denuncia es anónima. Si alguien está en peligro físico inminente, contacta a la policía local de inmediato.</Text>

            <ScrollView showsVerticalScrollIndicator={false}>
              {REPORT_REASONS.map((reason) => (
                <TouchableOpacity key={reason.id} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 0.5, borderBottomColor: '#222' }}
                  onPress={() => {
                    setReportModalVisible(false);
                    handleSendReport("TARGET_ID", "VIDEO", reason.label); 
                  }}
                >
                  <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center', marginRight: 15 }}>
                    <Ionicons name={reason.icon as any} size={18} color={reason.color} />
                  </View>
                  <Text style={{ color: '#FFF', fontSize: 15, fontWeight: '500', flex: 1 }}>{reason.label}</Text>
                  <Ionicons name="chevron-forward" size={18} color="#555" />
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity style={{ marginTop: 20, backgroundColor: '#222', paddingVertical: 14, borderRadius: 12, alignItems: 'center' }} onPress={() => setReportModalVisible(false)}>
              <Text style={{ color: '#FFF', fontWeight: 'bold' }}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: '#000' },
  videoWrapper: {  backgroundColor: '#000', overflow: 'hidden' }, 
  videoContainer: { backgroundColor: '#000' },
  darkOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.2)' },
  
  // 👇 TEXTOS MÁS PEQUEÑOS Y MÁS ABAJO 👇
  infoOverlay: { position: 'absolute', bottom: 70, left: 15, right: 75},
  username: { color: COLORS.text, fontSize: 15, fontWeight: 'bold', marginBottom: 10, textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 3 },
  description: { color: COLORS.text, fontSize: 13, marginBottom: 30, textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 3 },
  
  // 👇 MENÚ LATERAL MÁS ABAJO 👇
  actionOverlay: { position: 'absolute', bottom: 90, right: 10, alignItems: 'center' },
  actionButton: { alignItems: 'center', marginBottom: 20 },
  actionText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 2,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  
  // 👇 FOTO DE PERFIL AHORA ESTÁ ABAJO, ASÍ QUE LLEVA MARGIN TOP 👇
  profileContainer: { alignItems: 'center', marginTop: 5 },
  profilePic: { width: 50, height: 50, borderRadius: 25, borderWidth: 2, borderColor: COLORS.accent },
  followButton: { position: 'absolute', bottom: -10, backgroundColor: COLORS.primary, width: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },

  feedVerifiedBadge: {
    position: 'absolute',
    top: 30,
    right: -1,
    backgroundColor: '#1DA1F2',
    borderRadius: 8,
    padding: 2,
    borderWidth: 1.5,
    borderColor: '#000',
    zIndex: 2,
  },
  onlineDotFeed: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#000', // El borde negro hace que resalte sobre la foto
    zIndex: 10,
  },
  
  productTag: { flexDirection: 'row', backgroundColor: COLORS.accent, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, alignItems: 'center', marginBottom: 12, alignSelf: 'flex-start', maxWidth: '90%', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.5, shadowRadius: 3, elevation: 5 },
  productName: { color: '#000', fontWeight: 'bold', fontSize: 13, marginLeft: 5, marginRight: 8, flexShrink: 1 },
  productPrice: { color: '#000', fontWeight: '900', fontSize: 13, marginRight: 5 },
  
  topNavContainer: { position: 'absolute', top: Platform.OS === 'ios' ? 55 : 45, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, zIndex: 10 },
  topNavTabs: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 15 },
  topNavTextActive: { color: '#FFFFFF', fontSize: 17, fontWeight: 'bold', textShadowColor: 'rgba(0,0,0,0.7)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 4 },
  topNavTextInactive: { color: 'rgba(255,255,255,0.6)', fontSize: 16, fontWeight: '600', textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 3 },
  topNavSearch: { position: 'absolute', right: 20 },
  
  modalContainer: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  bottomSheet: { backgroundColor: COLORS.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#333', paddingBottom: 15, marginBottom: 15 },
  sheetTitle: { color: COLORS.text, fontSize: 18, fontWeight: 'bold' },
  commentBox: { flexDirection: 'row', marginBottom: 15 },
  commentAvatar: { width: 40, height: 40, borderRadius: 20, marginRight: 10 },
  commentContent: { flex: 1, justifyContent: 'center' },
  commentUser: { color: COLORS.textMuted, fontSize: 12, fontWeight: 'bold', marginBottom: 3 },
  commentText: { color: COLORS.text, fontSize: 14 },
  emptyText: { color: COLORS.textMuted, textAlign: 'center', marginTop: 20 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#333', paddingTop: 15, paddingBottom: 10, marginTop: 10 },
  commentInput: { flex: 1, backgroundColor: COLORS.background, color: COLORS.text, borderRadius: 20, paddingHorizontal: 15, paddingVertical: 10, marginRight: 10 },
  sendButton: { padding: 10 },
  
  profileIndicator: {
    position: 'absolute',
    right: 20, 
    top: Dimensions.get('window').height / 2 - 50, // 👈 Se mide a sí mismo aquí
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: -1, 
  },
  profileIndicatorImg: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: COLORS.accent,
    marginBottom: 8,
  },
  profileIndicatorText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
  },

  optionsButton: { position: 'absolute', right: 20, zIndex: 100, backgroundColor: 'rgba(0,0,0,0.4)', paddingHorizontal: 8, paddingVertical: 10, borderRadius: 20 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  bottomSheetOptions: { backgroundColor: COLORS.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 40 },
  bottomSheetHandle: { width: 40, height: 4, backgroundColor: '#555', borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  optionItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 0.5, borderBottomColor: '#333' },
  optionText: { color: '#FFF', fontSize: 16, marginLeft: 15, fontWeight: '500' }
});