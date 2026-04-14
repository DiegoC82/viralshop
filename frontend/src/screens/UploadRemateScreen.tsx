// frontend/src/screens/UploadRemateScreen.tsx
import React, { useState } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, TextInput, 
  ScrollView, Image, Alert, ActivityIndicator 
} from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../theme/colors';

export default function UploadRemateScreen({ navigation }: any) {
  const [video, setVideo] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [basePrice, setBasePrice] = useState('');
  const [loading, setLoading] = useState(false);

  const pickVideo = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['videos'], // ✅ El formato nuevo y correcto
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled) {
      setVideo(result.assets[0].uri);
    }
  };

  const handleCreateAuction = async () => {
    if (!video || !title || !basePrice) {
      Alert.alert("Faltan datos", "Por favor completa todos los campos y sube un video.");
      return;
    }
    
    setLoading(true);
    
    try {
      const token = await AsyncStorage.getItem('userToken');
      const formData = new FormData();
      
      const filename = video.split('/').pop() || `remate-${Date.now()}.mp4`;
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `video/${match[1]}` : `video/mp4`;
      
      formData.append('video', { uri: video, name: filename, type } as any);
      formData.append('title', title);
      formData.append('basePrice', basePrice);

      // Enviamos el video al nuevo endpoint de Remates
      await axios.post(`https://viralshop-xr9v.onrender.com/videos/remate`, formData, {
        headers: { 
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}` 
        },
      });

      Alert.alert("¡Remate Creado!", "Tu producto estará activo por las próximas 24 horas.");
      navigation.navigate('MainTabs', { screen: 'Remates' });

    } catch (error: any) {
      console.error("Error al subir remate:", error.response?.data || error.message);
      Alert.alert("Error", "Hubo un problema al subir tu remate. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="close-outline" size={30} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Nuevo Remate 24h</Text>
        <View style={{ width: 30 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* SECTOR DE VIDEO */}
        <TouchableOpacity style={styles.videoPicker} onPress={pickVideo}>
          {video ? (
            <View style={styles.previewContainer}>
              <Ionicons name="videocam" size={40} color={COLORS.accent} />
              <Text style={styles.videoSelectedText}>Video Seleccionado</Text>
              <Text style={styles.changeVideoText}>Toca para cambiar</Text>
            </View>
          ) : (
            <View style={styles.emptyVideo}>
              <Ionicons name="cloud-upload-outline" size={50} color={COLORS.textMuted} />
              <Text style={styles.uploadLabel}>Subir Video del Producto</Text>
              <Text style={styles.uploadSubLabel}>Máximo 60 segundos</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* FORMULARIO */}
        <View style={styles.form}>
          <Text style={styles.inputLabel}>Título del Producto</Text>
          <TextInput 
            style={styles.input}
            placeholder="Ej: iPhone 13 Pro Max Impecable"
            placeholderTextColor="#666"
            value={title}
            onChangeText={setTitle}
          />

          <Text style={styles.inputLabel}>Precio Base (ARS)</Text>
          <View style={styles.priceInputContainer}>
            <Text style={styles.currencySymbol}>$</Text>
            <TextInput 
              style={styles.priceInput}
              placeholder="0.00"
              placeholderTextColor="#666"
              keyboardType="numeric"
              value={basePrice}
              onChangeText={setBasePrice}
            />
          </View>
          <Text style={styles.infoText}>
            * El remate comenzará con este valor y durará exactamente 24 horas.
          </Text>
        </View>

        <TouchableOpacity style={styles.submitButton} onPress={handleCreateAuction} disabled={loading}>
          <LinearGradient
            colors={[COLORS.accent, '#FF8F00']}
            style={styles.gradient}
          >
            {loading ? <ActivityIndicator color="#000" /> : (
              <Text style={styles.submitText}>Lanzar Remate</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 50, paddingBottom: 20 },
  headerTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },
  
  videoPicker: { width: '100%', height: 220, backgroundColor: COLORS.surface, borderRadius: 15, borderStyle: 'dashed', borderWidth: 2, borderColor: '#444', justifyContent: 'center', alignItems: 'center', marginBottom: 25, overflow: 'hidden' },
  emptyVideo: { alignItems: 'center' },
  uploadLabel: { color: '#FFF', fontSize: 16, fontWeight: 'bold', marginTop: 10 },
  uploadSubLabel: { color: '#666', fontSize: 12, marginTop: 5 },
  previewContainer: { alignItems: 'center' },
  videoSelectedText: { color: COLORS.accent, fontWeight: 'bold', marginTop: 10 },
  changeVideoText: { color: '#666', fontSize: 12 },

  form: { gap: 15 },
  inputLabel: { color: '#AAA', fontSize: 14, fontWeight: '600', marginBottom: 5 },
  input: { backgroundColor: COLORS.surface, borderRadius: 10, padding: 15, color: '#FFF', fontSize: 16, borderWidth: 1, borderColor: '#333' },
  priceInputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: 10, paddingHorizontal: 15, borderWidth: 1, borderColor: '#333' },
  currencySymbol: { color: COLORS.accent, fontSize: 20, fontWeight: 'bold', marginRight: 10 },
  priceInput: { flex: 1, paddingVertical: 15, color: '#FFF', fontSize: 22, fontWeight: 'bold' },
  infoText: { color: COLORS.textMuted, fontSize: 12, lineHeight: 18, marginTop: 5 },

  submitButton: { marginTop: 40, height: 55, borderRadius: 12, overflow: 'hidden' },
  gradient: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  submitText: { color: '#000', fontSize: 18, fontWeight: 'bold' }
});