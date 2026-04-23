// frontend/src/screens/VerifiedUpgradeScreen.tsx
import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Image, 
  Dimensions ,
  Alert
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../theme/colors';

const { width } = Dimensions.get('window');

const VERIFIED_OPTIONS = [
  {
    id: 'annual',
    title: 'Verificación Anual.',
    price_total_text: '$10,000 ARS / año',
    price_month_equiv: '(Equivale a $833 ARS / mes)',
    badge: 'MÁS POPULAR',
  }
];

const VERIFIED_FEATURES = [
  { 
    id: 1, 
    icon: 'checkmark-circle', 
    title: 'Insignia Oficial:', 
    desc: 'Obtén el tick de verificación para generar máxima confianza en tus clientes.' 
  },
  { 
    id: 2, 
    icon: 'trending-up', 
    title: 'Prioridad en búsquedas:', 
    desc: 'Tus videos y productos aparecerán en los primeros resultados locales.' 
  },
  { 
    id: 3, 
    icon: 'play-outline', // Icono simulando el de video
    title: 'Hasta 6 videos activos', 
    desc: 'Mantén hasta 6 videos publicados simultáneamente para máxima visibilidad.' 
  },
  { 
    id: 4, 
    icon: 'time-outline', // Cambié el icono por un relojito que queda mejor con el tiempo
    title: 'Videos de hasta 30 segundos', 
    desc: 'Supera el límite estándar y sube videos más largos con calidad optimizada.' 
  },
  { 
    id: 5, 
    icon: 'headset-outline', 
    title: 'Soporte prioritario:', 
    desc: 'Atención directa y rápida por parte de nuestro equipo.' 
  },
];

// 👇 COMPONENTE DE PRUEBA SOCIAL (Basado en tu imagen) 👇
  const SocialProofBadge = () => (
    <View style={styles.socialProofContainer}>
      <View style={styles.avatarsWrapper}>
        <Image source={{ uri: 'https://randomuser.me/api/portraits/men/32.jpg' }} style={[styles.overlapAvatar, { zIndex: 3 }]} />
        <Image source={{ uri: 'https://randomuser.me/api/portraits/women/68.jpg' }} style={[styles.overlapAvatar, { zIndex: 2, marginLeft: -12 }]} />
        <Image source={{ uri: 'https://randomuser.me/api/portraits/women/44.jpg' }} style={[styles.overlapAvatar, { zIndex: 1, marginLeft: -12 }]} />
      </View>
      <View style={styles.socialTextContainer}>
        <Text style={styles.socialTextBold}>+2.400 vendedores activos</Text>
        <Text style={styles.socialTextLight}>que ya publican con ViralShop PRO</Text>
      </View>
      <View style={styles.liveBadge}>
        <View style={styles.liveDot} />
        <Text style={styles.liveText}>LIVE</Text>
      </View>
    </View>
  );

