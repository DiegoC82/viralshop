// frontend/src/screens/FeedScreen.tsx
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { StyleSheet, Text, View, FlatList, Dimensions, TouchableOpacity, Image, ActivityIndicator, RefreshControl, Alert, Share, Modal, TextInput, KeyboardAvoidingView, Platform, Animated } from 'react-native';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import { useFocusEffect, useNavigation, useIsFocused } from '@react-navigation/native'; 
import { useVideoPlayer, VideoView } from 'expo-video';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import axios from 'axios';
import { COLORS } from '../theme/colors';
import AsyncStorage from '@react-native-async-storage/async-storage';

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';

const { height, width } = Dimensions.get('window');
const BASE_URL = 'https://viralshop-xr9v.onrender.com';

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
const FeedItem = React.memo(({ item, isActive, isGlobalMuted, setIsGlobalMuted }: { item: any; isActive: boolean; isGlobalMuted: boolean; setIsGlobalMuted: any }) => {
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

  const goToProfile = (userIdToNavigate: string) => {
    setShowComments(false); 
    navigation.navigate('PublicProfile', { userId: userIdToNavigate });
  };

  const translateX = useRef(new Animated.Value(0)).current;

  const onGestureEvent = Animated.event(
    [{ nativeEvent: { translationX: translateX } }],
    { useNativeDriver: true }
  );

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
    <View style={styles.videoWrapper}>
      
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
        <Animated.View style={[styles.videoContainer, { transform: [{ translateX }] }]}>
          <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="cover" nativeControls={false} />
          <View style={styles.darkOverlay} />
          
          <View style={styles.infoOverlay}>
            <TouchableOpacity onPress={() => goToProfile(item.userId)}>
              <Text style={styles.username}>@{item.user?.username || 'usuario'}</Text>
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
                      ${item.productPrice}
                    </Text>
                    <Text style={[styles.productPrice, { color: '#b829db' }]}>
                      ${item.discountPrice}
                    </Text>
                  </View>
                ) : item.productPrice ? (
                  <Text style={styles.productPrice}>${item.productPrice}</Text>
                ) : null}

                <Ionicons name="chevron-forward" size={14} color="#000" />
              </TouchableOpacity>
            ) : null}
          </View>

          {/* 👇 NUEVO ORDEN DEL MENÚ DERECHO INVERTIDO Y TRANSPARENTE 👇 */}
          <View style={styles.actionOverlay}>
            
            {/* 1. Mute (Global) */}
            <TouchableOpacity style={styles.actionButton} onPress={toggleMute}>
              <Ionicons name={isGlobalMuted ? "volume-mute" : "volume-high"} size={28} color="rgba(255,255,255,0.5)" />
            </TouchableOpacity>

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
                <Image source={{ uri: avatarUri }} style={styles.profilePic} />
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
          behavior={Platform.OS === "ios" ? "padding" : "height"} 
          keyboardVerticalOffset={Platform.OS === "android" ? 20 : 0}
          style={styles.modalContainer}
        >
          {/* 👇 2. Aumentamos el padding inferior en Android para alejarlo de los botones del celular 👇 */}
          <View style={[
            styles.bottomSheet, 
            { 
              height: Dimensions.get('window').height * 0.5, 
              paddingBottom: Platform.OS === 'android' ? Math.max(insets.bottom, 35) : Math.max(insets.bottom, 15) 
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

  const renderItem = useCallback(({ item, index }: any) => (
    <FeedItem 
      item={item} 
      isActive={index === activeIndex && isFocused} 
      isGlobalMuted={isGlobalMuted} 
      setIsGlobalMuted={setIsGlobalMuted} 
    />
  ), [activeIndex, isFocused, isGlobalMuted]);

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
      <View style={[styles.videoContainer, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={COLORS.accent} />
      </View>
    );
  }

  return (
    <View style={styles.mainContainer}>
      
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

        <TouchableOpacity style={styles.topNavSearch} onPress={() => navigation.navigate('Buscar')}>
          <Ionicons name="search" size={28} color="rgba(255,255,255,0.8)" />
        </TouchableOpacity>
        
      </View>

      <FlatList
        data={filteredVideos}
        renderItem={renderItem}          // 👈 Usamos la función memorizada
        keyExtractor={keyExtractor}      // 👈 Usamos la llave memorizada
        pagingEnabled 
        showsVerticalScrollIndicator={false}
        snapToAlignment="start"
        decelerationRate="fast"
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.accent} colors={[COLORS.accent]} />
        }
        // 👇 AGREGAR ESTAS 4 LÍNEAS DE RENDIMIENTO 👇
        initialNumToRender={3}           // Solo renderiza 3 videos al iniciar
        maxToRenderPerBatch={3}          // Renderiza de a 3 mientras bajas
        windowSize={5}                   // Mantiene en memoria 2 arriba, el actual, y 2 abajo
        removeClippedSubviews={true}     // ¡Destruye los videos que quedan muy lejos!
      />
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: COLORS.background },
  videoWrapper: { height: height, width: width, backgroundColor: '#000', overflow: 'hidden' }, 
  videoContainer: { height: height, width: width, backgroundColor: COLORS.background },
  darkOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.2)' },
  
  // 👇 TEXTOS MÁS PEQUEÑOS Y MÁS ABAJO 👇
  infoOverlay: { position: 'absolute', bottom: 50, left: 15, right: 75},
  username: { color: COLORS.text, fontSize: 15, fontWeight: 'bold', marginBottom: 10, textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 3 },
  description: { color: COLORS.text, fontSize: 13, marginBottom: 30, textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 3 },
  
  // 👇 MENÚ LATERAL MÁS ABAJO 👇
  actionOverlay: { position: 'absolute', bottom: 70, right: 10, alignItems: 'center' },
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
  
  productTag: { flexDirection: 'row', backgroundColor: COLORS.accent, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, alignItems: 'center', marginBottom: 12, alignSelf: 'flex-start', maxWidth: '90%', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.5, shadowRadius: 3, elevation: 5 },
  productName: { color: '#000', fontWeight: 'bold', fontSize: 13, marginLeft: 5, marginRight: 8, flexShrink: 1 },
  productPrice: { color: '#000', fontWeight: '900', fontSize: 13, marginRight: 5 },
  
  topNavContainer: { position: 'absolute', top: 30, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, zIndex: 10 },
  topNavTabs: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 15 },
  topNavTextActive: { color: '#FFFFFF', fontSize: 17, fontWeight: 'bold', textShadowColor: 'rgba(0,0,0,0.7)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 4 },
  topNavTextInactive: { color: 'rgba(255,255,255,0.6)', fontSize: 16, fontWeight: '600', textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 3 },
  topNavSearch: { position: 'absolute', right: 20 },
  
  modalContainer: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  bottomSheet: { backgroundColor: COLORS.surface, height: height * 0.6, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#333', paddingBottom: 15, marginBottom: 15 },
  sheetTitle: { color: COLORS.text, fontSize: 18, fontWeight: 'bold' },
  commentBox: { flexDirection: 'row', marginBottom: 15 },
  commentAvatar: { width: 40, height: 40, borderRadius: 20, marginRight: 10 },
  commentContent: { flex: 1, justifyContent: 'center' },
  commentUser: { color: COLORS.textMuted, fontSize: 12, fontWeight: 'bold', marginBottom: 3 },
  commentText: { color: COLORS.text, fontSize: 14 },
  emptyText: { color: COLORS.textMuted, textAlign: 'center', marginTop: 20 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#333', paddingTop: 15, marginTop: 10 },
  commentInput: { flex: 1, backgroundColor: COLORS.background, color: COLORS.text, borderRadius: 20, paddingHorizontal: 15, paddingVertical: 10, marginRight: 10 },
  sendButton: { padding: 10 },
  
  profileIndicator: {
    position: 'absolute',
    right: 20, 
    top: height / 2 - 50, 
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
});