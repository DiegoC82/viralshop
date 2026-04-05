// frontend/src/screens/ProfileScreen.tsx
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, Image, FlatList, TouchableOpacity, Dimensions, ActivityIndicator, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import * as ImagePicker from 'expo-image-picker'; // <-- Importamos el selector de imágenes
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';

const { width } = Dimensions.get('window');
const COLUMN_WIDTH = width / 3;

// 👇 REEMPLAZA CON TU IP REAL 👇
const BACKEND_URL = 'https://viralshop-xr9v.onrender.com';

export default function ProfileScreen({ navigation }: any) {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false); // Para mostrar que la foto está subiendo

  const fetchProfile = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await axios.get(`${BACKEND_URL}/users/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProfile(response.data);
    } catch (error: any) {
      if (error.response && error.response.status === 401) {
        await AsyncStorage.removeItem('userToken');
        navigation.replace('Auth');
      }
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchProfile();
    }, [])
  );

  // 👇 NUEVA FUNCIÓN: Cambiar la foto de perfil 👇
  const handleChangeAvatar = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso denegado', 'Necesitamos acceso a tu galería para cambiar la foto.');
      return;
    }

    // Abrimos la galería SOLO para imágenes y forzamos un recorte cuadrado (1:1)
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5, // Bajamos un poco la calidad para que suba rapidísimo
    });

    if (!result.canceled) {
      setIsUploading(true);
      try {
        const token = await AsyncStorage.getItem('userToken');
        const formData = new FormData();
        
        formData.append('avatar', {
          uri: result.assets[0].uri,
          name: `avatar-${Date.now()}.jpg`,
          type: 'image/jpeg',
        } as any);

        const response = await axios.post(`${BACKEND_URL}/users/avatar`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
            'Authorization': `Bearer ${token}`
          },
        });

        // Actualizamos la pantalla instantáneamente con la nueva foto
        setProfile({ ...profile, avatarUrl: response.data.avatarUrl });
        Alert.alert("¡Éxito!", "Foto de perfil actualizada.");
      } catch (error) {
        console.error("Error al subir foto:", error);
        Alert.alert("Error", "No se pudo actualizar la foto.");
      } finally {
        setIsUploading(false);
      }
    }
  };

  const handleLogout = async () => {
    await AsyncStorage.removeItem('userToken');
    navigation.replace('Auth');
  };

  const getThumbnail = (videoUrl: string) => {
    if (videoUrl && videoUrl.includes('mux.com')) {
      const parts = videoUrl.split('/');
      const filePart = parts[parts.length - 1];
      const playbackId = filePart.split('.')[0];
      return `https://image.mux.com/${playbackId}/thumbnail.jpg?time=1`;
    }
    return 'https://via.placeholder.com/150';
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.accent} />
      </View>
    );
  }

  const avatarUri = profile?.avatarUrl 
  ? `${profile.avatarUrl}?t=${new Date().getTime()}` // Agregamos un timestamp para burlar el caché
  : `https://i.pravatar.cc/150?u=${profile?.id}`;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        {/* 👇 CONECTAMOS EL TOQUE EN LA FOTO O EL BOTÓN 👇 */}
        <TouchableOpacity onPress={handleChangeAvatar} disabled={isUploading}>
          {isUploading ? (
            <View style={[styles.avatar, { justifyContent: 'center', alignItems: 'center' }]}>
              <ActivityIndicator color={COLORS.accent} />
            </View>
          ) : (
            <Image source={{ uri: avatarUri }} style={styles.avatar} />
          )}
        </TouchableOpacity>
        
        <Text style={styles.username}>@{profile?.username}</Text>
        <Text style={styles.name}>{profile?.name}</Text>
        
        <View style={styles.statsContainer}>
          <View style={styles.statBox}><Text style={styles.statNumber}>0</Text><Text style={styles.statLabel}>Siguiendo</Text></View>
          <View style={styles.statBox}><Text style={styles.statNumber}>0</Text><Text style={styles.statLabel}>Seguidores</Text></View>
          <View style={styles.statBox}><Text style={styles.statNumber}>{profile?.videos?.length || 0}</Text><Text style={styles.statLabel}>Videos</Text></View>
        </View>

        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.editButton} onPress={handleChangeAvatar}>
            <Text style={styles.editButtonText}>Editar perfil</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={20} color="#FFF" />
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={profile?.videos}
        keyExtractor={(item) => item.id}
        numColumns={3}
        renderItem={({ item }) => (
          // 👇 AGREGAMOS EL onPress AQUÍ 👇
          <TouchableOpacity 
            style={styles.videoThumbnailContainer}
            onPress={() => navigation.navigate('SingleVideo', { video: item })}
          >
            <Image source={{ uri: getThumbnail(item.videoUrl) }} style={styles.videoThumbnail} />
            <View style={styles.viewCountBadge}>
              <Ionicons name="play-outline" size={14} color="#FFF" />
              <Text style={styles.viewCountText}>{item.viewCount || 0}</Text>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text style={styles.emptyText}>Aún no has subido videos.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  loadingContainer: { flex: 1, backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center' },
  header: { alignItems: 'center', paddingTop: 50, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: '#333' },
  avatar: { width: 100, height: 100, borderRadius: 50, marginBottom: 15, borderWidth: 2, borderColor: COLORS.accent },
  username: { color: COLORS.text, fontSize: 20, fontWeight: 'bold' },
  name: { color: COLORS.textMuted, fontSize: 16, marginTop: 5 },
  statsContainer: { flexDirection: 'row', justifyContent: 'center', width: '100%', marginTop: 20 },
  statBox: { alignItems: 'center', marginHorizontal: 20 },
  statNumber: { color: COLORS.text, fontSize: 18, fontWeight: 'bold' },
  statLabel: { color: COLORS.textMuted, fontSize: 14 },
  actionButtons: { flexDirection: 'row', marginTop: 20, alignItems: 'center' },
  editButton: { backgroundColor: '#333', paddingVertical: 10, paddingHorizontal: 40, borderRadius: 5, marginRight: 10 },
  editButtonText: { color: COLORS.text, fontWeight: 'bold', fontSize: 16 },
  logoutButton: { backgroundColor: '#FF2D55', padding: 10, borderRadius: 5, justifyContent: 'center', alignItems: 'center' },
  videoThumbnailContainer: { width: COLUMN_WIDTH, height: COLUMN_WIDTH * 1.5, borderWidth: 0.5, borderColor: '#000' },
  videoThumbnail: { width: '100%', height: '100%', backgroundColor: '#222' },
  viewCountBadge: { position: 'absolute', bottom: 5, left: 5, flexDirection: 'row', alignItems: 'center' },
  viewCountText: { color: '#FFF', fontSize: 12, fontWeight: 'bold', marginLeft: 3, textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 },
  emptyText: { color: COLORS.textMuted, textAlign: 'center', marginTop: 50, fontSize: 16 }
});