// frontend/src/screens/SearchScreen.tsx
import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, FlatList, Image, TouchableOpacity, Dimensions, ActivityIndicator, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { COLORS } from '../theme/colors';

const { width } = Dimensions.get('window');
const COLUMN_WIDTH = width / 3;

const BACKEND_URL = 'https://viralshop-xr9v.onrender.com';

// 👇 ESTA LISTA DEBE SER LA MISMA EN INTERESTSSCREEN 👇
export const CATEGORIES = [
  "Tecnología", "Gaming", "Moda", "Belleza", "Hogar", 
  "Fitness", "Música", "Comida", "Viajes", "Arte"
];

export default function SearchScreen({ navigation }: any) {
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Función de búsqueda principal
  const handleSearch = async (text: string) => {
    setQuery(text);
    if (text.trim() === '') {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      // El backend buscará este texto en títulos, etiquetas o descripciones
      const response = await axios.get(`${BACKEND_URL}/videos/search?q=${text}`);
      setResults(response.data);
    } catch (error) {
      console.error("Error buscando:", error);
    } finally {
      setLoading(false);
    }
  };

  // Función para manejar el toque en una categoría
  const handleCategoryPress = (category: string) => {
    if (selectedCategory === category) {
      // Si toca la que ya está seleccionada, la desmarcamos y limpiamos
      setSelectedCategory(null);
      setQuery('');
      setResults([]);
    } else {
      // Si toca una nueva, la marcamos y buscamos directamente
      setSelectedCategory(category);
      setQuery(category); // Actualizamos el input visualmente
      handleSearch(category);
    }
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

  return (
    <View style={styles.container}>
      {/* HEADER CON BÚSQUEDA Y CATEGORÍAS */}
      <View style={styles.header}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color={COLORS.textMuted} />
          <TextInput 
            style={styles.searchInput}
            placeholder="Buscar productos, usuarios o etiquetas..."
            placeholderTextColor={COLORS.textMuted}
            value={query}
            onChangeText={(text) => {
              setSelectedCategory(null); // Desmarca la categoría si el usuario escribe
              handleSearch(text);
            }}
            autoCapitalize="none"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => {
              setQuery('');
              setSelectedCategory(null);
              setResults([]);
            }}>
              <Ionicons name="close-circle" size={20} color={COLORS.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* 👇 LISTA HORIZONTAL DE CATEGORÍAS TIPO TIKTOK 👇 */}
        <View style={styles.categoriesWrapper}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false} 
            contentContainerStyle={styles.categoriesContainer}
          >
            {CATEGORIES.map((cat) => {
              const isSelected = selectedCategory === cat;
              return (
                <TouchableOpacity
                  key={cat}
                  style={[styles.categoryPill, isSelected && styles.categoryPillSelected]}
                  onPress={() => handleCategoryPress(cat)}
                >
                  <Text style={[styles.categoryText, isSelected && styles.categoryTextSelected]}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
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
            <TouchableOpacity 
              style={styles.videoThumbnailContainer}
              onPress={() => navigation.navigate('SingleVideo', { video: item })}
            >
              <Image source={{ uri: getThumbnail(item.videoUrl) }} style={styles.videoThumbnail} />
              
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
  header: { paddingTop: 50, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#222' },
  searchBar: { flexDirection: 'row', backgroundColor: COLORS.surface, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 12, alignItems: 'center', marginHorizontal: 15, marginBottom: 15 },
  searchInput: { flex: 1, color: COLORS.text, fontSize: 16, marginLeft: 10 },
  
  // Estilos de las Categorías
  categoriesWrapper: { height: 40 },
  categoriesContainer: { paddingHorizontal: 15, alignItems: 'center' },
  categoryPill: { backgroundColor: COLORS.surface, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginRight: 10, borderWidth: 1, borderColor: '#333' },
  categoryPillSelected: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  categoryText: { color: COLORS.text, fontSize: 14, fontWeight: '500' },
  categoryTextSelected: { color: '#FFF', fontWeight: 'bold' },

  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  emptyText: { color: COLORS.textMuted, fontSize: 16, marginTop: 10, textAlign: 'center' },
  videoThumbnailContainer: { width: COLUMN_WIDTH, height: COLUMN_WIDTH * 1.5, borderWidth: 0.5, borderColor: '#000' },
  videoThumbnail: { width: '100%', height: '100%', backgroundColor: '#222' },
  priceTag: { position: 'absolute', bottom: 5, left: 5, backgroundColor: COLORS.accent, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  priceText: { color: '#000', fontSize: 10, fontWeight: 'bold' }
});