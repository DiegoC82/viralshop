// frontend/src/screens/SearchScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, FlatList, TouchableOpacity, Image, StatusBar, Modal, ScrollView, Dimensions, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRoute } from '@react-navigation/native'; 
import * as Location from 'expo-location'; 
import axios from 'axios';
import { COLORS } from '../theme/colors';

const { width } = Dimensions.get('window');
const COLUMN_WIDTH = width / 3;
const BACKEND_URL = 'https://viralshop-xr9v.onrender.com';

const CATEGORIES_DATA = [
  { id: 'all', name: 'Todos', subcategories: [] },
  { 
    id: 'tech', name: 'Tecnología', 
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
    id: 'fashion', name: 'Moda', 
    subcategories: [
      { id: 'fashion_all', name: 'Todo Moda', icon: 'pricetag-outline' },
      { id: 'clothes', name: 'Ropa', icon: 'shirt-outline' },
      { id: 'shoes', name: 'Calzado', icon: 'walk-outline' },
      { id: 'accessories', name: 'Accesorios', icon: 'glasses-outline' },
      { id: 'jewelry', name: 'Joyas y Relojes', icon: 'diamond-outline' },
    ] 
  },
  { 
    id: 'home', name: 'Hogar y Muebles', 
    subcategories: [
      { id: 'home_all', name: 'Todo Hogar', icon: 'home-outline' },
      { id: 'furniture', name: 'Muebles', icon: 'bed-outline' },
      { id: 'appliances', name: 'Electrodomésticos', icon: 'tv-outline' },
      { id: 'deco', name: 'Decoración', icon: 'color-palette-outline' },
      { id: 'garden', name: 'Jardín y Aire Libre', icon: 'leaf-outline' },
    ] 
  },
  { 
    id: 'services', name: 'Servicios', 
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
    id: 'food_and_drinks', name: 'Comida y Bebidas', 
    subcategories: [
      { id: 'food_all', name: 'Todo Comida y Bebidas', icon: 'cart-outline' },
      { id: 'food', name: 'Alimentos', icon: 'restaurant-outline' },
      { id: 'drinks', name: 'Bebidas', icon: 'wine-outline' },
      { id: 'snacks', name: 'Snacks y Postres', icon: 'ice-cream-outline' },
    ] 
  },
  { 
    id: 'sports', name: 'Deportes', 
    subcategories: [
      { id: 'sports_all', name: 'Todo Deportes', icon: 'football-outline' },
      { id: 'fitness', name: 'Fitness y Gym', icon: 'barbell-outline' },
      { id: 'cycling', name: 'Ciclismo', icon: 'bicycle-outline' },
      { id: 'camping', name: 'Camping', icon: 'bonfire-outline' },
    ] 
  },
  { 
    id: 'beauty', name: 'Belleza y Salud', 
    subcategories: [
      { id: 'beauty_all', name: 'Todo Belleza', icon: 'sparkles-outline' },
      { id: 'makeup', name: 'Maquillaje', icon: 'color-wand-outline' },
      { id: 'skincare', name: 'Cuidado Facial', icon: 'water-outline' },
      { id: 'perfumes', name: 'Perfumes', icon: 'flask-outline' },
      { id: 'hair', name: 'Cuidado del Cabello', icon: 'cut-outline' },
    ] 
  },
  { 
    id: 'vehicles', name: 'Vehículos', 
    subcategories: [
      { id: 'vehicles_all', name: 'Todo Vehículos', icon: 'car-outline' },
      { id: 'auto_parts', name: 'Accesorios Autos', icon: 'build-outline' },
      { id: 'moto_parts', name: 'Accesorios Motos', icon: 'speedometer-outline' },
      { id: 'audio_car', name: 'Audio para Vehículos', icon: 'radio-outline' },
    ] 
  },
  { 
    id: 'tools', name: 'Herramientas', 
    subcategories: [
      { id: 'tools_all', name: 'Todo Herramientas', icon: 'hammer-outline' },
      { id: 'electric', name: 'Eléctricas', icon: 'flash-outline' },
      { id: 'manual', name: 'Manuales', icon: 'construct-outline' },
    ] 
  }
];

const PROVINCIAS = ['CABA', 'Buenos Aires', 'Córdoba', 'Santa Fe', 'Mendoza', 'Salta'];
const CIUDADES_MENDOZA = ['Mendoza (Capital)', 'Godoy Cruz', 'Luján de Cuyo', 'San Rafael', 'Tunuyán', 'Malargüe'];

