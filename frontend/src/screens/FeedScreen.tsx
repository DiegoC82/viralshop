// frontend/src/screens/FeedScreen.tsx
import React, { useState, useRef, useCallback } from 'react';
import { StyleSheet, Text, View, FlatList, Dimensions, TouchableOpacity, Image, ActivityIndicator, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native'; // <-- Importamos esta nueva herramienta
import { useVideoPlayer, VideoView } from 'expo-video';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { COLORS } from '../theme/colors';

const { height, width } = Dimensions.get('window');

// 👇 REEMPLAZA CON TU IP REAL 👇
const BACKEND_URL = 'http://192.168.100.107:3000/videos/feed';

const FeedItem = ({ item, isActive }: { item: any; isActive: boolean }) => {
  const player = useVideoPlayer(item.videoUrl, player => {
    player.loop = true;
    player.muted = false; // Le activamos el sonido por si tu video tiene audio
  });

  // Solo reproduce el video si está en el centro de la pantalla
  React.useEffect(() => {
    if (isActive) player.play();
    else player.pause();
  }, [isActive, player]); 

  const avatarUri = item.user?.avatarUrl || 'https://i.pravatar.cc/150?u=' + item.userId;

  // Lógica simplificada de Like para la vista (puedes volver a poner la llamada a axios aquí)
  const [isLiked, setIsLiked] = useState(false);
  const handleLike = () => setIsLiked(!isLiked);

  return (
    <View style={styles.videoContainer}>
      <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="cover" nativeControls={false} />
      <View style={styles.darkOverlay} />
      
      <View style={styles.infoOverlay}>
        
        {/* 👇 NUEVA ETIQUETA DE PRODUCTO (Solo aparece si el video tiene un producto) 👇 */}
        {item.productName && (
          <TouchableOpacity style={styles.productTag}>
            <Ionicons name="cart" size={16} color="#000" />
            <Text style={styles.productName} numberOfLines={1}>{item.productName}</Text>
            {item.productPrice && (
              <Text style={styles.productPrice}>${item.productPrice.toFixed(2)}</Text>
            )}
            <Ionicons name="chevron-forward" size={14} color="#000" />
          </TouchableOpacity>
        )}

        <Text style={styles.username}>@{item.user?.username || 'usuario'}</Text>
        <Text style={styles.description}>{item.description}</Text>
      </View>

      <View style={styles.actionOverlay}>
        <View style={styles.profileContainer}>
          <Image source={{ uri: avatarUri }} style={styles.profilePic} />
          <TouchableOpacity style={styles.followButton}>
            <Ionicons name="add" size={14} color="#FFF" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.actionButton} onPress={handleLike}>
          <Ionicons name={isLiked ? "heart" : "heart-outline"} size={32} color={isLiked ? "#FF2D55" : COLORS.text} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}><Ionicons name="chatbubble-ellipses" size={28} color={COLORS.text} /></TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}><Ionicons name="bookmark" size={28} color={COLORS.text} /></TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}><Ionicons name="arrow-redo" size={28} color={COLORS.text} /></TouchableOpacity>
      </View>
    </View>
  );
};

export default function FeedScreen() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [videos, setVideos] = useState<any[]>([]); 
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false); // Estado para el "Pull to refresh"

  // Separamos la búsqueda de videos en su propia función
  const fetchVideos = async () => {
    try {
      const response = await axios.get(BACKEND_URL);
      setVideos(response.data);
    } catch (error) {
      console.error("Error al traer videos:", error);
    } finally {
      setLoading(false);
      setRefreshing(false); // Escondemos la ruedita superior cuando termina
    }
  };

  // 1. Esto hace que se busquen videos nuevos cada vez que entras a la pestaña "Inicio"
  useFocusEffect(
    useCallback(() => {
      fetchVideos();
    }, [])
  );

  // 2. Esta función se ejecuta cuando tiras de la pantalla hacia abajo
  const onRefresh = () => {
    setRefreshing(true);
    fetchVideos();
  };

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 50 }).current;
  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) setActiveIndex(viewableItems[0].index);
  }).current;

  if (loading) {
    return (
      <View style={[styles.videoContainer, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={COLORS.accent} />
      </View>
    );
  }

  return (
    <FlatList
      data={videos}
      renderItem={({ item, index }) => <FeedItem item={item} isActive={index === activeIndex} />}
      keyExtractor={item => item.id}
      pagingEnabled 
      showsVerticalScrollIndicator={false}
      snapToAlignment="start"
      decelerationRate="fast"
      onViewableItemsChanged={onViewableItemsChanged}
      viewabilityConfig={viewabilityConfig}
      // 👇 MAGIA: Agregamos el control de "Tirar para actualizar" 👇
      refreshControl={
        <RefreshControl 
          refreshing={refreshing} 
          onRefresh={onRefresh} 
          tintColor={COLORS.accent} // Ruedita color turquesa neón
          colors={[COLORS.accent]} // Color en Android
        />
      }
    />
  );
}

const styles = StyleSheet.create({
  videoContainer: { height: height, width: width, backgroundColor: COLORS.background },
  darkOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.2)' },
  infoOverlay: { position: 'absolute', bottom: 90, left: 20, right: 80 },
  username: { color: COLORS.text, fontSize: 18, fontWeight: 'bold', marginBottom: 5, textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 3 },
  description: { color: COLORS.text, fontSize: 15, textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 3 },
  actionOverlay: { position: 'absolute', bottom: 90, right: 10, alignItems: 'center' },
  profileContainer: { alignItems: 'center', marginBottom: 20 },
  profilePic: { width: 50, height: 50, borderRadius: 25, borderWidth: 2, borderColor: COLORS.accent },
  followButton: { position: 'absolute', bottom: -10, backgroundColor: COLORS.primary, width: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  actionButton: { width: 50, height: 50, justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
  productTag: { flexDirection: 'row', backgroundColor: COLORS.accent, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, alignItems: 'center', marginBottom: 12, alignSelf: 'flex-start', maxWidth: '90%', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.5, shadowRadius: 3, elevation: 5 },
  productName: { color: '#000', fontWeight: 'bold', fontSize: 14, marginLeft: 5, marginRight: 8, flexShrink: 1 },
  productPrice: { color: '#000', fontWeight: '900', fontSize: 14, marginRight: 5 },
});