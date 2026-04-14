// frontend/src/screens/RemateScreen.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  View, Text, StyleSheet, Dimensions, FlatList, 
  Image, TouchableOpacity, Animated, ActivityIndicator, Alert 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { COLORS } from '../theme/colors';

const { width, height } = Dimensions.get('window');
const BACKEND_URL = 'https://viralshop-xr9v.onrender.com';

export default function RemateScreen() {
  const insets = useSafeAreaInsets();
  const pulseAnim = useRef(new Animated.Value(1)).current;
  
  const [auctions, setAuctions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0); // Para forzar el refresco del cronómetro

  // 1. Animación de latido para el precio actual (genera urgencia)
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.05, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true })
      ])
    ).start();
    
    // Reloj interno que actualiza la pantalla cada segundo para los cronómetros
    const interval = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  // 2. Traer Remates Reales del Backend
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

  // 3. Lógica de Pujas Reales (Bids)
  const handleQuickBid = async (videoId: string, increment: number, currentPrice: number) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        Alert.alert("¡Modo Invitado!", "Debes iniciar sesión para poder pujar en los remates.");
        return;
      }

      const newOffer = currentPrice + increment;

      // Actualizamos la UI al instante (Optimistic Update) para que sea rápido
      setAuctions(prev => prev.map(auc => {
        if (auc.id === videoId) {
          return { 
            ...auc, 
            productPrice: newOffer, 
            bids: [{ user: { username: 'Tú' } }, ...(auc.bids || [])] // Te ponemos como top bidder temporal
          };
        }
        return auc;
      }));

      // Enviamos la oferta al backend
      await axios.post(`${BACKEND_URL}/videos/${videoId}/bid`, { amount: newOffer }, {
        headers: { Authorization: `Bearer ${token}` }
      });

    } catch (error: any) {
      Alert.alert("Error", error.response?.data?.message || "No se pudo realizar la oferta.");
      fetchAuctions(); // Si falla, recargamos los datos reales
    }
  };

  // 4. Utilidades visuales
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

  const renderAuctionItem = ({ item }: { item: any }) => {
    const topBidder = item.bids && item.bids.length > 0 ? item.bids[0].user.username : 'Sé el primero';
    const totalBids = item.bids ? item.bids.length : 0;

    return (
      <View style={[styles.auctionContainer, { height: height }]}>
        {/* IMAGEN DE FONDO (Miniatura de Mux) */}
        <Image 
          source={{ uri: getThumbnail(item.videoUrl) }} 
          style={[StyleSheet.absoluteFillObject, { backgroundColor: '#111' }]} 
          resizeMode="cover"
        />
        
        {/* DEGRADADO OSCURO */}
        <LinearGradient
          colors={['rgba(0,0,0,0.3)', 'transparent', 'rgba(0,0,0,0.9)']}
          style={StyleSheet.absoluteFillObject}
        />

        {/* CABECERA: TIEMPO RESTANTE */}
        <View style={[styles.timerBadge, { top: insets.top + 20 }]}>
          <Ionicons name="time-outline" size={18} color="#FFF" />
          <Text style={styles.timerText}>{getTimeLeft(item.auctionEndsAt)}</Text>
        </View>

        {/* CONTENIDO PRINCIPAL */}
        <View style={styles.contentBottom}>
          
          <View style={styles.sellerInfo}>
            <View style={styles.avatarMock}><Ionicons name="person" size={16} color="#FFF" /></View>
            <Text style={styles.sellerName}>@{item.user?.username}</Text>
            <Text style={styles.locationTag}>📍 Envío Nacional</Text>
          </View>
          <Text style={styles.productTitle}>{item.productName}</Text>

          {/* CARTA DE SUBASTA */}
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

            {/* BOTONES ADICTIVOS DE PUJA RÁPIDA */}
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

        {/* BOTONES LATERALES */}
        <View style={styles.sideButtons}>
          <TouchableOpacity style={styles.sideBtn}>
            <Ionicons name="flame" size={32} color={COLORS.accent} />
            <Text style={styles.sideBtnText}>Hot</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.sideBtn}>
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
        // 👇 El arreglo del scroll para que no se corte 👇
        snapToInterval={height} 
        getItemLayout={(data, index) => ({
          length: height,
          offset: height * index,
          index,
        })}
        ListEmptyComponent={
          <View style={{ height, justifyContent: 'center', alignItems: 'center' }}>
            <Ionicons name="hammer-outline" size={60} color="#333" />
            <Text style={{ color: '#888', marginTop: 10 }}>No hay remates activos ahora.</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  auctionContainer: { width: width, position: 'relative' },
  gradientOverlay: { ...StyleSheet.absoluteFillObject, top: '40%' }, // Solo oscurece la mitad de abajo
  
  timerBadge: { position: 'absolute', alignSelf: 'center', backgroundColor: 'rgba(255, 45, 85, 0.9)', paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#FFF' },
  timerText: { color: '#FFF', fontWeight: 'bold', fontSize: 16, marginLeft: 8, letterSpacing: 1 },

  contentBottom: { position: 'absolute', bottom: 70, left: 15, right: 70 }, // 👇 Subimos el contenido (110)
  
  sellerInfo: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  avatarMock: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#555', justifyContent: 'center', alignItems: 'center', marginRight: 8 },
  sellerName: { color: '#FFF', fontWeight: 'bold', fontSize: 14, marginRight: 10 },
  locationTag: { color: '#AAA', fontSize: 12 },
  
  productTitle: { color: '#FFF', fontSize: 24, fontWeight: '900', marginBottom: 15, textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 3 },

  biddingCard: { backgroundColor: 'rgba(30, 30, 30, 0.7)', borderRadius: 16, padding: 15, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.2)' },
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

  sideButtons: { position: 'absolute', bottom: 110, right: 10, alignItems: 'center', gap: 20 }, // 👇 Subimos los botones laterales (110)
  sideBtn: { alignItems: 'center' },
  sideBtnText: { color: '#FFF', fontSize: 11, marginTop: 4, fontWeight: '600' }
});