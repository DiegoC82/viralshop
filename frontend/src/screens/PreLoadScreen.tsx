// frontend/src/screens/PreLoadScreen.tsx
import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { COLORS } from '../theme/colors';

export default function PreLoadScreen({ navigation }: any) {
  useEffect(() => {
    const fetchInitialData = async () => {
      // Aquí es donde en el futuro haremos el 'fetch' de los videos de Prisma.
      // Por ahora, simulamos 2.5 segundos de carga de datos.
      await new Promise(resolve => setTimeout(resolve, 2500));
      
      // Una vez que los datos "cargaron", entramos a la app usando 'replace' 
      // para que el usuario no pueda volver atrás a esta pantalla cargando.
      navigation.replace('MainTabs');
    };

    fetchInitialData();
  }, []);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={COLORS.primary} style={styles.loader} />
      <Text style={styles.subtitle}>Preparando ofertas para ti...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loader: {
    marginBottom: 20,
    transform: [{ scale: 1.5 }] // Hace el circulito un poco más grande
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textMuted,
    fontStyle: 'italic',
    fontWeight: '500'
  }
});