const DropdownModal = ({ visible, data, onSelect, onClose }: any) => (
  <Modal visible={visible} transparent={true} animationType="fade">
    <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
      <View style={styles.dropdownContainer}>
        <FlatList data={data} keyExtractor={(item) => item} style={{ maxHeight: 250 }}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.dropdownItem} onPress={() => onSelect(item)}>
              <Text style={styles.dropdownItemText}>{item}</Text>
            </TouchableOpacity>
          )}
        />
      </View>
    </TouchableOpacity>
  </Modal>
);

export default function SearchScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const route = useRoute<any>(); 
  const mapFilters = route.params || {};
  
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const [selectedMainCat, setSelectedMainCat] = useState('Todos');
  const [selectedSubCat, setSelectedSubCat] = useState<any>(null);
  const [subModalVisible, setSubModalVisible] = useState(false);
  const [activeSubList, setActiveSubList] = useState<any[]>([]);

  const [selectedProvince, setSelectedProvince] = useState('Mendoza'); 
  const [selectedCity, setSelectedCity] = useState('Buscando ubicación...');       
  const [provinceDropdownVisible, setProvinceDropdownVisible] = useState(false);
  const [cityDropdownVisible, setCityDropdownVisible] = useState(false);
  
  const [initialLoadDone, setInitialLoadDone] = useState(false);

  // 👇 FUNCIÓN MAESTRA CON SOPORTE PARA LIMPIAR EL MAPA 👇
  const executeSuperSearch = async (textToSearch: string, categoryToSearch: string, subCategoryObj: any, forceClearMap = false) => {
    setLoading(true);
    try {
      const params: any = {};
      
      if (textToSearch) params.q = textToSearch;
      if (categoryToSearch && categoryToSearch !== 'Todos') params.category = categoryToSearch;
      if (subCategoryObj) params.subcategory = subCategoryObj.id;
      
      // Solo sumamos las coordenadas si hay filtro de mapa Y no lo estamos limpiando a la fuerza
      if (!forceClearMap && mapFilters && mapFilters.mapRadius) {
        params.lat = mapFilters.mapLat;
        params.lng = mapFilters.mapLng;
        params.radius = mapFilters.mapRadius;
      }

      const response = await axios.get(`${BACKEND_URL}/videos/search`, { params });
      setResults(response.data);
    } catch (error) {
      console.error("Error en súper búsqueda:", error);
    } finally {
      setLoading(false);
    }
  };

  // 👇 NUEVA FUNCIÓN PARA CERRAR EL FILTRO DEL MAPA 👇
  const clearMapSearch = () => {
    // 1. Limpiamos los parámetros de la ruta para que desaparezca el cartel
    navigation.setParams({ mapLat: undefined, mapLng: undefined, mapRadius: undefined });
    // 2. Disparamos la búsqueda de nuevo, ignorando el mapa
    executeSuperSearch(query, selectedMainCat, selectedSubCat, true);
  };

  useEffect(() => {
    const initScreen = async () => {
      await executeSuperSearch('', 'Todos', null);
      
      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          let location = await Location.getCurrentPositionAsync({});
          let geocode = await Location.reverseGeocodeAsync({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude
          });
          
          if (geocode.length > 0) {
            const region = geocode[0].region || geocode[0].subregion;
            const city = geocode[0].city || geocode[0].subregion;
            if (region) setSelectedProvince(region);
            if (city) setSelectedCity(city);
          }
        } else {
          setSelectedCity('Elige ciudad...');
        }
      } catch (error) {
        setSelectedCity('Elige ciudad...');
      }
      setInitialLoadDone(true);
    };

    initScreen();
  }, []);

  // Si el usuario viene del mapa, actualiza la búsqueda automáticamente
  useEffect(() => {
    if (initialLoadDone && mapFilters && mapFilters.mapRadius) {
      executeSuperSearch(query, selectedMainCat, selectedSubCat);
    }
  }, [mapFilters.mapRadius]); // Solo se dispara si el radio cambia

  const handleCategoryPress = (category: any) => {
    setSelectedMainCat(category.name);
    
    if (category.name === 'Todos') {
      setSelectedSubCat(null);
      setQuery(''); 
      executeSuperSearch('', 'Todos', null); 
      return;
    }

    if (category.subcategories && category.subcategories.length > 0) {
      setActiveSubList(category.subcategories);
      setSubModalVisible(true); 
    } else {
      setSelectedSubCat(null);
      executeSuperSearch(query, category.name, null); 
    }
  };

  const handleSubCategorySelect = (subCat: any) => {
    let newSubCat = null;
    if (!subCat.id.includes('_all')) {
      newSubCat = subCat;
    }
    setSelectedSubCat(newSubCat);
    setSubModalVisible(false);
    executeSuperSearch(query, selectedMainCat, newSubCat); 
  };

  const handleSearch = (text: string) => {
    setQuery(text);
    if (text.trim() === '') { 
      executeSuperSearch('', selectedMainCat, selectedSubCat);
      return; 
    }
    executeSuperSearch(text, selectedMainCat, selectedSubCat);
  };

  const getThumbnail = (videoUrl: string) => {
    if (videoUrl && videoUrl.includes('mux.com')) {
      const parts = videoUrl.split('/');
      const playbackId = parts[parts.length - 1].split('.')[0];
      return `https://image.mux.com/${playbackId}/thumbnail.jpg?time=1`;
    }
    return 'https://via.placeholder.com/150';
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

      <View style={styles.fixedHeader}>
        {/* Barra de Búsqueda */}
        <View style={styles.searchBar}>
          <Ionicons name="search" size={22} color={COLORS.textMuted} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Busca productos, marcas..."
            placeholderTextColor={COLORS.textMuted}
            value={query}
            onChangeText={handleSearch}
            autoCapitalize="none"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => { setQuery(''); executeSuperSearch('', selectedMainCat, selectedSubCat); }}>
              <Ionicons name="close-circle" size={22} color={COLORS.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Categorías */}
        <View style={styles.categoriesWrapper}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 10 }}>
            {CATEGORIES_DATA.map((cat) => {
              const isSelected = selectedMainCat === cat.name;
              const showIcon = isSelected && selectedSubCat?.icon;

              return (
                <TouchableOpacity 
                  key={cat.id} 
                  style={[styles.categoryPill, isSelected && styles.categoryPillSelected]} 
                  onPress={() => handleCategoryPress(cat)}
                >
                  {showIcon && <Ionicons name={selectedSubCat.icon as any} size={16} color="#FFF" style={{ marginRight: 6 }} />}
                  <Text style={[styles.categoryText, isSelected && styles.categoryTextSelected]}>{cat.name}</Text>
                  {isSelected && cat.subcategories.length > 0 && !showIcon && (
                    <Ionicons name="chevron-down" size={12} color="#FFF" style={{ marginLeft: 4 }} />
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Filtro de Ubicación */}
        <View style={styles.locationFilterWrapper}>
          <View style={styles.breadcrumbWrapper}>
            {mapFilters && mapFilters.mapRadius ? (
              <View style={styles.activeMapFilter}>
                <Ionicons name="radio-outline" size={16} color={COLORS.accent} style={{ marginRight: 5 }} />
                <Text style={styles.breadcrumbLink}>Buscando a {mapFilters.mapRadius}km de ti</Text>
                <TouchableOpacity onPress={clearMapSearch} style={{ marginLeft: 8 }}>
                  <Ionicons name="close-circle" size={20} color={COLORS.textMuted} />
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <Text style={styles.breadcrumbText}>Argentina &gt; </Text>
                <TouchableOpacity onPress={() => setProvinceDropdownVisible(true)} style={styles.interactiveBreadcrumb}>
                  <Text style={[styles.breadcrumbText, styles.breadcrumbLink]}>{selectedProvince}</Text>
                  <Ionicons name="chevron-down" size={12} color={COLORS.accent} style={{ marginLeft: 2 }} />
                </TouchableOpacity>
                <Text style={styles.breadcrumbText}> &gt; </Text>
                <TouchableOpacity onPress={() => setCityDropdownVisible(true)} style={styles.interactiveBreadcrumb}>
                  <Text style={[styles.breadcrumbText, styles.breadcrumbLink]}>{selectedCity}</Text>
                  <Ionicons name="chevron-down" size={12} color={COLORS.accent} style={{ marginLeft: 2 }} />
                </TouchableOpacity>
              </>
            )}
          </View>
          <TouchableOpacity 
            style={[styles.mapButton, mapFilters && mapFilters.mapRadius && { backgroundColor: COLORS.primary }]} 
            onPress={() => navigation.navigate('MapSearch')}
          >
            <Ionicons name="map-outline" size={24} color={mapFilters && mapFilters.mapRadius ? '#FFF' : COLORS.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Modal de Subcategorías */}
      <Modal visible={subModalVisible} transparent={true} animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setSubModalVisible(false)}>
          <View style={styles.dropdownContainer}>
            <Text style={styles.modalSubTitle}>Elige una subcategoría</Text>
            <FlatList 
              data={activeSubList} 
              keyExtractor={(item) => item.id} 
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.subCategoryItem} onPress={() => handleSubCategorySelect(item)}>
                  <Ionicons name={item.icon as any} size={20} color={COLORS.primary} style={{ marginRight: 15 }} />
                  <Text style={styles.dropdownItemText}>{item.name}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>

      <DropdownModal visible={provinceDropdownVisible} data={PROVINCIAS} onClose={() => setProvinceDropdownVisible(false)} onSelect={(item: string) => { setSelectedProvince(item); setSelectedCity('Elige ciudad...'); setProvinceDropdownVisible(false); }} />
      <DropdownModal visible={cityDropdownVisible} data={CIUDADES_MENDOZA} onClose={() => setCityDropdownVisible(false)} onSelect={(item: string) => { setSelectedCity(item); setCityDropdownVisible(false); }} />

      {/* Resultados */}
      {loading && results.length === 0 ? (
        <View style={styles.centerContainer}><ActivityIndicator size="large" color={COLORS.accent} /></View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          numColumns={3}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.videoThumbnailContainer} onPress={() => navigation.navigate('SingleVideo', { video: item })}>
              <Image source={{ uri: getThumbnail(item.videoUrl) }} style={styles.videoThumbnail} />
              {item.productPrice ? (
                <View style={styles.priceTag}>
                  <Text style={styles.priceText}>${item.productPrice}</Text>
                </View>
              ) : null}
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.centerContainer}>
              <Ionicons name="search-outline" size={60} color="#333" style={{ marginBottom: 15 }} />
              <Text style={styles.emptyText}>
                No hay resultados para esta búsqueda
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 30, marginTop: 50 },
  emptyText: { color: COLORS.textMuted, fontSize: 16, textAlign: 'center', lineHeight: 24 },
  
  fixedHeader: { backgroundColor: COLORS.background, paddingBottom: 5, zIndex: 10 },
  
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, marginHorizontal: 20, marginTop: 15, paddingHorizontal: 15, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: '#2A1A3D' },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, color: COLORS.text, fontSize: 16 },

  categoriesWrapper: { marginVertical: 15, height: 40 },
  categoryPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#2A1A3D' },
  categoryPillSelected: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  categoryText: { color: COLORS.textMuted, fontSize: 14, fontWeight: '500' },
  categoryTextSelected: { color: '#FFF', fontWeight: 'bold' },

  locationFilterWrapper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: 20, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#2A1A3D' },
  breadcrumbWrapper: { flexDirection: 'row', alignItems: 'center', flex: 1, flexWrap: 'wrap' },
  breadcrumbText: { fontSize: 13, color: COLORS.textMuted },
  interactiveBreadcrumb: { flexDirection: 'row', alignItems: 'center' },
  breadcrumbLink: { color: COLORS.accent, fontWeight: '600' },
  
  // 👇 Estilo para el botón de cancelar mapa 👇
  activeMapFilter: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: COLORS.primary },
  
  mapButton: { width: 45, height: 45, borderRadius: 22, backgroundColor: COLORS.surface, justifyContent: 'center', alignItems: 'center', marginLeft: 10, borderWidth: 1, borderColor: '#2A1A3D' },

  videoThumbnailContainer: { width: COLUMN_WIDTH, height: COLUMN_WIDTH * 1.5, borderWidth: 0.5, borderColor: '#000' },
  videoThumbnail: { width: '100%', height: '100%', backgroundColor: '#222' },
  priceTag: { position: 'absolute', bottom: 5, left: 5, backgroundColor: COLORS.accent, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  priceText: { color: '#000', fontSize: 10, fontWeight: 'bold' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  dropdownContainer: { width: '80%', backgroundColor: COLORS.surface, borderRadius: 12, padding: 10, borderWidth: 1, borderColor: '#2A1A3D' },
  modalSubTitle: { color: COLORS.textMuted, fontSize: 12, textAlign: 'center', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 },
  subCategoryItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#1A0E2A', paddingHorizontal: 10 },
  dropdownItem: { paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#1A0E2A' },
  dropdownItemText: { color: COLORS.text, fontSize: 16 }
});