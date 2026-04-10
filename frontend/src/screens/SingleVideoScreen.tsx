// frontend/src/screens/SingleVideoScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location'; // 👇 Importamos el traductor de GPS
import { COLORS } from '../theme/colors';

const { width, height } = Dimensions.get('window');

export default function SingleVideoScreen({ route, navigation }: any) {
  const { video } = route.params;
  
  // 👇 ESTADO PARA GUARDAR EL NOMBRE DE LA CIUDAD 👇
  const [cityName, setCityName] = useState<string | null>(null);

  const player = useVideoPlayer(video.videoUrl, player => {
    player.loop = true;
    player.play();
  });

  // 👇 EFECTO: Traducir coordenadas a Ciudad al abrir el video 👇
  useEffect(() => {
    const fetchLocationName = async () => {
      if (video.latitude && video.longitude) {
        try {
          const geocode = await Location.reverseGeocodeAsync({
            latitude: video.latitude,
            longitude: video.longitude
          });
          
          if (geocode.length > 0) {
            // Buscamos la ciudad o la región
            const city = geocode[0].city || geocode[0].subregion || geocode[0].region;
            if (city) setCityName(city);
          }
        } catch (error) {
          console.log("Error decodificando ubicación:", error);
        }
      }
    };

    fetchLocationName();
  }, [video.latitude, video.longitude]);

  return (
    <View style={styles.container}>
      {/* Reproductor de Video */}
      <VideoView 
        player={player} 
        style={StyleSheet.absoluteFill} 
        contentFit="cover" 
        nativeControls={false} 
      />

      {/* Botón flotante para volver atrás */}
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Ionicons name="chevron-back" size={28} color="#FFF" />
      </TouchableOpacity>

      {/* Capa de información */}
      <View style={styles.infoOverlay}>
        
        {/* 👇 NUEVA ETIQUETA DE UBICACIÓN 👇 */}
        {(cityName || (video.latitude && video.longitude)) && (
          <View style={styles.locationTag}>
            <Ionicons name="location" size={14} color="#FFF" />
            <Text style={styles.locationText}>{cityName || 'Ubicación local'}</Text>
          </View>
        )}

        {/* Etiqueta del Producto */}
        {video.productName && (
          <TouchableOpacity style={styles.productTag}>
            <Ionicons name="cart" size={16} color="#000" />
            <Text style={styles.productName} numberOfLines={1}>{video.productName}</Text>
            {video.productPrice && (
              <Text style={styles.productPrice}>${video.productPrice}</Text>
            )}
            <Ionicons name="chevron-forward" size={14} color="#000" />
          </TouchableOpacity>
        )}
        
        <Text style={styles.description}>{video.description}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  backButton: { position: 'absolute', top: 50, left: 20, zIndex: 10, backgroundColor: 'rgba(0,0,0,0.5)', padding: 8, borderRadius: 20 },
  infoOverlay: { position: 'absolute', bottom: 30, left: 15, right: 15, zIndex: 10 },
  
  // 👇 ESTILOS DEL PIN DE UBICACIÓN 👇
  locationTag: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)', alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginBottom: 8 },
  locationText: { color: '#FFF', fontSize: 12, fontWeight: '600', marginLeft: 4 },

  productTag: { flexDirection: 'row', backgroundColor: COLORS.accent, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, alignItems: 'center', marginBottom: 12, alignSelf: 'flex-start', maxWidth: '90%', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.5, shadowRadius: 3, elevation: 5 },
  productName: { color: '#000', fontWeight: 'bold', fontSize: 14, marginLeft: 5, marginRight: 8, flexShrink: 1 },
  productPrice: { color: '#000', fontWeight: '900', fontSize: 14, marginRight: 5 },
  
  description: { color: '#FFF', fontSize: 16, textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 3 },
});