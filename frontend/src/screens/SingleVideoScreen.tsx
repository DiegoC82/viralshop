// frontend/src/screens/SingleVideoScreen.tsx
import React, { useState, useRef, useEffect } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, Image, Dimensions, ActivityIndicator, Modal, TextInput, KeyboardAvoidingView, Platform, Share, Alert, useWindowDimensions, ScrollView } from 'react-native';
import { useIsFocused } from '@react-navigation/native'; 
import { useVideoPlayer, VideoView } from 'expo-video';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { TouchableWithoutFeedback, Animated } from 'react-native';
import * as Location from 'expo-location'; 
import { COLORS } from '../theme/colors';
import { useCurrency } from '../context/CurrencyContext';
import { formatCurrency } from '../utils/formatters';

const BACKEND_URL = 'https://viralshop-xr9v.onrender.com';

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
      await axios.post(`${BACKEND_URL}/videos/report`, // Ajusta la ruta según dónde la pongas
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

// =====================================================================
// 1. EL COMPONENTE DE VIDEO (Con Likes y Comentarios 100% funcionales)
// =====================================================================
const ContextualVideoItem = React.memo(({ item, isActive, width, height, navigation, isGlobalMuted, setIsGlobalMuted }: any) => {
  const { currency, exchangeRate } = useCurrency();
  const insets = useSafeAreaInsets();
  const [cityName, setCityName] = useState<string | null>(null);

  // Estados de Likes y Comentarios
  const [isLiked, setIsLiked] = useState(item.isLiked || false);
  const [likesCount, setLikesCount] = useState(item._count?.likes || item.likesCount || 0);
  const [showComments, setShowComments] = useState(false);
  const [commentsCount, setCommentsCount] = useState(item._count?.comments || item.commentsCount || 0);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);

  const player = useVideoPlayer(item.videoUrl, player => {
    player.loop = true;
    player.muted = isGlobalMuted;
  });

  const blinkAnim = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(blinkAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(blinkAnim, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  useEffect(() => { player.muted = isGlobalMuted; }, [isGlobalMuted, player]);
  useEffect(() => { if (isActive) player.play(); else player.pause(); }, [isActive, player]);

  // Traducir ubicación
  useEffect(() => {
    const fetchLocationName = async () => {
      if (item.latitude && item.longitude) {
        try {
          const geocode = await Location.reverseGeocodeAsync({ latitude: item.latitude, longitude: item.longitude });
          if (geocode.length > 0) {
            const city = geocode[0].city || geocode[0].subregion || geocode[0].region;
            if (city) setCityName(city);
          }
        } catch (error) {}
      }
    };
    fetchLocationName();
  }, [item.latitude, item.longitude]);

  // Funciones de interacción
  const toggleLike = async () => {
    const token = await AsyncStorage.getItem('userToken');
    if (!token) return Alert.alert("Atención", "Inicia sesión para dar Like.");
    
    const previousState = isLiked;
    setIsLiked(!isLiked);
    setLikesCount(isLiked ? likesCount - 1 : likesCount + 1);
    
    try {
      await axios.post(`${BACKEND_URL}/videos/${item.id}/like`, {}, { headers: { Authorization: `Bearer ${token}` } });
    } catch (error) {
      setIsLiked(previousState);
      setLikesCount(previousState ? likesCount + 1 : likesCount - 1);
    }
  };

  const openComments = async () => {
    setShowComments(true);
    setLoadingComments(true);
    try {
      const response = await axios.get(`${BACKEND_URL}/videos/${item.id}/comments`);
      setComments((response.data || []).reverse());
    } catch (error) {
      console.log("Error comentarios", error);
    } finally {
      setLoadingComments(false);
    }
  };

  const postComment = async () => {
    if (newComment.trim() === '') return;
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) return Alert.alert("Atención", "Inicia sesión para comentar.");
      
      const response = await axios.post(`${BACKEND_URL}/videos/${item.id}/comments`,
        { text: newComment },
        { headers: { Authorization: `Bearer ${token}` }}
      );
      setComments([response.data, ...comments]);
      setCommentsCount(commentsCount + 1);
      setNewComment('');
    } catch (error) {
      Alert.alert("Error", "No se pudo enviar el comentario.");
    }
  };

  // Manejo de Datos del Usuario (A prueba de errores si venís del Perfil)
  const username = item.user?.username || 'creador';
  const avatarUri = item.user?.avatarUrl || `https://ui-avatars.com/api/?name=${username}&background=random&color=fff&size=150`;

  const toggleMute = () => {
    setIsGlobalMuted(!isGlobalMuted);
  };

  return (
    <View style={[styles.videoWrapper, { width, height }]}>

      {/* 👇 REEMPLAZA TU VIDEOVIEW SOLITARIO POR ESTO 👇 */}
      <TouchableWithoutFeedback onPress={toggleMute}>
        <View style={StyleSheet.absoluteFill}>
          <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="cover" nativeControls={false} />
          
          {isGlobalMuted && (
            <View style={styles.muteIndicatorOverlay}>
              <Ionicons name="volume-mute" size={40} color="rgba(255,255,255,0.8)" />
            </View>
          )}
        </View>
      </TouchableWithoutFeedback>

      {/* Info Inferior */}
      <View style={styles.infoOverlay}>
        {(cityName || (item.latitude && item.longitude)) && (
          <View style={styles.locationTag}>
            <Ionicons name="location" size={12} color="#FFF" />
            <Text style={styles.locationText}>{cityName || 'Local'}</Text>
          </View>
        )}
        <TouchableOpacity 
          onPress={() => navigation.navigate('PublicProfile', { userId: item.userId })}
          style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 5 }}
        >
          <Text style={[styles.username, { marginBottom: 0 }]}>@{username}</Text>
          {item.user?.isVerified && (
            <Ionicons name="shield-checkmark" size={14} color="#1DA1F2" style={{ marginLeft: 5, textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 3 }} />
          )}
        </TouchableOpacity>
        <Text style={styles.description}>{item.description}</Text>

        {item.productName ? (
          <TouchableOpacity style={styles.productTag}>
            <Ionicons name="cart" size={16} color="#000" />
            <Text style={styles.productName} numberOfLines={1}>{item.productName}</Text>
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
              <Text style={styles.productPrice}>{formatCurrency(item.productPrice, currency, exchangeRate)}</Text>
            ) : null}
            <Ionicons name="chevron-forward" size={14} color="#000" />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Menú Lateral */}
      <View style={styles.actionOverlay}>

        {isGlobalMuted && (
          <TouchableOpacity style={styles.actionButton} onPress={toggleMute}>
            <Ionicons name="volume-mute" size={32} color="rgba(255,255,255,0.8)" />
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.actionButton} onPress={toggleLike}>
          <Ionicons name={isLiked ? "heart" : "heart-outline"} size={32} color={isLiked ? "#FF2D55" : "rgba(255,255,255,0.8)"} />
          <Text style={styles.actionText}>{likesCount}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={openComments}>
          <Ionicons name="chatbubble-ellipses" size={28} color="rgba(255,255,255,0.8)" />
          <Text style={styles.actionText}>{commentsCount}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={() => Share.share({ message: `¡Mira esto en ViralShop!` })}>
          <Ionicons name="arrow-redo" size={28} color="rgba(255,255,255,0.6)" />
        </TouchableOpacity>

        <View style={styles.profileContainer}>
          <TouchableOpacity onPress={() => navigation.navigate('PublicProfile', { userId: item.userId })}>
            <View style={{ position: 'relative' }}>
              <Image 
                source={{ uri: avatarUri }} 
                style={[styles.profilePic, item.user?.isVerified && { borderColor: '#1DA1F2' }]} 
              />
              {/* 👇 PUNTO DE ESTADO CON TU COLOR ACENTUADO 👇 */}
              <Animated.View style={[
                styles.onlineDotFeed,
                { backgroundColor: item.user?.isOnline ? COLORS.accent : '#888888' }, // 👈 Usa COLORS.accent
                item.user?.isOnline ? { opacity: blinkAnim } : { opacity: 1 }
              ]} />
              {/* 👇 MINI ESCUDO EN LA FOTO 👇 */}
              {item.user?.isVerified && (
                <View style={styles.feedVerifiedBadge}>
                  <Ionicons name="shield-checkmark" size={10} color="#FFF" />
                </View>
              )}
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={styles.followButton}>
            <Ionicons name="add" size={14} color="#FFF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Modal de Comentarios (Idéntico al FeedScreen) */}
      <Modal visible={showComments} animationType="slide" transparent={true} onRequestClose={() => setShowComments(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.modalContainer}>
          <View style={[styles.bottomSheet, { height: height * 0.55, paddingBottom: Math.max(insets.bottom, 15) }]}>
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
                    <TouchableOpacity onPress={() => { setShowComments(false); navigation.navigate('PublicProfile', { userId: comment.userId }); }}>
                      <Image source={{ uri: comment.user?.avatarUrl || `https://ui-avatars.com/api/?name=${comment.user?.username || 'C'}&background=random&color=fff&size=150` }} style={styles.commentAvatar} />
                    </TouchableOpacity>
                    <View style={styles.commentContent}>
                      <Text style={styles.commentUser}>@{comment.user?.username || 'creador'}</Text>
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
}, (p, n) => p.item.id === n.item.id && p.isActive === n.isActive && p.isGlobalMuted === n.isGlobalMuted);

