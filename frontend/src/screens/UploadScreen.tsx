// frontend/src/screens/UploadScreen.tsx
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView, Modal, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location'; // 👇 IMPORTAMOS EL GPS 👇
import { useVideoPlayer, VideoView } from 'expo-video';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS } from '../theme/colors';

const BACKEND_URL = 'https://viralshop-xr9v.onrender.com';

const CATEGORIES_DATA = [
  { 
    id: 'tech', 
    name: 'Tecnología', 
    subcategories: [
      { id: 'tech_all', name: 'Todo Tecnología', icon: 'hardware-chip-outline' },
      { id: 'phones', name: 'Celulares', icon: 'phone-portrait-outline' },
      { id: 'pc', name: 'Computación', icon: 'laptop-outline' },
      { id: 'audio', name: 'Audio y Video', icon: 'headset-outline' },
      { id: 'gaming', name: 'Videojuegos', icon: 'game-controller-outline' },
      { id: 'smartwatch', name: 'Smartwatches', icon: 'watch-outline' },
    ] 
  },
  { 
    id: 'fashion', 
    name: 'Moda', 
    subcategories: [
      { id: 'fashion_all', name: 'Todo Moda', icon: 'pricetag-outline' },
      { id: 'clothes', name: 'Ropa', icon: 'shirt-outline' },
      { id: 'shoes', name: 'Calzado', icon: 'walk-outline' },
      { id: 'accessories', name: 'Accesorios', icon: 'glasses-outline' },
      { id: 'jewelry', name: 'Joyas y Relojes', icon: 'diamond-outline' },
    ] 
  },
  { 
    id: 'home', 
    name: 'Hogar y Muebles', 
    subcategories: [
      { id: 'home_all', name: 'Todo Hogar', icon: 'home-outline' },
      { id: 'furniture', name: 'Muebles', icon: 'bed-outline' },
      { id: 'appliances', name: 'Electrodomésticos', icon: 'tv-outline' },
      { id: 'deco', name: 'Decoración', icon: 'color-palette-outline' },
      { id: 'garden', name: 'Jardín y Aire Libre', icon: 'leaf-outline' },
    ] 
  },
  { 
    id: 'services',
    name: 'Servicios', 
    subcategories: [
      { id: 'services_all', name: 'Todo Servicios', icon: 'briefcase-outline' },
      { id: 'home_repairs', name: 'Reparaciones del Hogar', icon: 'construct-outline' },
      { id: 'tech_support', name: 'Soporte Técnico', icon: 'desktop-outline' },
      { id: 'classes', name: 'Cursos y Clases', icon: 'school-outline' },
      { id: 'events', name: 'Eventos y Fiestas', icon: 'musical-notes-outline' },
      { id: 'health_beauty', name: 'Salud y Belleza', icon: 'medkit-outline' },
    ] 
  },
  { 
    id: 'food_and_drinks', 
    name: 'Comida y Bebidas', 
    subcategories: [
      { id: 'food_all', name: 'Todo Comida y Bebidas', icon: 'cart-outline' },
      { id: 'food', name: 'Alimentos', icon: 'restaurant-outline' },
      { id: 'drinks', name: 'Bebidas', icon: 'wine-outline' },
      { id: 'snacks', name: 'Snacks y Postres', icon: 'ice-cream-outline' },
    ] 
  },
  { 
    id: 'sports', 
    name: 'Deportes', 
    subcategories: [
      { id: 'sports_all', name: 'Todo Deportes', icon: 'football-outline' },
      { id: 'fitness', name: 'Fitness y Gym', icon: 'barbell-outline' },
      { id: 'cycling', name: 'Ciclismo', icon: 'bicycle-outline' },
      { id: 'camping', name: 'Camping', icon: 'bonfire-outline' },
    ] 
  },
  { 
    id: 'beauty', 
    name: 'Belleza y Salud', 
    subcategories: [
      { id: 'beauty_all', name: 'Todo Belleza', icon: 'sparkles-outline' },
      { id: 'makeup', name: 'Maquillaje', icon: 'color-wand-outline' },
      { id: 'skincare', name: 'Cuidado Facial', icon: 'water-outline' },
      { id: 'perfumes', name: 'Perfumes', icon: 'flask-outline' },
      { id: 'hair', name: 'Cuidado del Cabello', icon: 'cut-outline' },
    ] 
  },
  { 
    id: 'vehicles', 
    name: 'Vehículos', 
    subcategories: [
      { id: 'vehicles_all', name: 'Todo Vehículos', icon: 'car-outline' },
      { id: 'auto_parts', name: 'Accesorios Autos', icon: 'build-outline' },
      { id: 'moto_parts', name: 'Accesorios Motos', icon: 'speedometer-outline' },
      { id: 'audio_car', name: 'Audio para Vehículos', icon: 'radio-outline' },
    ] 
  },
  { 
    id: 'tools', 
    name: 'Herramientas', 
    subcategories: [
      { id: 'tools_all', name: 'Todo Herramientas', icon: 'hammer-outline' },
      { id: 'electric', name: 'Eléctricas', icon: 'flash-outline' },
      { id: 'manual', name: 'Manuales', icon: 'construct-outline' },
    ] 
  }
];

