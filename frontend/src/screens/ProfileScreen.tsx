// frontend/src/screens/ProfileScreen.tsx
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, Image, FlatList, TouchableOpacity, Dimensions, ActivityIndicator, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';

const { width } = Dimensions.get('window');
const COLUMN_WIDTH = width / 3;
const BACKEND_URL = 'https://viralshop-xr9v.onrender.com';

export default function ProfileScreen({ navigation }: any) {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isGuest, setIsGuest] = useState(false); // 👇 NUEVO ESTADO PARA SABER SI ES INVITADO 👇

  // 👇 NUEVA LÓGICA PRINCIPAL: Decide si cargar el perfil o mostrar la pantalla de invitado 👇
  const checkAuthAndFetchProfile = async () => {
    setLoading(true); // Iniciamos la carga
    try {
      const token = await AsyncStorage.getItem('userToken');
      
      // Si no hay token, es un invitado de verdad
      if (!token) {
        setIsGuest(true);
        setProfile(null);
        setLoading(false);
        return;
      }

      // Si hay token, intentamos traer sus datos
      setIsGuest(false);
      const response = await axios.get(`${BACKEND_URL}/users/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProfile(response.data);
    } catch (error: any) {
      console.log("Error en perfil:", error.message);
      // Si el token falló o expiró (401), lo tratamos como invitado
      if (error.response?.status === 401) {
        await AsyncStorage.removeItem('userToken');
        setIsGuest(true);
      }
    } finally {
      setLoading(false); // Pase lo que pase, dejamos de mostrar el spinner
    }
  };

  useFocusEffect(
    useCallback(() => {
      checkAuthAndFetchProfile();
    }, [])
  );

  const handleChangeAvatar = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso denegado', 'Necesitamos acceso a tu galería para cambiar la foto.');
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
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
    // 👇 En lugar de mandarlo al login, lo volvemos "invitado" al instante 👇
    setIsGuest(true); 
    setProfile(null);
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

  // 🌟 SI ES INVITADO, MOSTRAMOS ESTA PANTALLA ESPECIAL 🌟
  if (isGuest) {
    return (
      <View style={styles.guestContainer}>
        <View style={styles.guestIconContainer}>
          <Ionicons name="person-outline" size={80} color={COLORS.textMuted} />
        </View>
        <Text style={styles.guestTitle}>Perfil de Invitado</Text>
        <Text style={styles.guestSubtitle}>
          Guarda tus videos favoritos, sigue a creadores y compra productos de forma 100% segura.
        </Text>
        
        <TouchableOpacity 
          style={styles.guestButton} 
          onPress={() => navigation.navigate('Auth')}
        >
          <Text style={styles.guestButtonText}>Registrarse o Iniciar Sesión</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // 🌟 SI NO ES INVITADO, MOSTRAMOS TU PERFIL NORMAL 🌟
  const avatarUri = profile?.avatarUrl 
  ? `${profile.avatarUrl}?t=${new Date().getTime()}`
  : `https://i.pravatar.cc/150?u=${profile?.id}`;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
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
  // Estilos Originales del Perfil
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
  emptyText: { color: COLORS.textMuted, textAlign: 'center', marginTop: 50, fontSize: 16 },

  // 👇 NUEVOS ESTILOS PARA EL MODO INVITADO 👇
  guestContainer: { 
    flex: 1, 
    backgroundColor: COLORS.background, 
    justifyContent: 'center', 
    alignItems: 'center',
    padding: 30,
  },
  guestIconContainer: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  guestTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 15,
  },
  guestSubtitle: {
    fontSize: 16,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 24,
  },
  guestButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 18,
    paddingHorizontal: 40,
    borderRadius: 15,
    width: '100%',
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 5,
    elevation: 8,
  },
  guestButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  }
});