// =====================================================================
// 2. PANTALLA PRINCIPAL (Maneja la lista de videos sin desaparecer)
// =====================================================================
export default function SingleVideoScreen({ route, navigation }: any) {
  // Manejo súper seguro de los arrays para evitar la pantalla en blanco
  const videoList = route.params?.videos || (route.params?.video ? [route.params.video] : []);
  const rawIndex = route.params?.initialIndex || 0;
  // Validamos que el índice exista dentro de la lista para no causar un crash
  const initialIndex = (rawIndex >= 0 && rawIndex < videoList.length) ? rawIndex : 0;

  const insets = useSafeAreaInsets();
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const [isGlobalMuted, setIsGlobalMuted] = useState(false);
  const isFocused = useIsFocused();

  const [optionsModalVisible, setOptionsModalVisible] = useState(false);
  const [reportModalVisible, setReportModalVisible] = useState(false);

  const { width } = useWindowDimensions();
  const [containerHeight, setContainerHeight] = useState(0);

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) setActiveIndex(viewableItems[0].index);
  }).current;

  if (videoList.length === 0) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={COLORS.accent} />
      </View>
    );
  }

  return (
    <View style={styles.container} onLayout={(e) => setContainerHeight(e.nativeEvent.layout.height)}>
      <TouchableOpacity style={[styles.backButton, { top: Math.max(insets.top, 20) }]} onPress={() => navigation.goBack()}>
        <Ionicons name="chevron-back" size={28} color="#FFF" />
      </TouchableOpacity>

      <TouchableOpacity style={[styles.optionsButton, { top: Math.max(insets.top, 20) }]} onPress={() => setOptionsModalVisible(true)}>
        <Ionicons name="ellipsis-vertical" size={24} color="#FFF" />
      </TouchableOpacity>

      {containerHeight > 0 && (
        <FlatList
          data={videoList}
          keyExtractor={(item, index) => item.id ? item.id.toString() : index.toString()}
          renderItem={({ item, index }) => (
            <ContextualVideoItem
              item={item}
              isActive={index === activeIndex && isFocused}
              width={width}
              height={containerHeight} // 👈 Le pasamos la nueva altura perfecta
              navigation={navigation}
              isGlobalMuted={isGlobalMuted}
              setIsGlobalMuted={setIsGlobalMuted}
            />
          )}
          pagingEnabled
          showsVerticalScrollIndicator={false}
          snapToAlignment="start"
          decelerationRate="fast"
          snapToInterval={containerHeight} // 👈
          
          // 👇 LAS DOS LÍNEAS ANTI-FRANJA QUE FALTABAN 👇
          disableIntervalMomentum={true}
          bounces={false}
          
          getItemLayout={(_, i) => ({ length: containerHeight, offset: containerHeight * i, index: i })}
          initialScrollIndex={initialIndex}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
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

// =====================================================================
// 3. ESTILOS (Optimizados para convivir con el Tab Menu)
// =====================================================================
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  videoWrapper: { backgroundColor: '#000' },
  backButton: { position: 'absolute', left: 20, zIndex: 100, backgroundColor: 'rgba(0,0,0,0.4)', padding: 8, borderRadius: 20 },
  
  // Info Inferior levantada para que el menú Main no lo tape
  infoOverlay: { position: 'absolute', bottom: 85, left: 15, right: 75},
  locationTag: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)', alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, marginBottom: 8 },
  locationText: { color: '#FFF', fontSize: 11, fontWeight: '600', marginLeft: 4 },
  username: { color: COLORS.text, fontSize: 15, fontWeight: 'bold', marginBottom: 10, textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 3 },
  description: { color: '#EEE', fontSize: 13, marginBottom: 15 },
  productTag: { flexDirection: 'row', backgroundColor: COLORS.accent, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, alignItems: 'center', alignSelf: 'flex-start' },
  productName: { color: '#000', fontWeight: 'bold', fontSize: 13, marginLeft: 5, marginRight: 8, flexShrink: 1 },
  productPrice: { color: '#000', fontWeight: '900', fontSize: 13, marginRight: 5 },

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
  muteIndicatorOverlay: { 
    position: 'absolute', 
    top: '50%', 
    left: '50%', 
    marginTop: -35, 
    marginLeft: -35, 
    backgroundColor: 'rgba(0,0,0,0.4)', 
    padding: 15, 
    borderRadius: 40, 
    zIndex: 10, 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  // 👇 AGREGA ESTE ESTILO EN TUS STYLES DE AMBOS ARCHIVOS 👇
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
  
  // Botones levantados
  actionOverlay: { position: 'absolute', bottom: 90, right: 10, alignItems: 'center' },
  actionButton: { alignItems: 'center', marginBottom: 20 },
  actionText: { color: '#FFF', fontSize: 12, fontWeight: 'bold', marginTop: 2 },
  profileContainer: { alignItems: 'center', marginTop: 5 },
  profilePic: { width: 50, height: 50, borderRadius: 25, borderWidth: 2, borderColor: COLORS.accent },
  followButton: { position: 'absolute', bottom: -5, backgroundColor: COLORS.primary, width: 18, height: 18, borderRadius: 9, justifyContent: 'center', alignItems: 'center' },

  // Estilos del Modal de Comentarios
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

  optionsButton: { position: 'absolute', right: 20, zIndex: 100, backgroundColor: 'rgba(0,0,0,0.4)', paddingHorizontal: 8, paddingVertical: 10, borderRadius: 20 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  bottomSheetOptions: { backgroundColor: COLORS.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 40 },
  bottomSheetHandle: { width: 40, height: 4, backgroundColor: '#555', borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  optionItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 0.5, borderBottomColor: '#333' },
  optionText: { color: '#FFF', fontSize: 16, marginLeft: 15, fontWeight: '500' }
});