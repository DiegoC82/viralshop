// frontend/src/screens/CheckoutScreen.tsx
import React, { useState } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, 
  TextInput, Alert, ActivityIndicator 
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../theme/colors';

export default function CheckoutScreen({ navigation, route }: any) {
  const insets = useSafeAreaInsets();
  const { planName, price } = route.params;

  const [coupon, setCoupon] = useState('');
  const [discount, setDiscount] = useState(0);
  const [isApplying, setIsApplying] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const finalPrice = Math.max(0, price - discount);

  const applyCoupon = () => {
    setIsApplying(true);
    setTimeout(() => {
      if (coupon.trim().toUpperCase() === "VIRALSHOP") {
        setDiscount(price); // Bonificación 100%
        Alert.alert("¡Cupón Aplicado!", "Has obtenido el Perfil Verificado de forma gratuita.");
      } else {
        Alert.alert("Error", "El cupón no es válido.");
        setDiscount(0);
      }
      setIsApplying(false);
    }, 800);
  };

  const handleFinalPayment = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      Alert.alert("¡Pago Exitoso!", `Ahora eres usuario Verificado.`, [
        { 
          text: "Ir a mi Perfil", 
          onPress: () => {
            // 👇 CORRECCIÓN DE NAVEGACIÓN ANIDADA 👇
            navigation.navigate('MainTabs', { 
              screen: 'Perfil', 
              params: { 
                screen: 'ProfileMain', 
                params: { paymentCompleted: true } 
              } 
            });
          } 
        }
      ]);
    }, 1500);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="close" size={28} color={COLORS.text} /></TouchableOpacity>
        <Text style={styles.headerTitle}>Checkout</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Producto:</Text>
          <Text style={styles.summaryValue}>{planName}</Text>
          <View style={styles.divider} />
          <View style={styles.priceRow}>
            <Text style={styles.priceText}>Subtotal:</Text>
            <Text style={styles.priceText}>${price.toLocaleString()}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>¿Tienes un cupón?</Text>
        <View style={styles.couponRow}>
          <TextInput 
            style={styles.input} 
            placeholder="VIRALSHOP" 
            placeholderTextColor="#555"
            autoCapitalize="characters"
            value={coupon}
            onChangeText={setCoupon}
          />
          <TouchableOpacity style={styles.applyBtn} onPress={applyCoupon} disabled={isApplying}>
            {isApplying ? <ActivityIndicator color="#000" /> : <Text style={styles.applyText}>Aplicar</Text>}
          </TouchableOpacity>
        </View>

        <View style={styles.totalCard}>
          {discount > 0 && (
            <View style={styles.priceRow}>
              <Text style={styles.discountText}>Descuento:</Text>
              <Text style={styles.discountText}>- ${discount.toLocaleString()}</Text>
            </View>
          )}
          <View style={[styles.priceRow, { marginTop: 10 }]}>
            <Text style={styles.totalLabel}>Total:</Text>
            <Text style={styles.totalValue}>${finalPrice.toLocaleString()}</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.payBtnContainer} onPress={handleFinalPayment} disabled={isProcessing}>
          <LinearGradient colors={['#00C6FF', '#0072FF']} style={styles.payBtn}>
            {isProcessing ? <ActivityIndicator color="#FFF" /> : <Text style={styles.payBtnText}>Confirmar Pago</Text>}
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
  headerTitle: { color: COLORS.text, fontSize: 18, fontWeight: 'bold' },
  summaryCard: { backgroundColor: COLORS.surface, padding: 20, borderRadius: 15, marginBottom: 20 },
  summaryLabel: { color: COLORS.textMuted, fontSize: 12 },
  summaryValue: { color: COLORS.text, fontSize: 22, fontWeight: 'bold', marginTop: 5 },
  divider: { height: 1, backgroundColor: '#333', marginVertical: 15 },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between' },
  priceText: { color: COLORS.text, fontSize: 16 },
  sectionTitle: { color: COLORS.text, fontSize: 14, fontWeight: 'bold', marginBottom: 10 },
  couponRow: { flexDirection: 'row', gap: 10, marginBottom: 30 },
  input: { flex: 1, backgroundColor: COLORS.surface, color: COLORS.text, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#333' },
  applyBtn: { backgroundColor: COLORS.accent, paddingHorizontal: 20, borderRadius: 10, justifyContent: 'center' },
  applyText: { color: '#000', fontWeight: 'bold' },
  totalCard: { padding: 20, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 15, marginBottom: 30 },
  discountText: { color: '#4CD964', fontSize: 14, fontWeight: 'bold' },
  totalLabel: { color: COLORS.text, fontSize: 20, fontWeight: 'bold' },
  totalValue: { color: COLORS.accent, fontSize: 24, fontWeight: 'bold' },
  payBtnContainer: { height: 55, borderRadius: 15, overflow: 'hidden' },
  payBtn: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  payBtnText: { color: '#FFF', fontSize: 18, fontWeight: 'bold' }
});