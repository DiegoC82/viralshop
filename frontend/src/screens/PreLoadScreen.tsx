// frontend/src/screens/PreLoadScreen.tsx
import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import axios from 'axios'; // 👈 IMPORTAMOS AXIOS
import { COLORS } from '../theme/colors';

const BACKEND_URL = 'https://viralshop-xr9v.onrender.com'; // 👈 URL DE TU BACKEND

export default function PreLoadScreen({ navigation }: any) {
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        // 1. Petición real para DESPERTAR a Render y pre-cargar los videos en caché
        const requestPromise = axios.get(`${BACKEND_URL}/videos/feed`);
        
        // 2. Tiempo mínimo de 1.5 segundos para que la animación se vea fluida y no parpadee
        const minDelayPromise = new Promise(resolve => setTimeout(resolve, 1500));

        // Esperamos a que el servidor responda Y que pase el tiempo mínimo
        await Promise.all([requestPromise, minDelayPromise]);

      } catch (error) {
        console.log("Error conectando con el servidor:", error);
      } finally {
        // Una vez que el servidor está listo (despierto y con datos), entramos a la app
        navigation.replace('MainTabs');
      }
    };

    fetchInitialData();
  }, []);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={COLORS.primary} style={styles.loader} />
      <Text style={styles.subtitle}>Buscando ofertas para ti...</Text>
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
    transform: [{ scale: 1.5 }] 
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textMuted,
    fontStyle: 'italic',
    fontWeight: '500'
  }
});