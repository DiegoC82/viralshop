// frontend/src/screens/SingleVideoScreen.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';

const { width, height } = Dimensions.get('window');

export default function SingleVideoScreen({ route, navigation }: any) {
  // Recibimos el video que nos mandó la pantalla anterior
  const { video } = route.params;

  const player = useVideoPlayer(video.videoUrl, player => {
    player.loop = true;
    player.play();
  });

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

      {/* Capa de información (Descripción y Producto) */}
      <View style={styles.infoOverlay}>
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
  description: { color: '#FFF', fontSize: 16, textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 3 },
  productTag: { flexDirection: 'row', backgroundColor: COLORS.accent, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, alignItems: 'center', marginBottom: 12, alignSelf: 'flex-start', maxWidth: '90%', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.5, shadowRadius: 3, elevation: 5 },
  productName: { color: '#000', fontWeight: 'bold', fontSize: 14, marginLeft: 5, marginRight: 8, flexShrink: 1 },
  productPrice: { color: '#000', fontWeight: '900', fontSize: 14, marginRight: 5 },
});