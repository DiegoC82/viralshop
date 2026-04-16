// frontend/src/screens/SalesMetricsScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Dimensions, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { COLORS } from '../theme/colors';

const { width } = Dimensions.get('window');
const BACKEND_URL = 'https://viralshop-xr9v.onrender.com';

interface OverviewData {
  revenue: string;
  orders: number | string;
  views: string;
  conversion: string;
}

interface Product {
  id: string;
  name: string;
  price: string;
  sales: number;
  image: string;
}

export default function SalesMetricsScreen({ navigation }: any) {
  const [loading, setLoading] = useState(true);
  const [overviewData, setOverviewData] = useState<OverviewData>({
    revenue: '$0',
    orders: 0,
    views: '0',
    conversion: '0%',
  });
  const [topProducts, setTopProducts] = useState<Product[]>([]);

  useEffect(() => {
    fetchMetricsData();
  }, []);

  const getThumbnail = (videoUrl: string) => {
    if (videoUrl && videoUrl.includes('mux.com')) {
      const parts = videoUrl.split('/');
      const playbackId = parts[parts.length - 1].split('.')[0];
      return `https://image.mux.com/${playbackId}/thumbnail.jpg?time=1`;
    }
    return 'https://via.placeholder.com/150/222222/FFFFFF?text=Video';
  };

  const fetchMetricsData = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await axios.get(`${BACKEND_URL}/users/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const profile = response.data;
      
      let totalViews = profile.metrics?.totalViews || 0;
      let totalSales = profile.metrics?.totalSales || 0;
      let orders = 0;
      let soldProducts: any[] = [];

      // Analizamos los videos para sacar los productos vendidos
      if (profile.videos && Array.isArray(profile.videos)) {
        profile.videos.forEach((video: any) => {
          if (video.isAuction && video.isAuctionClosed && video.bids && video.bids.length > 0) {
            orders += 1;
            const highestBid = Math.max(...video.bids.map((b: any) => b.amount));
            
            soldProducts.push({
              id: video.id,
              name: video.productName || 'Remate',
              price: `$${highestBid.toLocaleString('es-AR')}`,
              sales: 1, // Es un remate único
              image: getThumbnail(video.videoUrl),
              amount: highestBid // Lo guardamos temporalmente para ordenar
            });
          }
        });
      }

      // Ordenamos los productos por el precio más alto (Top ventas)
      soldProducts.sort((a, b) => b.amount - a.amount);

      // Calculamos el % de conversión (Ventas / Vistas Totales)
      let conversionRate = totalViews > 0 ? ((orders / totalViews) * 100).toFixed(1) : '0.0';

      // Formateamos las vistas para que no se vea un número gigante
      let formattedViews = totalViews >= 1000 ? (totalViews / 1000).toFixed(1) + 'K' : totalViews.toString();

      setOverviewData({
        revenue: `$${totalSales.toLocaleString('es-AR')}`,
        orders: orders,
        views: formattedViews,
        conversion: `${conversionRate}%`,
      });

      // Guardamos solo los 5 mejores productos para la lista
      setTopProducts(soldProducts.slice(0, 5));

    } catch (error) {
      console.error("Error al cargar métricas de venta:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={COLORS.accent} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* CABECERA */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Métricas de Venta</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* FILTRO DE TIEMPO (Visual por ahora) */}
        <View style={styles.filterContainer}>
          <Text style={styles.filterText}>Histórico completo</Text>
          <Ionicons name="calendar-outline" size={16} color={COLORS.textMuted} style={{ marginLeft: 5 }} />
        </View>

        {/* TARJETAS DE RESUMEN */}
        <View style={styles.gridContainer}>
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="cash-outline" size={20} color={COLORS.accent} />
              <Text style={styles.cardTitle}>Ingresos ARS</Text>
            </View>
            <Text style={styles.cardValue}>{overviewData.revenue}</Text>
            <Text style={styles.cardTrendPositive}>Bruto total</Text>
          </View>

          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="cart-outline" size={20} color={COLORS.primary} />
              <Text style={styles.cardTitle}>Ventas</Text>
            </View>
            <Text style={styles.cardValue}>{overviewData.orders}</Text>
            <Text style={styles.cardTrendPositive}>Remates ganados</Text>
          </View>

          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="eye-outline" size={20} color="#FFD700" />
              <Text style={styles.cardTitle}>Vistas</Text>
            </View>
            <Text style={styles.cardValue}>{overviewData.views}</Text>
            <Text style={styles.cardTrendPositive}>Tráfico en videos</Text>
          </View>

          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="flash-outline" size={20} color="#00E676" />
              <Text style={styles.cardTitle}>Conversión</Text>
            </View>
            <Text style={styles.cardValue}>{overviewData.conversion}</Text>
            <Text style={styles.cardTrendPositive}>Vistas a Ventas</Text>
          </View>
        </View>

        {/* SECCIÓN: PRODUCTOS TOP */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Tus mejores remates</Text>
          
          {topProducts.length > 0 ? (
            topProducts.map((product) => (
              <View key={product.id} style={styles.productRow}>
                <Image source={{ uri: product.image }} style={styles.productImage} />
                <View style={styles.productInfo}>
                  <Text style={styles.productName}>{product.name}</Text>
                  <Text style={styles.productPrice}>{product.price}</Text>
                </View>
                <View style={styles.productSales}>
                  <Text style={styles.salesCount}>{product.sales}</Text>
                  <Text style={styles.salesLabel}>venta</Text>
                </View>
              </View>
            ))
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="bag-remove-outline" size={40} color={COLORS.textMuted} />
              <Text style={styles.emptyText}>Aún no has cerrado ninguna venta.</Text>
            </View>
          )}
        </View>

        {/* BOTÓN PARA VER TODOS LOS PEDIDOS */}
        <TouchableOpacity style={styles.viewAllButton} disabled={topProducts.length === 0}>
          <Text style={[styles.viewAllText, topProducts.length === 0 && { color: COLORS.textMuted }]}>
            Ver historial de pedidos
          </Text>
          <Ionicons name="arrow-forward" size={16} color={topProducts.length === 0 ? COLORS.textMuted : COLORS.text} />
        </TouchableOpacity>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  // Header
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 50, paddingBottom: 15, paddingHorizontal: 15, borderBottomWidth: 1, borderBottomColor: '#222' },
  backButton: { padding: 5 },
  headerTitle: { color: COLORS.text, fontSize: 18, fontWeight: 'bold' },
  headerSpacer: { width: 38 },
  scrollContent: { padding: 15, paddingBottom: 40 },
  
  // Filtro
  filterContainer: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', backgroundColor: COLORS.surface, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginBottom: 20 },
  filterText: { color: COLORS.textMuted, fontSize: 14, fontWeight: '500' },
  
  // Grid de Tarjetas
  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 10, marginBottom: 30 },
  card: { backgroundColor: COLORS.surface, width: (width - 40) / 2, padding: 15, borderRadius: 12, borderWidth: 1, borderColor: '#333' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  cardTitle: { color: COLORS.textMuted, fontSize: 14, marginLeft: 8, fontWeight: '500' },
  cardValue: { color: COLORS.text, fontSize: 24, fontWeight: 'bold', marginBottom: 5 },
  cardTrendPositive: { color: '#00E676', fontSize: 12, fontWeight: '500' }, // Verde
  cardTrendNegative: { color: '#FF2D55', fontSize: 12, fontWeight: '500' }, // Rojo
  
  // Lista de Productos
  sectionContainer: { marginBottom: 20 },
  sectionTitle: { color: COLORS.text, fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
  productRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, padding: 12, borderRadius: 10, marginBottom: 10 },
  productImage: { width: 50, height: 50, borderRadius: 8, backgroundColor: '#222' },
  productInfo: { flex: 1, marginLeft: 15 },
  productName: { color: COLORS.text, fontSize: 16, fontWeight: '500', marginBottom: 4 },
  productPrice: { color: COLORS.textMuted, fontSize: 14 },
  productSales: { alignItems: 'flex-end', justifyContent: 'center' },
  salesCount: { color: COLORS.text, fontSize: 18, fontWeight: 'bold' },
  salesLabel: { color: COLORS.textMuted, fontSize: 12 },
  
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 30, backgroundColor: COLORS.surface, borderRadius: 10, borderWidth: 1, borderColor: '#333' },
  emptyText: { color: COLORS.textMuted, marginTop: 10, fontSize: 14 },

  // Botón Ver Todos
  viewAllButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.surface, paddingVertical: 15, borderRadius: 10, borderWidth: 1, borderColor: '#333', marginTop: 10 },
  viewAllText: { color: COLORS.text, fontSize: 16, fontWeight: '600', marginRight: 5 },
});