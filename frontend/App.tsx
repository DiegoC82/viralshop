// frontend/App.tsx
import React, { useCallback, useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Image, Dimensions, StatusBar, Animated } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { Ionicons } from '@expo/vector-icons';

// Importaciones de tus pantallas y colores
import AuthScreen from './src/screens/AuthScreen';
import InterestsScreen from './src/screens/InterestsScreen';
import MainTabs from './src/navigation/MainTabs';
import SingleVideoScreen from './src/screens/SingleVideoScreen';
import SalesMetricsScreen from './src/screens/SalesMetricsScreen';
import ChatDetailsScreen from './src/screens/ChatDetailsScreen'; // Asegúrate de ajustar la ruta
import { COLORS } from './src/theme/colors';

const { width, height } = Dimensions.get('window');
const Stack = createNativeStackNavigator();

// Mantenemos la Splash Screen nativa visible
SplashScreen.preventAutoHideAsync();

export default function App() {
  const [appIsReady, setAppIsReady] = useState(false);
  // 👇 NUEVO: Animación para que los iconos aparezcan/desaparezcan 👇
  const iconOpacity = useRef(new Animated.Value(0.03)).current; 

  useEffect(() => {
    // 👇 NUEVO: Configuración de la animación 👇
    Animated.loop(
      Animated.sequence([
        Animated.timing(iconOpacity, { toValue: 0.15, duration: 2500, useNativeDriver: true }),
        Animated.timing(iconOpacity, { toValue: 0.03, duration: 2500, useNativeDriver: true }),
      ])
    ).start();

    async function prepare() {
      try {
        // 👇 1. QUITAMOS LA PANTALLA BLANCA NATIVA INMEDIATAMENTE 👇
        await SplashScreen.hideAsync();
        
        // --- AQUÍ SIMULAMOS EL TIEMPO DE CARGA ---
        // 👇 3. AUMENTAMOS LA DURACIÓN A 4 SEGUNDOS 👇
        await new Promise(resolve => setTimeout(resolve, 3500)); 
      } catch (e) {
        console.warn(e);
      } finally {
        setAppIsReady(true);
      }
    }

    prepare();
  }, []);

  if (!appIsReady) {
    // 👇 DISEÑO DE TU SPLASH SCREEN PERSONALIZADA 👇
    return (
      <View style={styles.splashContainer}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.backgroundSplash} />
        
        {/* 👇 2. FONDOS FLOTANTES DE COMPRAS (con animación de opacidad) 👇 */}
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: iconOpacity }]}>
          <Ionicons name="cart-outline" size={24} color="#FFF" style={{position: 'absolute', top: height * 0.15, left: width * 0.1}} />
          <Ionicons name="pricetag-outline" size={20} color="#FFF" style={{position: 'absolute', top: height * 0.25, right: width * 0.15}} />
          <Ionicons name="bag-handle-outline" size={24} color="#FFF" style={{position: 'absolute', bottom: height * 0.2, left: width * 0.2}} />
          <Ionicons name="cart-outline" size={20} color="#FFF" style={{position: 'absolute', top: height * 0.45, left: width * 0.05}} />
          <Ionicons name="pricetag-outline" size={24} color="#FFF" style={{position: 'absolute', bottom: height * 0.35, right: width * 0.1}} />
        </Animated.View>

        {/* Contenedor Central (Logo + Frase cerca) */}
        <View style={styles.centralContent}>
          <Image 
            source={require('./assets/logo.png')} // Asegúrate de tener el logo.png en assets
            style={styles.logoImage} 
          />
          <Text style={styles.splashPhrase}>
            Tu Próxima Compra Segura
          </Text>
        </View>
      </View>
    );
  }

  // 👇 CUANDO CARGA, MOSTRAMOS TU NAVEGACIÓN REAL (CORREGIDA) 👇
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator 
          initialRouteName="Auth" 
          screenOptions={{ headerShown: false }} 
        >
          <Stack.Screen name="Auth" component={AuthScreen} />
          <Stack.Screen name="Interests" component={InterestsScreen} />
          <Stack.Screen name="MainTabs" component={MainTabs} /> 
          <Stack.Screen name="SingleVideo" component={SingleVideoScreen} />
          <Stack.Screen name="ChatDetails" component={ChatDetailsScreen} options={{ headerShown: false }} />
          <Stack.Screen name="SalesMetrics" component={SalesMetricsScreen} options={{ headerShown: false }} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  splashContainer: { 
    flex: 1, 
    backgroundColor: COLORS.backgroundSplash, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  centralContent: {
    alignItems: 'center',
    // 👇 SUBIMOS EL BLOQUE CENTRAL: Ubicación alta y moderna 👇
    marginTop: -160, 
  },
  logoImage: {
    // 👇 ¡SÚPER ANCHO FORZADO! Ignoramos márgenes transparentes 👇
    // Aumentado drásticamente de 380 a 480 para que el neón "pase" las letras.
    width: 580, 
    height: 340, // Altura ajustada proporcionalmente
    resizeMode: 'contain',
    marginBottom: 1, // Muy cerca de la frase
  },
  splashPhrase: {
    color: '#FFFFFF', 
    fontSize: 18, // Mantenemos tamaño de fuente profesional
    fontWeight: '600',
    letterSpacing: 0.5, 
    opacity: 0.9, 
    // 👇 Añadimos un pequeño margen para equilibrar visualmente 👇
    marginTop: -55,
  },
});