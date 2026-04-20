// frontend/src/screens/AdultFeedScreen.tsx
import React, { useState, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, Dimensions, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { useFocusEffect, useNavigation, useIsFocused } from '@react-navigation/native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { useCurrency } from '../context/CurrencyContext';
import { formatCurrency } from '../utils/formatters';

const { height, width } = Dimensions.get('window');
const BACKEND_URL = 'https://viralshop-xr9v.onrender.com';

// 👇 COMPONENTE DEL VIDEO (Con estética oscura) 👇
const AdultFeedItem = React.memo(({ item, isActive }: any) => {
  const { currency, exchangeRate } = useCurrency();
  const player = useVideoPlayer(item.videoUrl, player => {
    player.loop = true;
  });

  if (isActive) player.play();
  else player.pause();

  const avatarUri = item.user?.avatarUrl || `https://ui-avatars.com/api/?name=${item.user?.username || 'User'}&background=0A0514&color=b829db`;

  return (
    <View style={styles.videoContainer}>
      <VideoView player={player} style={StyleSheet.absoluteFillObject} contentFit="cover" nativeControls={false} />
      <View style={styles.darkOverlay} />
      
      {/* Info del Producto y Usuario */}
      <View style={styles.infoOverlay}>
        <View style={styles.userRow}>
          <Image source={{ uri: avatarUri }} style={styles.avatar} />
          <Text style={styles.username}>@{item.user?.username}</Text>
        </View>
        <Text style={styles.description}>{item.description}</Text>

        {item.productName && (
          <View style={styles.neonProductTag}>
            <Ionicons name="flame" size={16} color="#b829db" />
            <Text style={styles.productName} numberOfLines={1}>{item.productName}</Text>
            <Text style={styles.productPrice}>
              {formatCurrency(item.productPrice, currency, exchangeRate)}
            </Text>
          </View>
        )}
      </View>

      {/* Menú Lateral (Corazones morados, etc) */}
      <View style={styles.actionOverlay}>
        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="heart-outline" size={32} color="#b829db" />
          <Text style={styles.actionText}>{item._count?.likes || 0}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="chatbubble-ellipses-outline" size={28} color="#FFF" />
          <Text style={styles.actionText}>{item._count?.comments || 0}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="paper-plane-outline" size={28} color="#FFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
}, (prevProps, nextProps) => prevProps.isActive === nextProps.isActive);

// 👇 PANTALLA PRINCIPAL 👇
export default function AdultFeedScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const isFocused = useIsFocused();
  
  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 50 }).current;
  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) setActiveIndex(viewableItems[0].index);
  }).current;

  const fetchAdultVideos = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      // 👇 LLAMAMOS A LA RUTA SEGURA QUE CREASTE EN EL BACKEND 👇
      const response = await axios.get(`${BACKEND_URL}/videos/adult-feed`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setVideos(response.data);
    } catch (error) {
      console.error("Error al traer feed adulto:", error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchAdultVideos();
    }, [])
  );

  return (
    <View style={styles.mainContainer}>
      {/* HEADER EXCLUSIVO MIDNIGHT */}
      <View style={[styles.headerContainer, { top: Math.max(insets.top, 20) }]}>
        <TouchableOpacity 
          style={styles.exitButton}
          onPress={() => navigation.goBack()} // 👈 Salida Segura
        >
          <Ionicons name="chevron-back" size={24} color="#FFF" />
          <Text style={styles.exitText}>Salir</Text>
        </TouchableOpacity>

        <View style={styles.midnightBadge}>
          <Text style={styles.midnightText}>NOCTURNO</Text>
          <Ionicons name="moon" size={12} color="#b829db" style={{marginLeft: 4}} />
        </View>
      </View>

      {loading ? (
        <View style={[styles.mainContainer, { justifyContent: 'center', alignItems: 'center' }]}>
          <ActivityIndicator size="large" color="#b829db" />
        </View>
      ) : videos.length === 0 ? (
        <View style={[styles.mainContainer, { justifyContent: 'center', alignItems: 'center', padding: 20 }]}>
          <Ionicons name="eye-off-outline" size={60} color="#333" style={{marginBottom: 20}} />
          <Text style={{color: '#888', fontSize: 16, textAlign: 'center'}}>No hay contenido disponible por ahora.</Text>
        </View>
      ) : (
        <FlatList
          data={videos}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => (
            <AdultFeedItem item={item} isActive={index === activeIndex && isFocused} />
          )}
          pagingEnabled
          showsVerticalScrollIndicator={false}
          snapToAlignment="start"
          decelerationRate="fast"
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: '#0A0514' }, // 👈 Fondo casi negro
  videoContainer: { height: height, width: width, backgroundColor: '#000' },
  darkOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(10, 5, 20, 0.4)' }, // 👈 Filtro morado oscuro
  
  // Header
  headerContainer: { position: 'absolute', left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, zIndex: 10 },
  exitButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  exitText: { color: '#FFF', fontWeight: 'bold', fontSize: 14, marginLeft: 2 },
  midnightBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(184, 41, 219, 0.15)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(184, 41, 219, 0.4)' },
  midnightText: { color: '#b829db', fontWeight: '900', fontSize: 10, letterSpacing: 2 },

  // Info inferior
  infoOverlay: { position: 'absolute', bottom: 50, left: 15, right: 75 },
  userRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  avatar: { width: 36, height: 36, borderRadius: 18, borderWidth: 1.5, borderColor: '#b829db', marginRight: 10 },
  username: { color: '#FFF', fontSize: 16, fontWeight: 'bold', textShadowColor: '#000', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 3 },
  description: { color: '#CCC', fontSize: 13, marginBottom: 15 },
  
  // Tag de producto estilo neón
  neonProductTag: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: '#b829db' },
  productName: { color: '#FFF', fontWeight: 'bold', fontSize: 13, flex: 1, marginLeft: 5, marginRight: 10 },
  productPrice: { color: '#b829db', fontWeight: '900', fontSize: 14 },

  // Menú derecho
  actionOverlay: { position: 'absolute', bottom: 70, right: 10, alignItems: 'center' },
  actionButton: { alignItems: 'center', marginBottom: 20 },
  actionText: { color: 'rgba(255,255,255,0.9)', fontSize: 12, fontWeight: 'bold', marginTop: 2 }
});