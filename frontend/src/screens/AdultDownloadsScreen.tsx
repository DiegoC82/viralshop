// frontend/src/screens/AdultDownloadsScreen.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, ActivityIndicator, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import * as ScreenCapture from 'expo-screen-capture'; 
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');
const COLUMN_WIDTH = width / 2; 
const BACKEND_URL = 'https://viralshop-xr9v.onrender.com';

const DARK_BG = '#0A0514';
const DARK_SURFACE = '#110A1F';
const DARK_ACCENT = '#b829db'; // 👈 Rosado / Morado Neón
const CELESTE_MAIN = '#1DA1F2'; // 👈 Celeste exacto de la app principal

export default function AdultDownloadsScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const [downloads, setDownloads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // SISTEMA ANTI-PIRATERÍA
  useFocusEffect(
    useCallback(() => {
      let isMounted = true;
      const activateProtection = async () => {
        try { await ScreenCapture.preventScreenCaptureAsync(); } catch (e) { }
      };
      const deactivateProtection = async () => {
        try { await ScreenCapture.allowScreenCaptureAsync(); } catch (e) {}
      };

      if (isMounted) activateProtection();

      return () => {
        isMounted = false;
        deactivateProtection(); 
      };
    }, [])
  );

  const fetchDownloads = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      // Asegúrate de que tu backend ya tiene esta ruta funcionando
      const response = await axios.get(`${BACKEND_URL}/users/unlocked`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDownloads(response.data);
    } catch (error) {
      console.log("Error al cargar descargas", error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchDownloads(); }, []));

  const getThumbnail = (videoUrl: string) => {
    if (videoUrl && videoUrl.includes('mux.com')) {
      const parts = videoUrl.split('/');
      const playbackId = parts[parts.length - 1].split('.')[0];
      return `https://image.mux.com/${playbackId}/thumbnail.jpg?time=1`;
    }
    return 'https://via.placeholder.com/150';
  };

  if (loading) return <View style={styles.centerContainer}><ActivityIndicator size="large" color={DARK_ACCENT} /></View>;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mis Descargas</Text>
        {/* 👇 Candado Rosado 👇 */}
        <Ionicons name="lock-closed" size={18} color={DARK_ACCENT} style={{ marginLeft: 8 }} />
      </View>

      <View style={styles.securityBanner}>
        {/* 👇 Escudo Rosado 👇 */}
        <Ionicons name="shield-checkmark" size={16} color={DARK_ACCENT} style={{ marginRight: 6 }} />
        {/* 👇 Texto Celeste 👇 */}
        <Text style={styles.securityText}>Visualización segura. Las capturas están bloqueadas.</Text>
      </View>

      <FlatList
        data={downloads}
        keyExtractor={(item) => item.id}
        numColumns={2}
        renderItem={({ item, index }) => (
          <TouchableOpacity 
            style={styles.videoThumbnailContainer} 
            onPress={() => navigation.navigate('SingleVideo', { videos: downloads, initialIndex: index })}
          >
            <Image source={{ uri: getThumbnail(item.videoUrl) }} style={styles.videoThumbnail} />
            
            <View style={styles.playIconOverlay}>
              <Ionicons name="play-circle" size={40} color="rgba(255,255,255,0.8)" />
            </View>

            <View style={styles.videoInfoOverlay}>
              <Text style={styles.videoTitle} numberOfLines={1}>{item.productName || 'Contenido Desbloqueado'}</Text>
              <Text style={styles.videoAuthor}>@{item.user?.adultUsername || item.user?.username || 'Creador'}</Text>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="cloud-download-outline" size={60} color="#333" style={{ marginBottom: 15 }} />
            
            <Text style={styles.emptyTitle}>Tus descargas están vacías</Text>
            
            <Text style={styles.emptyText}>
              Aquí se almacenará de forma permanente todo el contenido exclusivo que adquieras. 
              {"\n\n"}
              Para proteger la privacidad de los creadores, los videos y fotos de esta zona están encriptados y no pueden ser grabados ni capturados por tu teléfono.
            </Text>

            <TouchableOpacity style={styles.exploreButton} onPress={() => navigation.navigate('Buscar')}>
              <Text style={styles.exploreButtonText}>Explorar Creadores</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: DARK_BG },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: DARK_BG },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#2A1A3D' },
  headerTitle: { color: '#FFF', fontSize: 20, fontWeight: 'bold' },
  
  securityBanner: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    backgroundColor: 'rgba(29, 161, 242, 0.1)', // Fondo celeste sutil
    paddingVertical: 8, 
    borderBottomWidth: 1, 
    borderBottomColor: 'rgba(29, 161, 242, 0.3)' 
  },
  securityText: { color: CELESTE_MAIN, fontSize: 11, fontWeight: '600' },
  
  videoThumbnailContainer: { width: COLUMN_WIDTH, height: COLUMN_WIDTH * 1.5, borderWidth: 1, borderColor: DARK_BG },
  videoThumbnail: { width: '100%', height: '100%', backgroundColor: '#111' },
  playIconOverlay: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, justifyContent: 'center', alignItems: 'center' },
  videoInfoOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 10, paddingTop: 30, backgroundColor: 'rgba(0,0,0,0.6)' },
  videoTitle: { color: '#FFF', fontSize: 13, fontWeight: 'bold', marginBottom: 2 },
  videoAuthor: { color: DARK_ACCENT, fontSize: 11, fontWeight: '500' },
  
  emptyContainer: { alignItems: 'center', marginTop: 80, paddingHorizontal: 30 },
  emptyTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold', marginBottom: 15, textAlign: 'center' },
  emptyText: { color: '#888', fontSize: 14, textAlign: 'center', marginBottom: 30, lineHeight: 22 },
  exploreButton: { backgroundColor: DARK_ACCENT, paddingVertical: 14, paddingHorizontal: 30, borderRadius: 25 },
  exploreButtonText: { color: '#000', fontWeight: 'bold', fontSize: 15 }
});