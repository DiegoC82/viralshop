// frontend/src/screens/AdultSearchScreen.tsx
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, FlatList, TouchableOpacity, Image, StatusBar, Modal, ScrollView, Dimensions, ActivityIndicator, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRoute } from '@react-navigation/native'; 
import { LOCATIONS_DATA } from '../data/locations'; 
import * as Location from 'expo-location'; 
import axios from 'axios';
import { useCurrency } from '../context/CurrencyContext';
import { formatCurrency } from '../utils/formatters';

const { width, height } = Dimensions.get('window');
const COLUMN_WIDTH = width / 3;
const BACKEND_URL = 'https://viralshop-xr9v.onrender.com';

// 👇 CATEGORÍAS EXCLUSIVAS DEL MODO OSCURO 👇
const ADULT_CATEGORIES = [
  { id: 'all', name: 'Todos' },
  { id: '1', name: 'Lencería y Ropa', icon: 'shirt-outline', subcategories: [{ id: '1_1', name: 'Conjuntos Íntimos', icon: 'heart' }, { id: '1_2', name: 'Disfraces', icon: 'star' }] },
  { id: '2', name: 'Juguetes y Accesorios', icon: 'battery-charging-outline', subcategories: [{ id: '2_1', name: 'Para ella', icon: 'female' }, { id: '2_2', name: 'Para él', icon: 'male' }, { id: '2_3', name: 'Parejas', icon: 'people' }] },
  { id: '3', name: 'Contenido Digital', icon: 'phone-portrait-outline', subcategories: [{ id: '3_1', name: 'Fotos Exclusivas', icon: 'image' }, { id: '3_2', name: 'Videos Personalizados', icon: 'videocam' }] },
  { id: '4', name: 'Cuidado Íntimo', icon: 'water-outline', subcategories: [{ id: '4_1', name: 'Lociones y Aceites', icon: 'water' }] },
];

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