export default function VerifiedUpgradeScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const [selectedOption, setSelectedOption] = useState<string>('annual');

  const FeatureItem = ({ icon, title, desc }: any) => (
    <View style={styles.featureItem}>
      <View style={styles.featureIconContainer}>
        <Ionicons name={icon as any} size={24} color="#1DA1F2" />
      </View>
      <View style={styles.featureTextContainer}>
        <Text style={styles.featureText}><Text style={{fontWeight: 'bold', color: '#FFF'}}>{title}</Text> {desc}</Text>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* HEADER */}
      <View style={styles.header}>
        <View style={styles.paginationDots}>
          {[1,2,3].map(i => (
            <View key={i} style={[styles.dot, i === 1 && styles.activeDot]} />
          ))}
        </View>
        <TouchableOpacity style={styles.closeButton} onPress={() => navigation.goBack()}>
          <Ionicons name="close-outline" size={32} color="#AAA" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 30 }} showsVerticalScrollIndicator={false}>

        <SocialProofBadge />
        
        {/* TITULO Y HERO GRAPHIC */}
        <View style={styles.heroSection}>
          <Text style={styles.mainTitle}>Transmite confianza con tu <Text style={{color: '#1DA1F2'}}>Perfil Verificado</Text>.</Text>
          
          {/* MOCKUP VISUAL */}
          <View style={styles.heroGraphic}>
            <Image 
              source={require('../../assets/verified_profile_mockup.png')} 
              style={styles.mockGraphic} 
              resizeMode="contain" // Para que se adapte perfecto al cuadro
            />
            <View style={styles.floatingCheck}>
              <Ionicons name="checkmark-circle" size={35} color="#1DA1F2" />
            </View>
            <View style={styles.floatingShield}>
              <Ionicons name="shield-checkmark" size={20} color="#FFF" />
            </View>
          </View>
        </View>

        {/* LISTA DE CARACTERÍSTICAS */}
        <View style={styles.featuresList}>
          {VERIFIED_FEATURES.map(f => (
            <FeatureItem key={f.id} {...f} />
          ))}
        </View>

        {/* SECCIÓN DE PRECIOS */}
        <View style={styles.pricingSection}>
          {VERIFIED_OPTIONS.map(option => {
            const isSelected = selectedOption === option.id;
            const hasBadge = option.badge.length > 0;
            return (
              <TouchableOpacity 
                key={option.id} 
                style={[
                  styles.priceCard, 
                  isSelected && styles.priceCardSelected,
                  hasBadge && { marginTop: 25 } 
                ]} 
                onPress={() => setSelectedOption(option.id)}
              >
                {/* CHECKMARK IZQUIERDO */}
                <View style={[styles.radioButton, isSelected && styles.radioButtonSelected]}>
                  {isSelected && <Ionicons name="checkmark-circle" size={24} color="#1DA1F2" />}
                </View>

                {/* TEXTOS CENTRALES */}
                <View style={styles.priceTextGroup}>
                  <Text style={styles.priceTitle}>{option.title}</Text>
                  <Text style={styles.priceTotal}>{option.price_total_text}</Text>
                  {option.price_month_equiv.length > 0 && <Text style={styles.priceMonth}>{option.price_month_equiv}</Text>}
                </View>

                {/* BADGE DE POPULARIDAD */}
                {hasBadge && (
                  <View style={styles.discountBadge}>
                    <Text style={styles.discountText}>{option.badge}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* BOTÓN DE ACCIÓN CON DEGRADADO AZUL */}
        <View style={{ paddingHorizontal: 20, marginTop: 30 }}>
          <TouchableOpacity 
  style={styles.actionButtonContainer}
  onPress={() => {
    navigation.navigate('Checkout', { 
      planName: 'Perfil Verificado', 
      price: 10000 
    });
  }}
>
  <LinearGradient
    colors={['#00C6FF', '#0072FF']}
    style={styles.gradientButton}
  >
    <Text style={styles.actionButtonText}>Obtener Verificación</Text>
  </LinearGradient>
</TouchableOpacity>
        </View>

        {/* ENLACES LEGALES DEL PIE */}
        <View style={styles.footerLinks}>
          <TouchableOpacity><Text style={styles.footerText}>Términos del Servicio</Text></TouchableOpacity>
          <Text style={styles.footerText}> • </Text>
          <TouchableOpacity><Text style={styles.footerText}>Restaurar Compra</Text></TouchableOpacity>
          <Text style={styles.footerText}> • </Text>
          <TouchableOpacity><Text style={styles.footerText}>Política de Privacidad</Text></TouchableOpacity>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 15 },
  paginationDots: { flexDirection: 'row', gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#333' },
  activeDot: { backgroundColor: '#1DA1F2', width: 8, height: 8, borderRadius: 4 },
  closeButton: { padding: 5 },

  heroSection: { alignItems: 'center', paddingHorizontal: 30, marginTop: 10 },
  mainTitle: { color: '#FFF', fontSize: 26, fontWeight: 'bold', textAlign: 'center', lineHeight: 34, marginBottom: 25 },
  heroGraphic: { width: width * 0.7, height: 200, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  mockGraphic: { width: '100%', height: '100%', borderRadius: 20, borderWidth: 1, borderColor: '#1DA1F2' },
  floatingCheck: { position: 'absolute', top: -15, right: -15, backgroundColor: '#FFF', borderRadius: 20, padding: 2 },
  floatingShield: { position: 'absolute', bottom: -10, left: -10, backgroundColor: '#1DA1F2', padding: 10, borderRadius: 20 },

  // Estilos del Badge Social Proof
  socialProofContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1A1A24', paddingVertical: 10, paddingHorizontal: 15, borderRadius: 25, marginBottom: 25, borderWidth: 1, borderColor: '#2A2A35' },
  avatarsWrapper: { flexDirection: 'row', marginRight: 10 },
  overlapAvatar: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: '#1A1A24' },
  socialTextContainer: { flex: 1, marginRight: 10 },
  socialTextBold: { color: '#FFF', fontSize: 13, fontWeight: 'bold' },
  socialTextLight: { color: '#AAA', fontSize: 11 },
  liveBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(46, 213, 115, 0.2)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#2ed573', marginRight: 4 },
  liveText: { color: '#2ed573', fontSize: 10, fontWeight: 'bold' },

  featuresList: { paddingHorizontal: 20, marginTop: 10 },
  featureItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, padding: 15, borderRadius: 12, borderWidth: 1, borderColor: '#333', marginBottom: 10 },
  featureIconContainer: { width: 45, height: 45, borderRadius: 10, backgroundColor: '#1A2235', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  featureTextContainer: { flex: 1 },
  featureText: { color: COLORS.textMuted, fontSize: 13, lineHeight: 18 },

  pricingSection: { paddingHorizontal: 20, marginTop: 20 },
  priceCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, padding: 15, paddingVertical: 20, borderRadius: 12, borderWidth: 1, borderColor: '#333', marginBottom: 15, position: 'relative' },
  priceCardSelected: { borderColor: '#1DA1F2', borderWidth: 2 },
  radioButton: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: '#555', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  radioButtonSelected: { borderColor: '#1DA1F2', backgroundColor: '#1A2235' },
  priceTextGroup: { flex: 1 },
  priceTitle: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  priceTotal: { color: COLORS.text, fontSize: 13, marginTop: 4 },
  priceMonth: { color: COLORS.textMuted, fontSize: 11, marginTop: 2, fontWeight: '500' },
  
  discountBadge: { position: 'absolute', top: -12, right: 15, backgroundColor: '#1DA1F2', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 15, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: COLORS.background },
  discountText: { color: '#FFF', fontSize: 10, fontWeight: 'bold' },

  actionButtonContainer: { height: 55, borderRadius: 12, overflow: 'hidden' },
  gradientButton: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  actionButtonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },

  footerLinks: { flexDirection: 'row', justifyContent: 'center', paddingHorizontal: 30, marginTop: 25, flexWrap: 'wrap' },
  footerText: { color: COLORS.textMuted, fontSize: 10, marginTop: 5 }
});