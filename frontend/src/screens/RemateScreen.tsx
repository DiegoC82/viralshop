// frontend/src/screens/RemateScreen.tsx
import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Dimensions, 
  FlatList, 
  Image, 
  TouchableOpacity, 
  Animated 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../theme/colors';

const { width, height } = Dimensions.get('window');

// 💡 Datos de prueba con un guiño local
const DUMMY_AUCTIONS = [
  {
    id: '1',
    title: 'PlayStation 5 - Poco uso',
    seller: '@gamer_rafael',
    location: 'San Rafael, Mza.',
    currentBid: 450000,
    topBidder: 'diego_89',
    timeLeft: '04:12:59',
    image: 'https://images.unsplash.com/photo-1606813907291-d86efa9b90cd?q=80&w=800&auto=format&fit=crop',
    bidsCount: 24
  },
  {
    id: '2',
    title: 'iPhone 13 Pro Max 256GB',
    seller: '@tech_store',
    location: 'Centro',
    currentBid: 850000,
    topBidder: 'maria.l',
    timeLeft: '00:45:12',
    image: 'https://images.unsplash.com/photo-1632661674596-df8be070a5c5?q=80&w=800&auto=format&fit=crop',
    bidsCount: 56
  }
];

export default function RemateScreen() {
  const insets = useSafeAreaInsets();
  const [auctions, setAuctions] = useState(DUMMY_AUCTIONS);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Animación de latido para el precio actual (genera urgencia)
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.05, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true })
      ])
    ).start();
  }, []);

  const handleQuickBid = (id: string, amount: number) => {
    // Aquí iría la lógica del backend para pujar
    const updatedAuctions = auctions.map(auc => {
      if (auc.id === id) {
        return { ...auc, currentBid: auc.currentBid + amount, topBidder: 'tú' };
      }
      return auc;
    });
    setAuctions(updatedAuctions);
  };

  const renderAuctionItem = ({ item }: { item: typeof DUMMY_AUCTIONS[0] }) => (
    <View style={[styles.auctionContainer, { height: height }]}>
      {/* IMAGEN DE FONDO COMPLETA */}
      <Image 
        source={{ uri: item.image }} 
        style={[StyleSheet.absoluteFillObject, { backgroundColor: '#111' }]} 
        resizeMode="cover"
      />
      
      {/* DEGRADADO OSCURO PARA QUE SE LEA EL TEXTO */}
      <LinearGradient
        colors={['rgba(0,0,0,0.3)', 'transparent', 'rgba(0,0,0,0.9)']}
        style={StyleSheet.absoluteFillObject}
      />

      {/* CABECERA: TIEMPO RESTANTE (Fijo arriba) */}
      <View style={[styles.timerBadge, { top: insets.top + 20 }]}>
        <Ionicons name="time-outline" size={18} color="#FFF" />
        <Text style={styles.timerText}>Termina en {item.timeLeft}</Text>
      </View>

      {/* CONTENIDO PRINCIPAL (Abajo) */}
      <View style={styles.contentBottom}>
        
        {/* Vendedor y Título */}
        <View style={styles.sellerInfo}>
          <View style={styles.avatarMock}><Ionicons name="person" size={16} color="#FFF" /></View>
          <Text style={styles.sellerName}>{item.seller}</Text>
          <Text style={styles.locationTag}>📍 {item.location}</Text>
        </View>
        <Text style={styles.productTitle}>{item.title}</Text>

        {/* CARTA CENTRAL DE SUBASTA */}
        <View style={styles.biddingCard}>
          <Text style={styles.biddingSubtitle}>Puja más alta ({item.bidsCount} ofertas):</Text>
          
          <View style={styles.priceRow}>
            <Animated.Text style={[styles.currentPrice, { transform: [{ scale: pulseAnim }] }]}>
              ${item.currentBid.toLocaleString('es-AR')}
            </Animated.Text>
            <View style={styles.topBidderBadge}>
              <Ionicons name="trophy" size={12} color="#FFD700" />
              <Text style={styles.topBidderText}> {item.topBidder}</Text>
            </View>
          </View>

          {/* BOTONES ADICTIVOS DE PUJA RÁPIDA */}
          <Text style={styles.quickBidLabel}>Superar oferta rápidamente:</Text>
          <View style={styles.quickBidsRow}>
            <TouchableOpacity style={styles.quickBidBtn} onPress={() => handleQuickBid(item.id, 5000)}>
              <Text style={styles.quickBidBtnText}>+ $5k</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickBidBtn} onPress={() => handleQuickBid(item.id, 10000)}>
              <Text style={styles.quickBidBtnText}>+ $10k</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickBidBtnPro} onPress={() => handleQuickBid(item.id, 25000)}>
              <Text style={styles.quickBidBtnProText}>+ $25k</Text>
            </TouchableOpacity>
          </View>
        </View>

      </View>

      {/* BOTONES LATERALES ESTILO TIKTOK */}
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

  return (
    <View style={styles.container}>
      <FlatList
        data={auctions}
        keyExtractor={(item) => item.id}
        renderItem={renderAuctionItem}
        pagingEnabled // Esto hace el efecto "Swipe" de a una pantalla entera
        showsVerticalScrollIndicator={false}
        snapToAlignment="start"
        decelerationRate="fast"
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