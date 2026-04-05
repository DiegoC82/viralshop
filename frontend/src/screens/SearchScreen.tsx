// frontend/src/screens/SearchScreen.tsx
import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, FlatList, Image, TouchableOpacity, Dimensions, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { COLORS } from '../theme/colors';

const { width } = Dimensions.get('window');
const COLUMN_WIDTH = width / 3;

// 👇 PON TU IP AQUÍ 👇
const BACKEND_URL = 'https://viralshop-xr9v.onrender.com';

export default function SearchScreen() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Función que se ejecuta cada vez que el usuario escribe
  const handleSearch = async (text: string) => {
    setQuery(text);
    if (text.trim() === '') {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const response = await axios.get(`${BACKEND_URL}/videos/search?q=${text}`);
      setResults(response.data);
    } catch (error) {
      console.error("Error buscando:", error);
    } finally {
      setLoading(false);
    }
  };

  // Reutilizamos tu función para obtener la portada del video de Mux
  const getThumbnail = (videoUrl: string) => {
    if (videoUrl && videoUrl.includes('mux.com')) {
      const parts = videoUrl.split('/');
      const filePart = parts[parts.length - 1];
      const playbackId = filePart.split('.')[0];
      return `https://image.mux.com/${playbackId}/thumbnail.jpg?time=1`;
    }
    return 'https://via.placeholder.com/150';
  };

  return (
    <View style={styles.container}>
      {/* BARRA DE BÚSQUEDA */}
      <View style={styles.header}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color={COLORS.textMuted} />
          <TextInput 
            style={styles.searchInput}
            placeholder="Buscar productos, usuarios o etiquetas..."
            placeholderTextColor={COLORS.textMuted}
            value={query}
            onChangeText={handleSearch}
            autoCapitalize="none"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => handleSearch('')}>
              <Ionicons name="close-circle" size={20} color={COLORS.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* RESULTADOS */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.accent} />
        </View>
      ) : results.length === 0 && query.length > 0 ? (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyText}>No encontramos nada para "{query}"</Text>
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          numColumns={3}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.videoThumbnailContainer}>
              <Image source={{ uri: getThumbnail(item.videoUrl) }} style={styles.videoThumbnail} />
              
              {/* Etiqueta pequeñita de precio si es un producto */}
              {item.productPrice && (
                <View style={styles.priceTag}>
                  <Text style={styles.priceText}>${item.productPrice}</Text>
                </View>
              )}
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.centerContainer}>
              <Ionicons name="compass-outline" size={80} color="#333" />
              <Text style={styles.emptyText}>Descubre nuevos productos y creadores</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { paddingTop: 50, paddingHorizontal: 15, paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: '#222' },
  searchBar: { flexDirection: 'row', backgroundColor: COLORS.surface, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 12, alignItems: 'center' },
  searchInput: { flex: 1, color: COLORS.text, fontSize: 16, marginLeft: 10 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  emptyText: { color: COLORS.textMuted, fontSize: 16, marginTop: 10, textAlign: 'center' },
  videoThumbnailContainer: { width: COLUMN_WIDTH, height: COLUMN_WIDTH * 1.5, borderWidth: 0.5, borderColor: '#000' },
  videoThumbnail: { width: '100%', height: '100%', backgroundColor: '#222' },
  priceTag: { position: 'absolute', bottom: 5, left: 5, backgroundColor: COLORS.accent, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  priceText: { color: '#000', fontSize: 10, fontWeight: 'bold' }
});