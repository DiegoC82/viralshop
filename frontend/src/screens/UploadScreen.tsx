// frontend/src/screens/UploadScreen.tsx
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useVideoPlayer, VideoView } from 'expo-video';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS } from '../theme/colors';

// 👇 REEMPLAZA ESTO CON TU IP REAL 👇
const BACKEND_URL = 'https://viralshop-xr9v.onrender.com';

export default function UploadScreen({ navigation }: any) {
  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  
  // Nuevos estados para conectar al comprador
  const [productName, setProductName] = useState('');
  const [productPrice, setProductPrice] = useState('');
  const [productLink, setProductLink] = useState('');
  
  const [isUploading, setIsUploading] = useState(false);

  const pickVideo = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso denegado', 'Necesitamos acceso a tu galería para subir videos.');
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['videos'],
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled) {
      setVideoUri(result.assets[0].uri);
    }
  };

  const player = useVideoPlayer(videoUri || '', player => {
    player.loop = true;
    player.muted = true;
    player.play();
  });

  const handlePublish = async () => {
    if (!videoUri) return;
    if (description.trim() === '') {
      Alert.alert("Falta información", "Por favor, escribe una descripción para tu video.");
      return;
    }

    setIsUploading(true);

    try {
      const token = await AsyncStorage.getItem('userToken');
      const formData = new FormData();
      
      formData.append('description', description);
      
      // Adjuntamos los datos del producto si el usuario los completó
      if (productName) formData.append('productName', productName);
      if (productPrice) formData.append('productPrice', productPrice);
      if (productLink) formData.append('productLink', productLink);
      
      formData.append('video', {
        uri: videoUri,
        name: `video-${Date.now()}.mp4`,
        type: 'video/mp4',
      } as any);

      const response = await axios.post(`${BACKEND_URL}/videos/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`
        },
      });

      Alert.alert("¡Éxito!", response.data.message);
      
      // Limpiamos todo el formulario
      setVideoUri(null);
      setDescription('');
      setProductName('');
      setProductPrice('');
      setProductLink('');
      
      navigation.navigate('Inicio'); 

    } catch (error: any) {
      console.error("Error al subir video:", error);
      Alert.alert("Error", "No se pudo subir el video. Revisa tu conexión.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.container}>
      {!videoUri ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="cloud-upload-outline" size={80} color={COLORS.accent} />
          <Text style={styles.title}>Nuevo Video</Text>
          <Text style={styles.subtitle}>Sube un producto o servicio a ViralShop</Text>
          
          <TouchableOpacity style={styles.uploadButton} onPress={pickVideo}>
            <Ionicons name="images" size={24} color="#000" style={{ marginRight: 10 }} />
            <Text style={styles.uploadButtonText}>Elegir de la Galería</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.previewContainer}>
          <View style={styles.videoPreviewWrapper}>
            <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="cover" nativeControls={false} />
          </View>
          
          <View style={styles.formContainer}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
              
              <Text style={styles.label}>Descripción del video *</Text>
              <TextInput 
                style={styles.input}
                placeholder="¡Mira este nuevo producto!..."
                placeholderTextColor={COLORS.textMuted}
                value={description}
                onChangeText={setDescription}
                multiline
                editable={!isUploading}
              />

              <Text style={styles.label}>¿Qué estás ofreciendo? (Opcional)</Text>
              <TextInput 
                style={styles.inputSmall}
                placeholder="Ej: Zapatillas Nike Air"
                placeholderTextColor={COLORS.textMuted}
                value={productName}
                onChangeText={setProductName}
                editable={!isUploading}
              />

              <Text style={styles.label}>Precio (Opcional)</Text>
              <TextInput 
                style={styles.inputSmall}
                placeholder="Ej: 15000"
                placeholderTextColor={COLORS.textMuted}
                value={productPrice}
                onChangeText={setProductPrice}
                keyboardType="numeric"
                editable={!isUploading}
              />

              <Text style={styles.label}>Enlace de contacto (WhatsApp / Web)</Text>
              <TextInput 
                style={styles.inputSmall}
                placeholder="Ej: https://wa.me/123456789"
                placeholderTextColor={COLORS.textMuted}
                value={productLink}
                onChangeText={setProductLink}
                autoCapitalize="none"
                editable={!isUploading}
              />
              
              <View style={styles.buttonsRow}>
                <TouchableOpacity style={styles.cancelButton} onPress={() => setVideoUri(null)} disabled={isUploading}>
                  <Text style={styles.cancelButtonText}>Cancelar</Text>
                </TouchableOpacity>
                
                <TouchableOpacity style={[styles.publishButton, isUploading && { backgroundColor: COLORS.textMuted }]} onPress={handlePublish} disabled={isUploading}>
                  {isUploading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.publishButtonText}>Publicar</Text>}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  title: { color: COLORS.text, fontSize: 32, fontWeight: 'bold', marginTop: 20 },
  subtitle: { color: COLORS.textMuted, fontSize: 16, marginTop: 10, textAlign: 'center', marginBottom: 40 },
  uploadButton: { flexDirection: 'row', backgroundColor: COLORS.accent, paddingVertical: 15, paddingHorizontal: 30, borderRadius: 30, alignItems: 'center', shadowColor: COLORS.accent, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 5, elevation: 8 },
  uploadButtonText: { color: '#000', fontSize: 18, fontWeight: 'bold' },
  previewContainer: { flex: 1 },
  videoPreviewWrapper: { flex: 1.2, backgroundColor: '#000' },
  formContainer: { flex: 1.8, padding: 20, backgroundColor: COLORS.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, marginTop: -20 },
  label: { color: COLORS.text, fontSize: 14, fontWeight: 'bold', marginBottom: 5, marginTop: 10 },
  input: { backgroundColor: COLORS.background, color: COLORS.text, padding: 15, borderRadius: 10, borderWidth: 1, borderColor: '#333', fontSize: 14, minHeight: 80, textAlignVertical: 'top', marginBottom: 5 },
  inputSmall: { backgroundColor: COLORS.background, color: COLORS.text, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#333', fontSize: 14, marginBottom: 5 },
  buttonsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 },
  cancelButton: { flex: 1, backgroundColor: COLORS.background, padding: 15, borderRadius: 10, alignItems: 'center', marginRight: 10, borderWidth: 1, borderColor: '#333' },
  cancelButtonText: { color: COLORS.text, fontSize: 16, fontWeight: 'bold' },
  publishButton: { flex: 1, backgroundColor: COLORS.primary, padding: 15, borderRadius: 10, alignItems: 'center', marginLeft: 10 },
  publishButtonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
});