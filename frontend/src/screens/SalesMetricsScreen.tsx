// frontend/src/screens/SalesMetricsScreen.tsx
import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';

const { width } = Dimensions.get('window');

// Datos de prueba para maquetar
const OVERVIEW_DATA = {
  revenue: '$1,245.50',
  orders: 34,
  views: '12.5K',
  conversion: '2.8%',
};

const TOP_PRODUCTS = [
  { id: '1', name: 'Aro de Luz LED 10"', price: '$25.00', sales: 15, image: 'https://via.placeholder.com/150/222222/FFFFFF?text=Luz' },
  { id: '2', name: 'Micrófono Inalámbrico', price: '$45.00', sales: 10, image: 'https://via.placeholder.com/150/222222/FFFFFF?text=Mic' },
  { id: '3', name: 'Trípode Flexible', price: '$15.00', sales: 9, image: 'https://via.placeholder.com/150/222222/FFFFFF?text=Tripode' },
];

export default function SalesMetricsScreen({ navigation }: any) {
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
        
        {/* FILTRO DE TIEMPO */}
        <View style={styles.filterContainer}>
          <Text style={styles.filterText}>Últimos 30 días</Text>
          <Ionicons name="calendar-outline" size={16} color={COLORS.textMuted} style={{ marginLeft: 5 }} />
        </View>

        {/* TARJETAS DE RESUMEN */}
        <View style={styles.gridContainer}>
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="cash-outline" size={20} color={COLORS.accent} />
              <Text style={styles.cardTitle}>Ingresos</Text>
            </View>
            <Text style={styles.cardValue}>{OVERVIEW_DATA.revenue}</Text>
            <Text style={styles.cardTrendPositive}>+12.5% vs mes anterior</Text>
          </View>

          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="cart-outline" size={20} color={COLORS.primary} />
              <Text style={styles.cardTitle}>Pedidos</Text>
            </View>
            <Text style={styles.cardValue}>{OVERVIEW_DATA.orders}</Text>
            <Text style={styles.cardTrendPositive}>+5 pedidos</Text>
          </View>

          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="eye-outline" size={20} color="#FFD700" />
              <Text style={styles.cardTitle}>Vistas</Text>
            </View>
            <Text style={styles.cardValue}>{OVERVIEW_DATA.views}</Text>
            <Text style={styles.cardTrendNegative}>-2.1% vs mes anterior</Text>
          </View>

          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="flash-outline" size={20} color="#00E676" />
              <Text style={styles.cardTitle}>Conversión</Text>
            </View>
            <Text style={styles.cardValue}>{OVERVIEW_DATA.conversion}</Text>
            <Text style={styles.cardTrendPositive}>+0.4%</Text>
          </View>
        </View>

        {/* SECCIÓN: PRODUCTOS TOP */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Productos más vendidos</Text>
          
          {TOP_PRODUCTS.map((product) => (
            <View key={product.id} style={styles.productRow}>
              <Image source={{ uri: product.image }} style={styles.productImage} />
              <View style={styles.productInfo}>
                <Text style={styles.productName}>{product.name}</Text>
                <Text style={styles.productPrice}>{product.price}</Text>
              </View>
              <View style={styles.productSales}>
                <Text style={styles.salesCount}>{product.sales}</Text>
                <Text style={styles.salesLabel}>ventas</Text>
              </View>
            </View>
          ))}
        </View>

        {/* BOTÓN PARA VER TODOS LOS PEDIDOS */}
        <TouchableOpacity style={styles.viewAllButton}>
          <Text style={styles.viewAllText}>Ver historial de pedidos</Text>
          <Ionicons name="arrow-forward" size={16} color={COLORS.text} />
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
  cardTrendNegative: { color: '#FF2D55', fontSize: 12, fontWeight: '500' }, // Rojo TikTok
  
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
  
  // Botón Ver Todos
  viewAllButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.surface, paddingVertical: 15, borderRadius: 10, borderWidth: 1, borderColor: '#333', marginTop: 10 },
  viewAllText: { color: COLORS.text, fontSize: 16, fontWeight: '600', marginRight: 5 },
});