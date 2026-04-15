// frontend/src/screens/RemateScreen.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  View, Text, StyleSheet, Dimensions, FlatList, 
  Image, TouchableOpacity, Animated, ActivityIndicator, Alert, Share 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { COLORS } from '../theme/colors';

const { width, height } = Dimensions.get('window');
const BACKEND_URL = 'https://viralshop-xr9v.onrender.com';

export default function RemateScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const pulseAnim = useRef(new Animated.Value(1)).current;
  
  const [auctions, setAuctions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.05, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true })
      ])
    ).start();
    
    const interval = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(interval);
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
        <Ionicons name="hammer" size={60} color={COLORS.accent} />
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

  const renderAuctionItem = ({ item }: { item: any }) => {
    const topBidder = item.bids && item.bids.length > 0 ? item.bids[0].user.username : 'Sé el primero';
    const totalBids = item.bids ? item.bids.length : 0;
    
    // 👇 Si tiene más de 3 ofertas, se considera "HOT"
    const isHot = totalBids > 3;

    return (
      <View style={[styles.auctionContainer, { height: height }]}>
        <Image source={{ uri: getThumbnail(item.videoUrl) }} style={[StyleSheet.absoluteFillObject, { backgroundColor: '#111' }]} resizeMode="cover" />
        <LinearGradient colors={['rgba(0,0,0,0.3)', 'transparent', 'rgba(0,0,0,0.9)']} style={StyleSheet.absoluteFillObject} />

        <View style={[styles.timerBadge, { top: insets.top + 20 }]}>
          <Ionicons name="time-outline" size={18} color="#FFF" />
          <Text style={styles.timerText}>{getTimeLeft(item.auctionEndsAt)}</Text>
        </View>

        <View style={styles.contentBottom}>
          <View style={styles.sellerInfo}>
            {/* 👇 FOTO DE USUARIO REAL 👇 */}
            <Image 
              source={{ uri: item.user?.avatarUrl || `https://i.pravatar.cc/150?u=${item.userId}` }} 
              style={styles.avatarImage} 
            />
            <Text style={styles.sellerName}>@{item.user?.username}</Text>
            {/* 👇 LOCALIZACIÓN (Usa la del video si existe) 👇 */}
            <Text style={styles.locationTag}>📍 {item.city || 'Envío Nacional'}</Text>
          </View>
          <Text style={styles.productTitle}>{item.productName}</Text>

          <View style={styles.biddingCard}>
            <Text style={styles.biddingSubtitle}>Puja más alta ({totalBids} ofertas):</Text>
            <View style={styles.priceRow}>
              <Animated.Text style={[styles.currentPrice, { transform: [{ scale: pulseAnim }] }]}>
                ${item.productPrice.toLocaleString('es-AR')}
              </Animated.Text>
              <View style={styles.topBidderBadge}>
                <Ionicons name="trophy" size={12} color="#FFD700" />
                <Text style={styles.topBidderText}> {topBidder}</Text>
              </View>
            </View>

            <Text style={styles.quickBidLabel}>Superar oferta rápidamente:</Text>
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
          {/* 👇 BOTÓN HOT ANIMADO 👇 */}
          <View style={styles.sideBtn}>
            <Animated.View style={isHot ? { transform: [{ scale: pulseAnim }] } : {}}>
              <Ionicons name={isHot ? "flame" : "flame-outline"} size={32} color={isHot ? "#FF4500" : "#FFF"} />
            </Animated.View>
            <Text style={[styles.sideBtnText, isHot && { color: '#FF4500', fontWeight: 'bold' }]}>
              {isHot ? '¡Ardiente!' : 'Nuevo'}
            </Text>
          </View>

          {/* 👇 BOTÓN COMPARTIR FUNCIONAL 👇 */}
          <TouchableOpacity style={styles.sideBtn} onPress={() => shareAuction(item)}>
            <Ionicons name="share-social" size={28} color="#FFF" />
            <Text style={styles.sideBtnText}>Compartir</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

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
        renderItem={renderAuctionItem}
        pagingEnabled 
        showsVerticalScrollIndicator={false}
        snapToAlignment="start"
        decelerationRate="fast"
        snapToInterval={height} 
        getItemLayout={(data, index) => ({ length: height, offset: height * index, index })}
        ListEmptyComponent={renderEmptyState} // Usamos la nueva pantalla vacía
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  auctionContainer: { width: width, position: 'relative' },
  
  timerBadge: { position: 'absolute', alignSelf: 'center', backgroundColor: 'rgba(255, 45, 85, 0.9)', paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#FFF' },
  timerText: { color: '#FFF', fontWeight: 'bold', fontSize: 16, marginLeft: 8, letterSpacing: 1 },

  contentBottom: { position: 'absolute', bottom: 100, left: 15, right: 70 },
  
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

  sideButtons: { position: 'absolute', bottom: 120, right: 10, alignItems: 'center', gap: 20 },
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
  backButtonText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 }
});