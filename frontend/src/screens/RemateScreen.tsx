// frontend/src/screens/RemateScreen.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  View, Text, StyleSheet, Dimensions, FlatList, 
  Image, TouchableOpacity, Animated, ActivityIndicator, Alert, Share,
  Modal, TextInput, KeyboardAvoidingView, Platform // 👈 AGREGAR ESTOS 4
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useNavigation, useIsFocused } from '@react-navigation/native';
import { useVideoPlayer, VideoView } from 'expo-video'; // 👈 ¡NUEVO!
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { Switch } from 'react-native'; // 👈 Asegúrate de importar Switch
import { useCurrency } from '../context/CurrencyContext';
import { formatCurrency } from '../utils/formatters';
import { COLORS } from '../theme/colors';

const { width, height } = Dimensions.get('window');
const BACKEND_URL = 'https://viralshop-xr9v.onrender.com';

export default function RemateScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const { currency, exchangeRate } = useCurrency();
  
  const [auctions, setAuctions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const isFocused = useIsFocused();
  const [activeIndex, setActiveIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(false); // 👈 NUEVO: Estado de audio global

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 50 }).current;
  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) setActiveIndex(viewableItems[0].index);
  }).current;

   // 👇 0. TEMPORIZADOR: Corregido para asegurar visibilidad 👇
const TimerBadge = React.memo(({ endDate, insetsTop }: { endDate: string, insetsTop: number }) => {
  const [timeLeft, setTimeLeft] = useState('00:00:00');

  useEffect(() => {
    const calculateTime = () => {
      const end = new Date(endDate).getTime();
      const now = new Date().getTime();
      const distance = end - now;
      if (distance < 0) return "Finalizado";
      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    };

    setTimeLeft(calculateTime());
    const interval = setInterval(() => setTimeLeft(calculateTime()), 1000);
    return () => clearInterval(interval);
  }, [endDate]);

  return (
    <View style={[styles.timerBadge, { top: insetsTop + 20, zIndex: 100 }]}>
      <Ionicons name="time-outline" size={18} color="#FFF" />
      <Text style={styles.timerText}>{timeLeft}</Text>
    </View>
  );
});