export default function UploadScreen({ navigation }: any) {
  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [productName, setProductName] = useState('');
  const [productPrice, setProductPrice] = useState('');
  const [productLink, setProductLink] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  // Estados de Clasificación
  const [selectedCategory, setSelectedCategory] = useState<{ id: string, name: string, subcategories: any[] } | null>(null);
  const [selectedSubCategory, setSelectedSubCategory] = useState<any>(null);
  
  // 👇 NUEVOS ESTADOS DE GPS 👇
  const [locationName, setLocationName] = useState('');
  const [coords, setCoords] = useState<{lat: number, lng: number} | null>(null);
  const [isFetchingLocation, setIsFetchingLocation] = useState(false);
  
  const [catModalVisible, setCatModalVisible] = useState(false);
  const [subCatModalVisible, setSubCatModalVisible] = useState(false);
  
  const [isGuest, setIsGuest] = useState(false);
  const [loadingCheck, setLoadingCheck] = useState(true);

  useFocusEffect(
    useCallback(() => {
      const checkGuestMode = async () => {
        setLoadingCheck(true);
        const token = await AsyncStorage.getItem('userToken');
        if (!token) {
          setIsGuest(true);
        } else {
          setIsGuest(false);
        }
        setLoadingCheck(false);
      };
      checkGuestMode();
    }, [])
  );

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

  // 👇 LÓGICA DEL GPS 👇
  const handleGetLocation = async () => {
    setIsFetchingLocation(true);
    try {
      // 1. Pedir permiso al usuario
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiso denegado', 'Para aparecer en el mapa necesitas darnos acceso a tu ubicación.');
        setIsFetchingLocation(false);
        return;
      }

      // 2. Obtener Latitud y Longitud
      let location = await Location.getCurrentPositionAsync({});
      setCoords({ lat: location.coords.latitude, lng: location.coords.longitude });

      // 3. Traducir coordenadas a Ciudad (Geocodificación Inversa)
      let geocode = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude
      });

      if (geocode.length > 0) {
        // Tomamos la ciudad, o la subregión si la ciudad no está definida (común en Android)
        const city = geocode[0].city || geocode[0].subregion || 'Ubicación Desconocida';
        setLocationName(city);
      } else {
        setLocationName('Coordenadas guardadas');
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'No pudimos obtener tu ubicación.');
    } finally {
      setIsFetchingLocation(false);
    }
  };

  const handlePublish = async () => {
    if (!videoUri) return;
    if (description.trim() === '') {
      Alert.alert("Falta información", "Por favor, escribe una descripción para tu video.");
      return;
    }
    if (!selectedCategory || !selectedSubCategory) {
      Alert.alert("Falta Categoría", "Por favor, elige una categoría y sub-categoría para tu producto.");
      return;
    }
    // 👇 Validación de GPS 👇
    if (!coords) {
      Alert.alert("Falta Ubicación", "Toca el botón de ubicación para que los compradores cerca tuyo puedan encontrarte.");
      return;
    }

    setIsUploading(true);

    try {
      const token = await AsyncStorage.getItem('userToken');
      const formData = new FormData();
      
      formData.append('description', description);
      if (productName) formData.append('productName', productName);
      if (productPrice) formData.append('productPrice', productPrice);
      if (productLink) formData.append('productLink', productLink);
      
      formData.append('category', selectedCategory.name);
      formData.append('subCategory', selectedSubCategory.id);
      
      // Enviamos las coordenadas reales obtenidas por el GPS
      formData.append('latitude', coords.lat.toString());
      formData.append('longitude', coords.lng.toString());
      
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
      
      setVideoUri(null);
      setDescription('');
      setProductName('');
      setProductPrice('');
      setProductLink('');
      setSelectedCategory(null);
      setSelectedSubCategory(null);
      setCoords(null);
      setLocationName('');
      
      navigation.navigate('Inicio'); 

    } catch (error: any) {
      console.error("Error al subir video:", error);
      Alert.alert("Error", "No se pudo subir el video. Revisa tu conexión.");
    } finally {
      setIsUploading(false);
    }
  };

  if (loadingCheck) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={COLORS.accent} />
      </View>
    );
  }

  if (isGuest) {
    return (
      <View style={styles.guestContainer}>
        <View style={styles.guestIconContainer}>
          <Ionicons name="cloud-upload-outline" size={80} color={COLORS.textMuted} />
        </View>
        <Text style={styles.guestTitle}>Comparte tus videos</Text>
        <Text style={styles.guestSubtitle}>
          Únete a ViralShop para subir contenido, vender productos y crecer tu audiencia.
        </Text>
        <TouchableOpacity 
          style={styles.guestButton} 
          onPress={async () => {
            await AsyncStorage.removeItem('userToken'); 
            navigation.navigate('Auth');
          }}
        >
          <Text style={styles.guestButtonText}>Registrarse o Iniciar Sesión</Text>
        </TouchableOpacity>
      </View>
    );
  }

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

              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <View style={{ width: '48%' }}>
                  <Text style={styles.label}>Producto (Opcional)</Text>
                  <TextInput style={styles.inputSmall} placeholder="Ej: Zapatillas" placeholderTextColor={COLORS.textMuted} value={productName} onChangeText={setProductName} editable={!isUploading} />
                </View>
                <View style={{ width: '48%' }}>
                  <Text style={styles.label}>Precio ($)</Text>
                  <TextInput style={styles.inputSmall} placeholder="15000" placeholderTextColor={COLORS.textMuted} keyboardType="numeric" value={productPrice} onChangeText={setProductPrice} editable={!isUploading} />
                </View>
              </View>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <View style={{ width: '48%' }}>
                  <Text style={styles.label}>Ubicación (GPS) *</Text>
                  {/* 👇 BOTÓN INTELIGENTE DE UBICACIÓN 👇 */}
                  <TouchableOpacity 
                    style={[styles.inputSmall, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: isFetchingLocation ? COLORS.background : COLORS.surface }]}
                    onPress={handleGetLocation}
                    disabled={isUploading || isFetchingLocation}
                  >
                    <Text style={{ color: locationName ? COLORS.text : COLORS.textMuted, flex: 1 }} numberOfLines={1}>
                      {isFetchingLocation ? 'Buscando...' : (locationName || 'Toca para ubicar')}
                    </Text>
                    {isFetchingLocation ? (
                      <ActivityIndicator size="small" color={COLORS.primary} />
                    ) : (
                      <Ionicons name={coords ? "checkmark-circle" : "location"} size={18} color={COLORS.primary} />
                    )}
                  </TouchableOpacity>
                </View>
                <View style={{ width: '48%' }}>
                  <Text style={styles.label}>Enlace (Web/WhatsApp)</Text>
                  <TextInput style={styles.inputSmall} placeholder="https://..." placeholderTextColor={COLORS.textMuted} value={productLink} onChangeText={setProductLink} autoCapitalize="none" editable={!isUploading} />
                </View>
              </View>

              <Text style={[styles.label, { marginTop: 15, color: COLORS.accent }]}>Clasificación para el Buscador *</Text>
              <TouchableOpacity style={styles.dropdownSelector} onPress={() => setCatModalVisible(true)}>
                <Text style={selectedCategory ? styles.selectorTextAct : styles.selectorTextMuted}>
                  {selectedCategory ? selectedCategory.name : 'Elegir Categoría Principal...'}
                </Text>
                <Ionicons name="chevron-down" size={20} color={COLORS.textMuted} />
              </TouchableOpacity>

              {selectedCategory && (
                <TouchableOpacity style={[styles.dropdownSelector, { marginTop: 10 }]} onPress={() => setSubCatModalVisible(true)}>
                  {selectedSubCategory ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Ionicons name={selectedSubCategory.icon as any} size={18} color={COLORS.primary} style={{ marginRight: 8 }} />
                      <Text style={styles.selectorTextAct}>{selectedSubCategory.name}</Text>
                    </View>
                  ) : (
                    <Text style={styles.selectorTextMuted}>Elegir Sub-categoría...</Text>
                  )}
                  <Ionicons name="chevron-down" size={20} color={COLORS.textMuted} />
                </TouchableOpacity>
              )}
              
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

      {/* MODAL CATEGORÍA PRINCIPAL */}
      <Modal visible={catModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Categoría Principal</Text>
            <FlatList
              data={CATEGORIES_DATA}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.modalItem} onPress={() => { setSelectedCategory(item); setSelectedSubCategory(null); setCatModalVisible(false); }}>
                  <Text style={styles.modalItemText}>{item.name}</Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setCatModalVisible(false)}><Text style={{ color: '#FFF' }}>Cancelar</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL SUB-CATEGORÍA */}
      <Modal visible={subCatModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Sub-categoría</Text>
            <FlatList
              data={selectedCategory?.subcategories || []}
              keyExtractor={(item: any) => item.id}
              renderItem={({ item }: any) => (
                <TouchableOpacity style={styles.modalItem} onPress={() => { setSelectedSubCategory(item); setSubCatModalVisible(false); }}>
                  <Ionicons name={item.icon as any} size={20} color={COLORS.primary} style={{ marginRight: 15 }} />
                  <Text style={styles.modalItemText}>{item.name}</Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setSubCatModalVisible(false)}><Text style={{ color: '#FFF' }}>Cancelar</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

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
  
  dropdownSelector: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: COLORS.background, borderWidth: 1, borderColor: '#333', borderRadius: 10, paddingHorizontal: 15, paddingVertical: 12 },
  selectorTextMuted: { color: COLORS.textMuted, fontSize: 14 },
  selectorTextAct: { color: COLORS.text, fontSize: 14, fontWeight: '500' },

  buttonsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 },
  cancelButton: { flex: 1, backgroundColor: COLORS.background, padding: 15, borderRadius: 10, alignItems: 'center', marginRight: 10, borderWidth: 1, borderColor: '#333' },
  cancelButtonText: { color: COLORS.text, fontSize: 16, fontWeight: 'bold' },
  publishButton: { flex: 1, backgroundColor: COLORS.primary, padding: 15, borderRadius: 10, alignItems: 'center', marginLeft: 10 },
  publishButtonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },

  guestContainer: { flex: 1, backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center', padding: 30 },
  guestIconContainer: { width: 150, height: 150, borderRadius: 75, backgroundColor: COLORS.surface, justifyContent: 'center', alignItems: 'center', marginBottom: 30, borderWidth: 2, borderColor: COLORS.primary },
  guestTitle: { fontSize: 28, fontWeight: 'bold', color: COLORS.text, marginBottom: 15 },
  guestSubtitle: { fontSize: 16, color: COLORS.textMuted, textAlign: 'center', marginBottom: 40, lineHeight: 24 },
  guestButton: { backgroundColor: COLORS.primary, paddingVertical: 18, paddingHorizontal: 40, borderRadius: 15, width: '100%', alignItems: 'center', shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 5, elevation: 8 },
  guestButtonText: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: COLORS.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '80%' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.text, marginBottom: 15, textAlign: 'center' },
  modalItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#1A0E2A' },
  modalItemText: { color: COLORS.text, fontSize: 16 },
  modalCloseBtn: { marginTop: 20, padding: 15, alignItems: 'center', backgroundColor: '#333', borderRadius: 10 }
});