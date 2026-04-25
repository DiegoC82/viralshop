// frontend/App.tsx
import React, { useCallback,  useEffect, useState, useRef } from 'react';
import 'react-native-gesture-handler';
import * as NavigationBar from 'expo-navigation-bar';
import Constants from 'expo-constants';
import { Platform } from 'react-native'; // Asegúrate de que Platform esté importado de 'react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as Notifications from 'expo-notifications';
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
import SalesMetricsScreen from './src/screens/SalesMetricsScreen';
import ChatDetailsScreen from './src/screens/ChatDetailsScreen'; // Asegúrate de ajustar la ruta
import AsyncStorage from '@react-native-async-storage/async-storage';
import PreLoadScreen from './src/screens/PreLoadScreen';
import MapSearchScreen from './src/screens/MapSearchScreen';
import ProUpgradeScreen from './src/screens/ProUpgradeScreen'; // Asegúrate de ajustar la ruta
import UploadScreen from './src/screens/UploadScreen';
import VerifiedUpgradeScreen from './src/screens/VerifiedUpgradeScreen';
import UploadRemateScreen from './src/screens/UploadRemateScreen';
import CheckoutScreen from './src/screens/CheckoutScreen';
import axios from 'axios';
import AdultFeedScreen from './src/screens/AdultFeedScreen'; // Asegúrate de ajustar la ruta   
import { CurrencyProvider } from './src/context/CurrencyContext';
import { COLORS } from './src/theme/colors';

// 👇 2. AGREGAR ESTA ANTENA GLOBAL AQUÍ AFUERA 👇
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true, // 👈 Agregado para que muestre el cartelito flotante
    shouldShowList: true,   // 👈 Agregado para que quede en el historial
  }),
});

const { width, height } = Dimensions.get('window');
const Stack = createNativeStackNavigator();

// Mantenemos la Splash Screen nativa visible
SplashScreen.preventAutoHideAsync();

export default function App() {
  const [appIsReady, setAppIsReady] = useState(false);
  const [initialRoute, setInitialRoute] = useState('Auth'); // 👇 ESTADO PARA SABER A DÓNDE IR
  const iconOpacity = useRef(new Animated.Value(0.03)).current; 

  // 👇 AGREGA ESTE BLOQUE EXACTAMENTE AQUÍ (Latido automático) 👇
  useEffect(() => {
    const pingServer = async () => {
      const token = await AsyncStorage.getItem('userToken');
      if (token) {
        axios.patch('https://viralshop-xr9v.onrender.com/users/active', {}, { 
          headers: { Authorization: `Bearer ${token}` } 
        }).catch(() => null);
      }
    };
    
    pingServer(); // Avisa apenas abres la app
    const heartbeat = setInterval(pingServer, 60000); // Avisa cada 1 minuto
    
    return () => clearInterval(heartbeat);
  }, []);

  useEffect(() => {
    const splashAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(iconOpacity, { toValue: 0.15, duration: 2500, useNativeDriver: true }),
        Animated.timing(iconOpacity, { toValue: 0.03, duration: 2500, useNativeDriver: true }),
      ])
    );
    splashAnimation.start();

    async function prepare() {
      try {
        // 👇 1. FORZAMOS A ANDROID A OCULTAR LA BARRA INFERIOR 👇
        if (Platform.OS === 'android') {
          await NavigationBar.setVisibilityAsync("hidden");
        }

        await SplashScreen.hideAsync();
        
        // 👇 MAGIA DE AUTO-LOGIN: Revisamos si ya hay un usuario guardado
        const token = await AsyncStorage.getItem('userToken');
        if (token) {
          setInitialRoute('PreLoad'); // Si tiene sesión, va directo a cargar las ofertas
        } else {
          setInitialRoute('Auth'); // Si es nuevo, va a registrarse
        }
        
        // Mantenemos tus 3.5 segundos de presentación hermosa
        await new Promise(resolve => setTimeout(resolve, 3500)); 
      } catch (e) {
        console.warn(e);
      } finally {
        splashAnimation.stop(); // 🛑 DETENEMOS LA ANIMACIÓN ANTES DE DESMONTAR PARA EVITAR CRASH NATIVO
        setAppIsReady(true);
      }
    }

    prepare();

    return () => splashAnimation.stop(); // 🧹 Limpieza por si acaso el componente se desmonta
  }, []);

  if (!appIsReady) {
    return (
      <View style={styles.splashContainer}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.backgroundSplash} />
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: iconOpacity }]}>
          <Ionicons name="cart-outline" size={24} color="#FFF" style={{position: 'absolute', top: height * 0.15, left: width * 0.1}} />
          <Ionicons name="pricetag-outline" size={20} color="#FFF" style={{position: 'absolute', top: height * 0.25, right: width * 0.15}} />
          <Ionicons name="bag-handle-outline" size={24} color="#FFF" style={{position: 'absolute', bottom: height * 0.2, left: width * 0.2}} />
          <Ionicons name="cart-outline" size={20} color="#FFF" style={{position: 'absolute', top: height * 0.45, left: width * 0.05}} />
          <Ionicons name="pricetag-outline" size={24} color="#FFF" style={{position: 'absolute', bottom: height * 0.35, right: width * 0.1}} />
        </Animated.View>

        <View style={styles.centralContent}>
          <Image source={require('./assets/logo.png')} style={styles.logoImage} />
          <Text style={styles.splashPhrase}>Tu Próxima Compra Segura</Text>
          <Text style={styles.versionText}>
            v{Constants.expoConfig?.version}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <CurrencyProvider>
          <NavigationContainer>
            <Stack.Navigator 
             initialRouteName={initialRoute} 
             screenOptions={{ headerShown: false }} 
           >
             <Stack.Screen name="Auth" component={AuthScreen} />
             <Stack.Screen name="Interests" component={InterestsScreen} />
             <Stack.Screen name="PreLoad" component={PreLoadScreen} /> 
             <Stack.Screen name="MainTabs" component={MainTabs} /> 
             <Stack.Screen name="MapSearch" component={MapSearchScreen} />
             <Stack.Screen name="ChatDetails" component={ChatDetailsScreen} />
             <Stack.Screen name="SalesMetrics" component={SalesMetricsScreen} />
             <Stack.Screen name="ProUpgrade" component={ProUpgradeScreen} />
             <Stack.Screen name="VerifiedUpgrade" component={VerifiedUpgradeScreen} />
             <Stack.Screen name="Checkout" component={CheckoutScreen} />
             <Stack.Screen name="Upload" component={UploadScreen} />
             <Stack.Screen name="UploadRemate" component={UploadRemateScreen} />
             <Stack.Screen name="AdultFeed" component={AdultFeedScreen} />
           </Stack.Navigator>
          </NavigationContainer>
        </CurrencyProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
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
    marginTop: -35,
  },
  versionText: {
    color: 'rgba(255, 255, 255, 0.4)', // Blanco semitransparente para que no resalte de más
    fontSize: 11,                       // Tamaño pequeño y sutil
    marginTop: 8,                       // Separación justa con la frase principal
    letterSpacing: 1.5,                 // Letras apenas separadas (da un toque premium)
    fontWeight: '400',
  },
});