// 👇 1. ITEM DE REMATE: Con Chat de Subasta agregado 👇
const RemateItem = React.memo(({ item, isActive, isMuted, setIsMuted, pulseAnim, handleQuickBid, shareAuction, insetsTop, height }: any) => {
  const navigation = useNavigation<any>(); // 👈 Necesario para ir a perfiles desde los comentarios
  const topBidder = item.bids && item.bids.length > 0 ? item.bids[0].user.username : 'Sé el primero';
  const totalBids = item.bids ? item.bids.length : 0;
  const isHot = totalBids > 3;

  const player = useVideoPlayer(item.videoUrl, player => {
    player.loop = true;
    player.muted = isMuted;
  });

  useEffect(() => {
    player.muted = isMuted;
  }, [isMuted, player]);

  useEffect(() => {
    if (isActive) player.play();
    else player.pause();
  }, [isActive, player]);

  // ==========================================
  // 👇 LÓGICA DE COMENTARIOS (CHAT) 👇
  // ==========================================
  const [showComments, setShowComments] = useState(false);
  const [commentsCount, setCommentsCount] = useState(0); 
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);

  const openComments = async () => {
    setShowComments(true);
    setLoadingComments(true);
    try {
      const response = await axios.get(`${BACKEND_URL}/videos/${item.id}/comments`);
      const loadedComments = response.data || [];
      setComments(loadedComments.reverse()); // Los más nuevos abajo/arriba
      setCommentsCount(loadedComments.length);
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
      if (!token) {
        Alert.alert("¡Modo Invitado!", "Debes iniciar sesión para comentar en el remate.");
        return;
      }
      const response = await axios.post(`${BACKEND_URL}/videos/${item.id}/comments`,
        { text: newComment },
        { headers: { Authorization: `Bearer ${token}` }}
      );
      setComments([response.data, ...comments]);
      setCommentsCount(commentsCount + 1);
      setNewComment('');
    } catch (error) {
      Alert.alert("Error", "No se pudo enviar el mensaje.");
    }
  };

  const goToProfile = (userIdToNavigate: string) => {
    setShowComments(false);
    navigation.navigate('PublicProfile', { userId: userIdToNavigate });
  };

  return (
    <View style={[styles.auctionContainer, { height: height }]}>
      <VideoView player={player} style={StyleSheet.absoluteFillObject} contentFit="cover" nativeControls={false} />
      <LinearGradient colors={['rgba(0,0,0,0.4)', 'transparent', 'rgba(0,0,0,0.8)']} style={StyleSheet.absoluteFillObject} />

      <TimerBadge endDate={item.auctionEndsAt} insetsTop={insetsTop} />

      <View style={styles.contentBottom}>
        <View style={styles.sellerInfo}>
          <Image source={{ uri: item.user?.avatarUrl || `https://i.pravatar.cc/150?u=${item.userId}` }} style={styles.avatarImage} />
          <View>
            <Text style={styles.sellerName}>@{item.user?.username}</Text>
            <Text style={styles.locationTag}>📍 {item.user?.city || item.user?.province || 'San Rafael, Mendoza'}</Text>
          </View>
        </View>
        
        <Text style={styles.productTitle}>{item.productName}</Text>

        <View style={[styles.biddingCard, { backgroundColor: 'rgba(20, 20, 20, 0.55)' }]}>
          <Text style={styles.biddingSubtitle}>Puja más alta ({totalBids} ofertas):</Text>
          <View style={styles.priceRow}>
            <Animated.Text style={[styles.currentPrice, { transform: [{ scale: pulseAnim }] }]}>
              {formatCurrency(item.productPrice, currency, exchangeRate)}
            </Animated.Text>
            <View style={styles.topBidderBadge}>
              <Ionicons name="trophy" size={12} color="#FFD700" />
              <Text style={styles.topBidderText}> {topBidder}</Text>
            </View>
          </View>

          <View style={styles.quickBidsRow}>
            <TouchableOpacity style={styles.quickBidBtn} onPress={() => handleQuickBid(item.id, 5000, item.productPrice)}>
              <Text style={styles.quickBidBtnText}>+ $5k</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickBidBtn} onPress={() => handleQuickBid(item.id, 10000, item.productPrice)}>
              <Text style={styles.quickBidBtnText}>+ $10k</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickBidBtnPro} onPress={() => handleQuickBid(item.id, 25000, item.productPrice)}>
              <Text style={styles.quickBidBtnProText}>+ $25k</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <View style={styles.sideButtons}>
        {/* 1. Mute */}
        <TouchableOpacity style={styles.sideBtn} onPress={() => setIsMuted(!isMuted)}>
          <Ionicons name={isMuted ? "volume-mute" : "volume-high"} size={30} color={isMuted ? COLORS.accent : "#FFF"} />
          <Text style={styles.sideBtnText}>{isMuted ? 'Mudo' : 'Audio'}</Text>
        </TouchableOpacity>

        {/* 👇 2. NUEVO BOTÓN DE COMENTARIOS/CHAT 👇 */}
        <TouchableOpacity style={styles.sideBtn} onPress={openComments}>
          <Ionicons name="chatbubble-ellipses" size={28} color="#FFF" />
          <Text style={styles.sideBtnText}>{commentsCount > 0 ? commentsCount : 'Chat'}</Text>
        </TouchableOpacity>

        {/* 3. Fuego (Hot) */}
        <View style={styles.sideBtn}>
          <Animated.View style={isHot ? { transform: [{ scale: pulseAnim }] } : {}}>
            <Ionicons name={isHot ? "flame" : "flame-outline"} size={32} color={isHot ? "#FF4500" : "#FFF"} />
          </Animated.View>
          <Text style={[styles.sideBtnText, isHot && { color: '#FF4500', fontWeight: 'bold' }]}>
            {isHot ? '¡Ardiente!' : 'Nuevo'}
          </Text>
        </View>

        {/* 4. Compartir */}
        <TouchableOpacity style={styles.sideBtn} onPress={() => shareAuction(item)}>
          <Ionicons name="share-social" size={28} color="#FFF" />
          <Text style={styles.sideBtnText}>Compartir</Text>
        </TouchableOpacity>
      </View>

      {/* ========================================== */}
      {/* 👇 MODAL DESPLEGABLE DE COMENTARIOS 👇 */}
      {/* ========================================== */}
      <Modal visible={showComments} animationType="slide" transparent={true} onRequestClose={() => setShowComments(false)}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === "ios" ? "padding" : "height"} 
          keyboardVerticalOffset={Platform.OS === "android" ? 20 : 0}
          style={styles.modalContainer}
        >
          <View style={[styles.bottomSheet, { height: height * 0.55, paddingBottom: Platform.OS === 'android' ? Math.max(insetsTop, 35) : Math.max(insetsTop, 15) }]}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Chat del Remate</Text>
              <TouchableOpacity onPress={() => setShowComments(false)}>
                <Ionicons name="close-circle" size={28} color="#888" />
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
                ListEmptyComponent={<Text style={styles.emptyText}>Sé el primero en hacer una pregunta.</Text>}
              />
            )}

            <View style={styles.inputContainer}>
              <TextInput 
                style={styles.commentInput} 
                placeholder="Escribe en el chat..." 
                placeholderTextColor="#888"
                value={newComment}
                onChangeText={setNewComment}
              />
              <TouchableOpacity style={styles.sendButton} onPress={postComment}>
                <Ionicons name="send" size={20} color={newComment.trim() ? COLORS.accent : "#555"} />
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
});

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.05, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true })
      ])
    ).start();
  }, []);

  const fetchAuctions = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/videos/remates`);
      setAuctions(response.data);
    } catch (error) {
      console.error("Error al cargar remates:", error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchAuctions();
    }, [])
  );

  const handleQuickBid = async (videoId: string, increment: number, currentPrice: number) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        Alert.alert("¡Modo Invitado!", "Debes iniciar sesión para poder pujar en los remates.");
        return;
      }

      const newOffer = currentPrice + increment;

      setAuctions(prev => prev.map(auc => {
        if (auc.id === videoId) {
          return { 
            ...auc, 
            productPrice: newOffer, 
            bids: [{ user: { username: 'Tú' } }, ...(auc.bids || [])] 
          };
        }
        return auc;
      }));

      await axios.post(`${BACKEND_URL}/videos/${videoId}/bid`, { amount: newOffer }, {
        headers: { Authorization: `Bearer ${token}` }
      });

    } catch (error: any) {
      Alert.alert("Error", error.response?.data?.message || "No se pudo realizar la oferta.");
      fetchAuctions(); 
    }
  };

  // 👇 Lógica nativa de compartir
  const shareAuction = async (item: any) => {
    try {
      await Share.share({
        message: `🔥 ¡Únete al remate de "${item.productName}" en ViralShop! La puja va por $${item.productPrice.toLocaleString('es-AR')}. ¡Descarga la app y haz tu oferta antes de que termine! ⏱️`,
      });
    } catch (error) {
      console.log("Error al compartir", error);
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

  const getTimeLeft = (endDateString: string) => {
    const end = new Date(endDateString).getTime();
    const now = new Date().getTime();
    const distance = end - now;

    if (distance < 0) return "Finalizado";

    const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((distance % (1000 * 60)) / 1000);

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // 👇 PANTALLA VACÍA REDISEÑADA 👇
  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <LinearGradient colors={['#1a0e2a', '#000']} style={StyleSheet.absoluteFillObject} />
      
      <View style={styles.emptyIconCircle}>
        {/* 👇 ÍCONO COMPUESTO GIGANTE PARA PANTALLA VACÍA 👇 */}
        <View style={{ width: 50, height: 55, justifyContent: 'center', alignItems: 'center' }}>
          <MaterialCommunityIcons
            name="gavel"
            size={48}
            color={COLORS.accent}
            style={{ position: 'absolute', top: -5, right: -5, transform: [{ scaleX: -1 }, { rotate: '-15deg' }] }}
          />
          <View style={{ position: 'absolute', bottom: 5, left: 0, backgroundColor: COLORS.accent, borderRadius: 15, width: 26, height: 26, justifyContent: 'center', alignItems: 'center' }}>
            <Text style={{ color: '#000', fontSize: 16, fontWeight: 'bold' }}>$</Text>
          </View>
        </View>
      </View>
      
      <Text style={styles.emptyTitle}>Zona de Remates</Text>
      <Text style={styles.emptyDesc}>
        Actualmente no hay ventas flash activas.
      </Text>

      <View style={styles.explanationBox}>
        <Text style={styles.explanationTitle}>¿Cómo funcionan?</Text>
        
        <View style={styles.stepRow}>
          <Ionicons name="time" size={24} color={COLORS.primary} />
          <Text style={styles.stepText}>Duración de 24 horas exactas.</Text>
        </View>
        <View style={styles.stepRow}>
          <Ionicons name="cash" size={24} color={COLORS.primary} />
          <Text style={styles.stepText}>Puja rápidamente para superar ofertas.</Text>
        </View>
        <View style={styles.stepRow}>
          <Ionicons name="chatbubbles" size={24} color={COLORS.primary} />
          <Text style={styles.stepText}>El ganador coordina directo por chat.</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.backButton} onPress={() => navigation.navigate('Inicio')}>
        <Text style={styles.backButtonText}>Explorar videos normales</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={COLORS.accent} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={auctions}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <RemateItem 
            item={item} 
            isActive={index === activeIndex && isFocused}
            isMuted={isMuted}        // 👈 Pasamos el estado de audio
            setIsMuted={setIsMuted}  // 👈 Pasamos la función para cambiarlo
            insetsTop={insets.top}
            pulseAnim={pulseAnim}
            handleQuickBid={handleQuickBid}
            shareAuction={shareAuction}
            height={height}
          />
        )}
        pagingEnabled 
        showsVerticalScrollIndicator={false}
        snapToAlignment="start"
        decelerationRate="fast"
        snapToInterval={height} 
        getItemLayout={(data, index) => ({ length: height, offset: height * index, index })}
        ListEmptyComponent={renderEmptyState}
        // 👇 Optimizaciones de video 👇
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        initialNumToRender={2}
        maxToRenderPerBatch={2}
        windowSize={3}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  auctionContainer: { width: width, position: 'relative' },
  
  timerBadge: { position: 'absolute', alignSelf: 'center', backgroundColor: 'rgba(255, 45, 85, 0.9)', paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#FFF' },
  timerText: { color: '#FFF', fontWeight: 'bold', fontSize: 16, marginLeft: 8, letterSpacing: 1 },

  contentBottom: { position: 'absolute', bottom: 60, left: 15, right: 70 },
  
  sellerInfo: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  // 👇 Nuevo estilo para la foto real
  avatarImage: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, borderColor: COLORS.accent, marginRight: 8 },
  sellerName: { color: '#FFF', fontWeight: 'bold', fontSize: 14, marginRight: 10 },
  locationTag: { color: '#AAA', fontSize: 12 },
  
  productTitle: { color: '#FFF', fontSize: 24, fontWeight: '900', marginBottom: 15, textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 3 },

  biddingCard: { backgroundColor: 'rgba(30, 30, 30, 0.85)', borderRadius: 16, padding: 15, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.2)' },
  biddingSubtitle: { color: '#CCC', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 },
  
  priceRow: { flexDirection: 'row', alignItems: 'flex-end', marginVertical: 10, justifyContent: 'space-between' },
  currentPrice: { color: COLORS.accent, fontSize: 38, fontWeight: 'bold' },
  topBidderBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, marginBottom: 5 },
  topBidderText: { color: '#FFF', fontWeight: 'bold', fontSize: 12 },

  quickBidLabel: { color: '#AAA', fontSize: 12, marginTop: 10, marginBottom: 8 },
  quickBidsRow: { flexDirection: 'row', gap: 10 },
  quickBidBtn: { flex: 1, backgroundColor: 'rgba(255,255,255,0.1)', paddingVertical: 12, borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  quickBidBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 15 },
  quickBidBtnPro: { flex: 1.2, backgroundColor: COLORS.accent, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  quickBidBtnProText: { color: '#000', fontWeight: 'bold', fontSize: 16 },

  sideButtons: { position: 'absolute', bottom: 80, right: 10, alignItems: 'center', gap: 20 },
  sideBtn: { alignItems: 'center' },
  sideBtnText: { color: '#FFF', fontSize: 11, marginTop: 4, fontWeight: '600' },

  // 👇 Estilos para la pantalla vacía
  emptyContainer: { height, width, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 30 },
  emptyIconCircle: { width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(0, 229, 255, 0.1)', justifyContent: 'center', alignItems: 'center', marginBottom: 20, borderWidth: 1, borderColor: 'rgba(0, 229, 255, 0.3)' },
  emptyTitle: { fontSize: 26, fontWeight: 'bold', color: '#FFF', marginBottom: 10 },
  emptyDesc: { fontSize: 16, color: '#AAA', textAlign: 'center', marginBottom: 40 },
  explanationBox: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 15, padding: 20, width: '100%', borderWidth: 1, borderColor: '#333', marginBottom: 40 },
  explanationTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold', marginBottom: 15, borderBottomWidth: 1, borderBottomColor: '#444', paddingBottom: 10 },
  stepRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  stepText: { color: '#DDD', fontSize: 14, marginLeft: 15, flex: 1, lineHeight: 20 },
  backButton: { backgroundColor: COLORS.primary, paddingVertical: 15, paddingHorizontal: 30, borderRadius: 25 },
  backButtonText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },

  // 👇 Estilos del Chat de Remates 👇
  modalContainer: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  bottomSheet: { backgroundColor: '#1E1E1E', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#333', paddingBottom: 15, marginBottom: 15 },
  sheetTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  commentBox: { flexDirection: 'row', marginBottom: 15 },
  commentAvatar: { width: 40, height: 40, borderRadius: 20, marginRight: 10, borderWidth: 1, borderColor: '#333' },
  commentContent: { flex: 1, justifyContent: 'center' },
  commentUser: { color: '#AAA', fontSize: 12, fontWeight: 'bold', marginBottom: 3 },
  commentText: { color: '#FFF', fontSize: 14 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#333', paddingTop: 15, marginTop: 10 },
  commentInput: { flex: 1, backgroundColor: '#000', color: '#FFF', borderRadius: 20, paddingHorizontal: 15, paddingVertical: 10, marginRight: 10, borderWidth: 1, borderColor: '#333' },
  sendButton: { padding: 10 },
  emptyText: { color: '#AAA', textAlign: 'center', marginTop: 20, fontSize: 14 },
});