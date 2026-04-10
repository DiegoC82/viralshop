// frontend/src/screens/MapSearchScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, ActivityIndicator, Alert } from 'react-native';
import MapView, { Marker, Circle } from 'react-native-maps'; // 👇 Volvemos a traer el Marker
import * as Location from 'expo-location'; 
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../theme/colors';

const { width, height } = Dimensions.get('window');

const RADIUS_OPTIONS = [2, 5, 10, 25];

export default function MapSearchScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  
  const [selectedRadius, setSelectedRadius] = useState<number>(5);
  
  // 👇 SEPARAMOS LA CÁMARA DE TU UBICACIÓN REAL 👇
  const [mapCamera, setMapCamera] = useState<any>(null); // Hacia dónde mira el mapa
  const [myRealLocation, setMyRealLocation] = useState<{latitude: number, longitude: number} | null>(null); // Tu GPS fijo
  
  const [loadingLocation, setLoadingLocation] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permiso denegado', 'Usaremos una ubicación por defecto.');
          const defaultLoc = { latitude: -34.6175, longitude: -68.3301 };
          setMyRealLocation(defaultLoc);
          setMapCamera({ ...defaultLoc, latitudeDelta: 0.05, longitudeDelta: 0.05 });
          setLoadingLocation(false);
          return;
        }

        // 1. Obtenemos el GPS
        let location = await Location.getCurrentPositionAsync({});
        const coords = { 
          latitude: location.coords.latitude, 
          longitude: location.coords.longitude 
        };
        
        // 2. Guardamos las coordenadas fijas del usuario
        setMyRealLocation(coords);
        
        // 3. Inicializamos la cámara del mapa en esa misma posición
        setMapCamera({
          ...coords,
          latitudeDelta: 0.05, 
          longitudeDelta: 0.05,
        });

      } catch (error) {
        console.error(error);
      } finally {
        setLoadingLocation(false);
      }
    })();
  }, []);

  const handleSearchInArea = () => {
    if (!myRealLocation) return;
    
    // 👇 SOLUCIÓN: Le decimos la ruta completa hacia la pestaña 👇
    navigation.navigate('MainTabs', { 
      screen: 'Buscar',
      params: {
        mapLat: myRealLocation.latitude, 
        mapLng: myRealLocation.longitude, 
        mapRadius: selectedRadius 
      }
    }); 
  };

  if (loadingLocation) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={{ color: COLORS.textMuted, marginTop: 15 }}>Localizando tu posición...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        initialRegion={mapCamera} // La cámara empieza donde estás tú
        customMapStyle={darkMapStyle}
        showsUserLocation={true} // Muestra el puntito azul nativo de iOS/Android (opcional)
      >
        {/* 👇 El Marker y el Círculo ahora están atados a "myRealLocation", NUNCA se mueven 👇 */}
        {myRealLocation && (
          <>
            <Marker coordinate={myRealLocation}>
              <View style={styles.markerContainer}>
                <Ionicons name="location" size={32} color={COLORS.primary} />
              </View>
            </Marker>

            <Circle
              center={myRealLocation}
              radius={selectedRadius * 1000}
              fillColor="rgba(128, 0, 255, 0.15)"
              strokeColor={COLORS.primary}
              strokeWidth={2}
            />
          </>
        )}
      </MapView>

      <TouchableOpacity 
        style={[styles.backButton, { top: insets.top + 10 }]} 
        onPress={() => navigation.goBack()}
      >
        <Ionicons name="arrow-back" size={24} color={COLORS.text} />
      </TouchableOpacity>

      <View style={[styles.bottomPanel, { paddingBottom: insets.bottom + 20 }]}>
        <Text style={styles.panelTitle}>Mi alcance de búsqueda</Text>
        
        <View style={styles.radiusSelector}>
          {RADIUS_OPTIONS.map((km) => (
            <TouchableOpacity 
              key={km}
              style={[styles.radiusPill, selectedRadius === km && styles.radiusPillActive]}
              onPress={() => setSelectedRadius(km)}
            >
              <Text style={[styles.radiusText, selectedRadius === km && styles.radiusTextActive]}>
                {km} km
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.searchButton} onPress={handleSearchInArea}>
          <Text style={styles.searchButtonText}>Buscar cerca de mi ubicación</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  map: { width: width, height: height },
  markerContainer: { alignItems: 'center', justifyContent: 'center' },
  backButton: { position: 'absolute', left: 20, width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.surface, justifyContent: 'center', alignItems: 'center', elevation: 5 },
  bottomPanel: { position: 'absolute', bottom: 0, width: '100%', backgroundColor: COLORS.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 20 },
  panelTitle: { color: COLORS.text, fontSize: 16, fontWeight: 'bold', marginBottom: 15, textAlign: 'center' },
  radiusSelector: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  radiusPill: { flex: 1, marginHorizontal: 5, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: '#2A1A3D', alignItems: 'center', backgroundColor: COLORS.background },
  radiusPillActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  radiusText: { color: COLORS.textMuted, fontSize: 14, fontWeight: '600' },
  radiusTextActive: { color: '#FFF' },
  searchButton: { backgroundColor: COLORS.accent, paddingVertical: 15, borderRadius: 14, alignItems: 'center' },
  searchButtonText: { color: '#000', fontSize: 16, fontWeight: 'bold' }
});

const darkMapStyle = [
  { elementType: "geometry", stylers: [{ color: "#212121" }] },
  { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#757575" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#212121" }] },
  { featureType: "administrative", elementType: "geometry", stylers: [{ color: "#757575" }] },
  { featureType: "administrative.country", elementType: "labels.text.fill", stylers: [{ color: "#9e9e9e" }] },
  { featureType: "administrative.land_parcel", stylers: [{ visibility: "off" }] },
  { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#bdbdbd" }] },
  { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#757575" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#181818" }] },
  { featureType: "poi.park", elementType: "labels.text.fill", stylers: [{ color: "#616161" }] },
  { featureType: "poi.park", elementType: "labels.text.stroke", stylers: [{ color: "#1b1b1b" }] },
  { featureType: "road", elementType: "geometry.fill", stylers: [{ color: "#2c2c2c" }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#8a8a8a" }] },
  { featureType: "road.arterial", elementType: "geometry", stylers: [{ color: "#373737" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#3c3c3c" }] },
  { featureType: "road.highway.controlled_access", elementType: "geometry", stylers: [{ color: "#4e4e4e" }] },
  { featureType: "road.local", elementType: "labels.text.fill", stylers: [{ color: "#616161" }] },
  { featureType: "transit", elementType: "labels.text.fill", stylers: [{ color: "#757575" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#000000" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#3d3d3d" }] }
];