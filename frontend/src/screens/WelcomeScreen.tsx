// frontend/src/screens/WelcomeScreen.tsx
import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, StatusBar } from 'react-native';
import { COLORS } from '../theme/colors';

// Recibimos 'navigation' para poder cambiar de pantalla
export default function WelcomeScreen({ navigation }: any) {
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
      <View style={styles.header}>
        <Text style={styles.title}>ViralShop</Text>
        <Text style={styles.subtitle}>Descubre. Comparte. Compra.</Text>
      </View>
      <TouchableOpacity 
        style={styles.button}
        // Al presionar, viajamos a la pantalla de Intereses
        onPress={() => navigation.navigate('Interests')}
      >
        <Text style={styles.buttonText}>Comenzar</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'space-around',
    padding: 20,
  },
  header: { alignItems: 'center' },
  title: {
    fontSize: 48,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 10,
  },
  subtitle: { fontSize: 18, color: COLORS.textMuted },
  button: {
    backgroundColor: COLORS.accent,
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 30,
    width: '100%',
    alignItems: 'center',
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  buttonText: { color: '#000000', fontSize: 18, fontWeight: 'bold' },
});