export default function AdultSearchScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const route = useRoute<any>(); 
  const mapFilters = route.params || {};

  const { currency, toggleCurrency, exchangeRate } = useCurrency();
  
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const [selectedMainCat, setSelectedMainCat] = useState('Todos');
  const [selectedSubCat, setSelectedSubCat] = useState<any>(null);
  const [categoryModalVisible, setCategoryModalVisible] = useState(false); 
  const [subModalVisible, setSubModalVisible] = useState(false); 
  const [activeSubList, setActiveSubList] = useState<any[]>([]);

  const [selectedCountry, setSelectedCountry] = useState('🇦🇷 Argentina');
  const [selectedProvince, setSelectedProvince] = useState('Mendoza'); 
  const [selectedDepartment, setSelectedDepartment] = useState('San Rafael');       
  
  const [countryDropdownVisible, setCountryDropdownVisible] = useState(false);
  const [provinceDropdownVisible, setProvinceDropdownVisible] = useState(false);
  const [deptDropdownVisible, setDeptDropdownVisible] = useState(false);
  
  const [initialLoadDone, setInitialLoadDone] = useState(false);

  const blinkAnim = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(blinkAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(blinkAnim, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const countriesList = LOCATIONS_DATA.map(c => c.country);
  const provincesList = LOCATIONS_DATA.find(c => c.country === selectedCountry)?.provinces.map(p => p.name) || [];
  const deptsList = LOCATIONS_DATA.find(c => c.country === selectedCountry)?.provinces.find(p => p.name === selectedProvince)?.departments || [];

  const executeSuperSearch = async (textToSearch: string, categoryToSearch: string, subCategoryObj: any, forceClearMap = false) => {
    setLoading(true);
    try {
      const params: any = {
        is18Plus: true // 👈 EL MURO: Esto asegura que solo traiga contenido de esta zona
      };
      
      if (textToSearch) params.q = textToSearch;
      if (categoryToSearch && categoryToSearch !== 'Todos') params.category = categoryToSearch;
      if (subCategoryObj) params.subcategory = subCategoryObj.id;
      
      if (!forceClearMap && mapFilters && mapFilters.mapRadius) {
        params.lat = mapFilters.mapLat;
        params.lng = mapFilters.mapLng;
        params.radius = mapFilters.mapRadius;
      }

      const response = await axios.get(`${BACKEND_URL}/videos/search`, { params });
      setResults(response.data);
    } catch (error) {
      console.error("Error en súper búsqueda oscura:", error);
    } finally {
      setLoading(false);
    }
  };

  const clearMapSearch = () => {
    navigation.setParams({ mapLat: undefined, mapLng: undefined, mapRadius: undefined });
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
            if (city) setSelectedDepartment(city);
          }
        }
      } catch (error) {
        console.log("No se pudo obtener ubicación inicial");
      }
      setInitialLoadDone(true);
    };
    initScreen();
  }, []);

  useEffect(() => {
    if (initialLoadDone && mapFilters && mapFilters.mapRadius) {
      executeSuperSearch(query, selectedMainCat, selectedSubCat);
    }
  }, [mapFilters.mapRadius]);

  const handleMainCategorySelect = (category: any) => {
    setSelectedMainCat(category.name);
    setCategoryModalVisible(false);
    
    if (category.subcategories && category.subcategories.length > 0) {
      setActiveSubList(category.subcategories);
      setTimeout(() => setSubModalVisible(true), 300); 
    } else {
      setSelectedSubCat(null);
      executeSuperSearch(query, category.name, null);
    }
  };

  const handleSubCategorySelect = (subCat: any) => {
    let newSubCat = null;
    if (!subCat.id.includes('_all')) newSubCat = subCat;
    setSelectedSubCat(newSubCat);
    setSubModalVisible(false);
    executeSuperSearch(query, selectedMainCat, newSubCat); 
  };

  const handleTodosPress = () => {
    setSelectedMainCat('Todos');
    setSelectedSubCat(null);
    setQuery('');
    executeSuperSearch('', 'Todos', null);
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

  const mainCatObject = ADULT_CATEGORIES.find(c => c.name === selectedMainCat);
  const mainCatIcon = (mainCatObject as any)?.icon;
  const categoryButtonText = selectedMainCat !== 'Todos' ? (selectedSubCat ? selectedSubCat.name : selectedMainCat) : 'Categoría';
  const currentIcon = selectedSubCat?.icon || mainCatIcon;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor="#0A0514" />

      <View style={styles.fixedHeader}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={22} color="#888" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Busca productos, creadores..."
            placeholderTextColor="#888"
            value={query}
            onChangeText={handleSearch}
            autoCapitalize="none"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => { setQuery(''); executeSuperSearch('', selectedMainCat, selectedSubCat); }}>
              <Ionicons name="close-circle" size={22} color="#888" />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.filtersRow}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
            <TouchableOpacity 
              style={[styles.filterPill, selectedMainCat === 'Todos' && styles.filterPillSelected]} 
              onPress={handleTodosPress}
            >
              <Text style={[styles.filterPillText, selectedMainCat === 'Todos' && styles.filterPillTextSelected]}>Todos</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.filterPill, selectedMainCat !== 'Todos' && styles.filterPillSelected]} 
              onPress={() => setCategoryModalVisible(true)}
            >
              {currentIcon && (
                <Ionicons name={currentIcon as any} size={16} color="#FFF" style={{ marginRight: 6 }} />
              )}
              <Text style={[styles.filterPillText, selectedMainCat !== 'Todos' && styles.filterPillTextSelected]}>
                {categoryButtonText}
              </Text>
              <Ionicons name="chevron-down" size={14} color={selectedMainCat !== 'Todos' ? "#FFF" : "#888"} style={{ marginLeft: 6 }} />
            </TouchableOpacity>
          </ScrollView>

          <TouchableOpacity style={[styles.mapButton, { marginRight: 8, width: 'auto', paddingHorizontal: 12 }]} onPress={toggleCurrency}>
            <Ionicons name="cash-outline" size={16} color="#b829db" style={{ marginRight: 4 }} />
            <Text style={{ color: '#FFF', fontSize: 13, fontWeight: 'bold' }}>{currency}</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.mapButton, mapFilters && mapFilters.mapRadius && { backgroundColor: 'rgba(184, 41, 219, 0.2)' }]} 
            onPress={() => navigation.navigate('MapSearch')}
          >
            <Ionicons name="map-outline" size={20} color={mapFilters && mapFilters.mapRadius ? '#FFF' : '#b829db'} />
          </TouchableOpacity>
        </View>

        <View style={styles.locationFilterWrapper}>
          {mapFilters && mapFilters.mapRadius ? (
            <View style={styles.activeMapFilter}>
              <Ionicons name="radio-outline" size={16} color="#b829db" style={{ marginRight: 5 }} />
              <Text style={styles.breadcrumbLink}>Buscando a {mapFilters.mapRadius}km</Text>
              <TouchableOpacity onPress={clearMapSearch} style={{ marginLeft: 8 }}>
                <Ionicons name="close-circle" size={20} color="#888" />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.breadcrumbWrapper}>
              <Ionicons name="location-outline" size={16} color="#b829db" style={{ marginRight: 6 }} />
              
              <TouchableOpacity onPress={() => setCountryDropdownVisible(true)} style={styles.interactiveBreadcrumb}>
                <Text style={[styles.breadcrumbText, styles.breadcrumbLink]}>{selectedCountry}</Text>
                <Ionicons name="chevron-down" size={12} color="#b829db" style={{ marginLeft: 2 }} />
              </TouchableOpacity>
              <Text style={styles.breadcrumbText}> &gt; </Text>
              
              <TouchableOpacity onPress={() => setProvinceDropdownVisible(true)} style={styles.interactiveBreadcrumb}>
                <Text style={[styles.breadcrumbText, styles.breadcrumbLink]}>{selectedProvince}</Text>
                <Ionicons name="chevron-down" size={12} color="#b829db" style={{ marginLeft: 2 }} />
              </TouchableOpacity>
              <Text style={styles.breadcrumbText}> &gt; </Text>
              
              <TouchableOpacity onPress={() => setDeptDropdownVisible(true)} style={styles.interactiveBreadcrumb}>
                <Text style={[styles.breadcrumbText, styles.breadcrumbLink]}>{selectedDepartment}</Text>
                <Ionicons name="chevron-down" size={12} color="#b829db" style={{ marginLeft: 2 }} />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>

      {/* Modales de Categoría */}
      <Modal visible={categoryModalVisible} transparent={true} animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setCategoryModalVisible(false)}>
          <View style={styles.dropdownContainer}>
            <Text style={styles.modalSubTitle}>Elige una categoría</Text>
            <FlatList 
              data={ADULT_CATEGORIES.filter(c => c.name !== 'Todos')} 
              keyExtractor={(item) => item.id} 
              style={{ maxHeight: height * 0.5 }}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.subCategoryItem} onPress={() => handleMainCategorySelect(item)}>
                  {(item as any).icon && <Ionicons name={(item as any).icon} size={20} color="#b829db" style={{ marginRight: 15 }} />}
                  <Text style={styles.dropdownItemText}>{item.name}</Text>
                  <Ionicons name="chevron-forward" size={16} color="#888" style={{ marginLeft: 'auto' }} />
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={subModalVisible} transparent={true} animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setSubModalVisible(false)}>
          <View style={styles.dropdownContainer}>
            <Text style={styles.modalSubTitle}>Elige una subcategoría</Text>
            <FlatList 
              data={activeSubList} 
              keyExtractor={(item) => item.id} 
              style={{ maxHeight: height * 0.5 }}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.subCategoryItem} onPress={() => handleSubCategorySelect(item)}>
                  <Ionicons name={item.icon as any} size={20} color="#b829db" style={{ marginRight: 15 }} />
                  <Text style={styles.dropdownItemText}>{item.name}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Modales de Ubicación */}
      <DropdownModal visible={countryDropdownVisible} data={countriesList} onClose={() => setCountryDropdownVisible(false)} onSelect={(item: string) => { setSelectedCountry(item); setSelectedProvince('Provincia...'); setSelectedDepartment('Departamento...'); setCountryDropdownVisible(false); }} />
      <DropdownModal visible={provinceDropdownVisible} data={provincesList} onClose={() => setProvinceDropdownVisible(false)} onSelect={(item: string) => { setSelectedProvince(item); setSelectedDepartment('Departamento...'); setProvinceDropdownVisible(false); }} />
      <DropdownModal visible={deptDropdownVisible} data={deptsList} onClose={() => setDeptDropdownVisible(false)} onSelect={(item: string) => { setSelectedDepartment(item); setDeptDropdownVisible(false); }} />

      {/* Resultados */}
      {loading && results.length === 0 ? (
        <View style={styles.centerContainer}><ActivityIndicator size="large" color="#b829db" /></View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          numColumns={3}
          renderItem={({ item, index }) => {
            const catIcon = ADULT_CATEGORIES.find(c => c.name === item.category)?.icon || 'cube-outline';
            
            // 👇 CARGAMOS LA IDENTIDAD SECRETA DEL USUARIO 👇
            const displayUsername = item.user?.adultUsername || item.user?.username || 'User';
            const avatarUri = item.user?.adultAvatarUrl || `https://ui-avatars.com/api/?name=${displayUsername}&background=0A0514&color=b829db&size=150`;

            return (
              <TouchableOpacity 
                style={styles.videoThumbnailContainer} 
                onPress={() => navigation.navigate('SingleVideo', { videos: results, initialIndex: index })}
              >
                <Image source={{ uri: getThumbnail(item.videoUrl) }} style={styles.videoThumbnail} />
                
                <View style={styles.catIconBadge}>
                  <Ionicons name={catIcon as any} size={14} color="#FFF" />
                </View>

                <View style={styles.userInfoBadge}>
                  <View style={{ position: 'relative' }}>
                    <Image source={{ uri: avatarUri }} style={styles.miniAvatar} />
                    <Animated.View style={[
                      styles.onlineDotSearch,
                      { backgroundColor: item.user?.isOnline ? '#b829db' : '#888888' },
                      item.user?.isOnline ? { opacity: blinkAnim } : { opacity: 1 }
                    ]} />
                  </View>
                  <Text style={styles.miniUsername} numberOfLines={1}>{displayUsername}</Text>
                </View>

                <View style={styles.videoDetailOverlay}>
                  <Text style={styles.videoDetailText} numberOfLines={1}>{item.description}</Text>
                </View>

                <View style={styles.bottomDataRow}>
                  {item.discountPrice ? (
                    <View style={[styles.miniPriceTag, { backgroundColor: '#FF2D55', flexDirection: 'row', alignItems: 'center' }]}>
                      <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 9, textDecorationLine: 'line-through', marginRight: 4 }}>
                        {formatCurrency(item.productPrice, currency, exchangeRate)}
                      </Text>
                      <Text style={[styles.miniPriceText, { color: '#FFF' }]}>
                        {formatCurrency(item.discountPrice, currency, exchangeRate)}
                      </Text>
                    </View>
                  ) : item.productPrice ? (
                    <View style={styles.miniPriceTag}>
                      <Text style={styles.miniPriceText}>
                        {formatCurrency(item.productPrice, currency, exchangeRate)}
                      </Text>
                    </View>
                  ) : <View />}
                </View>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View style={styles.centerContainer}>
              <Ionicons name="search-outline" size={60} color="#333" style={{ marginBottom: 15 }} />
              <Text style={styles.emptyText}>No hay resultados para esta búsqueda</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0514' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 30, marginTop: 50 },
  emptyText: { color: '#888', fontSize: 16, textAlign: 'center', lineHeight: 24 },
  
  fixedHeader: { backgroundColor: '#0A0514', paddingBottom: 5, zIndex: 10 },
  
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#110A1F', marginHorizontal: 20, marginTop: 15, paddingHorizontal: 15, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: '#2A1A3D' },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, color: '#FFF', fontSize: 16 },

  filtersRow: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, marginVertical: 15, gap: 10 },
  filterPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#110A1F', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#2A1A3D', height: 40 },
  filterPillSelected: { backgroundColor: 'rgba(184, 41, 219, 0.2)', borderColor: '#b829db' },
  filterPillText: { color: '#888', fontSize: 14, fontWeight: '500' },
  filterPillTextSelected: { color: '#FFF', fontWeight: 'bold' },
  mapButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#110A1F', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#2A1A3D' },

  locationFilterWrapper: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: '#2A1A3D' },
  breadcrumbWrapper: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  breadcrumbText: { fontSize: 13, color: '#888' },
  interactiveBreadcrumb: { flexDirection: 'row', alignItems: 'center' },
  breadcrumbLink: { color: '#b829db', fontWeight: '600' },
  
  activeMapFilter: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#110A1F', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: '#b829db' },

  videoThumbnailContainer: { width: COLUMN_WIDTH, height: COLUMN_WIDTH * 1.5, borderWidth: 0.5, borderColor: '#000' },
  videoThumbnail: { width: '100%', height: '100%', backgroundColor: '#111' },

  catIconBadge: { position: 'absolute', top: 5, right: 5, backgroundColor: 'rgba(0,0,0,0.6)', padding: 4, borderRadius: 10 },
  userInfoBadge: { position: 'absolute', top: 5, left: 5, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)', paddingRight: 6, borderRadius: 12, maxWidth: '70%' },
  miniAvatar: { width: 22, height: 22, borderRadius: 11, borderWidth: 1, borderColor: '#b829db' },
  onlineDotSearch: { position: 'absolute', top: 0, right: 0, width: 8, height: 8, borderRadius: 4, borderWidth: 1, borderColor: '#0A0514', zIndex: 10 },
  miniUsername: { color: '#FFF', fontSize: 9, fontWeight: 'bold', marginLeft: 4, flexShrink: 1 },
  
  videoDetailOverlay: { position: 'absolute', bottom: 25, left: 5, right: 5 },
  videoDetailText: { color: '#FFF', fontSize: 10, fontWeight: '500', textShadowColor: '#000', textShadowRadius: 2 },
  
  bottomDataRow: { position: 'absolute', bottom: 5, left: 5, right: 5, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  miniPriceTag: { backgroundColor: '#b829db', paddingHorizontal: 5, paddingVertical: 2, borderRadius: 4 },
  miniPriceText: { color: '#000', fontSize: 10, fontWeight: 'bold' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
  dropdownContainer: { width: '85%', backgroundColor: '#110A1F', borderRadius: 12, padding: 15, borderWidth: 1, borderColor: '#2A1A3D' },
  modalSubTitle: { color: '#888', fontSize: 12, textAlign: 'center', marginBottom: 15, textTransform: 'uppercase', letterSpacing: 1 },
  subCategoryItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#1A0E2A', paddingHorizontal: 10 },
  dropdownItem: { paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#1A0E2A', paddingHorizontal: 10 },
  dropdownItemText: { color: '#FFF', fontSize: 16 }
});