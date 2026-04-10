// frontend/src/navigation/MainTabs.tsx
import React from 'react';
import { View } from 'react-native';
import { Alert } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';

// Importamos todas nuestras pantallas
import FeedScreen from '../screens/FeedScreen';
import SearchScreen from '../screens/SearchScreen';
import UploadScreen from '../screens/UploadScreen';
import MessagesScreen from '../screens/MessagesScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Tab = createBottomTabNavigator();

export default function MainTabs() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();

  // 👇 FUNCIÓN PARA BLOQUEAR SOLO SUBIR Y MENSAJES 👇
  const requireAuth = async (e: any) => {
    const token = await AsyncStorage.getItem('userToken');
    
    if (!token) {
      e.preventDefault(); // Frena la navegación a esa pestaña
      
      Alert.alert(
        "¡Modo Invitado! 👀",
        "Crea una cuenta gratuita para subir videos o enviar mensajes a otros creadores.",
        [
          { text: "Seguir explorando", style: "cancel" },
          { text: "Unirme a ViralShop", onPress: () => navigation.navigate('Auth') }
        ]
      );
    }
  };

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: COLORS.background,
          borderTopColor: COLORS.primary,
          borderTopWidth: 1,
          height: 60 + insets.bottom,
          paddingBottom: insets.bottom,
          paddingTop: 8,
          position: 'absolute', 
        },
        tabBarActiveTintColor: COLORS.text, 
        tabBarInactiveTintColor: COLORS.textMuted, 
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'home';
          
          if (route.name === 'Inicio') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Buscar') {
            iconName = focused ? 'search' : 'search-outline';
          } else if (route.name === 'Subir') {
            iconName = focused ? 'add-circle' : 'add-circle-outline';
            return (
              <View style={{ top: -7, left: -2, width: 36, height: 37,backgroundColor: COLORS.background, borderRadius: 30 }}>
                <Ionicons name={iconName} size={40} color={COLORS.accent} />
              </View>
            );
          } else if (route.name === 'Mensajes') {
            iconName = focused ? 'chatbubble-ellipses' : 'chatbubble-ellipses-outline';
          } else if (route.name === 'Perfil') {
            iconName = focused ? 'person' : 'person-outline';
          }
          
          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Inicio" component={FeedScreen} />
      <Tab.Screen 
        name="Buscar" 
        component={SearchScreen} 
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="search" size={size} color={color} />
          ),
          tabBarLabel: 'Buscar'
        }}
      />
      
      {/* 👇 Candado en Subir y Mensajes 👇 */}
      <Tab.Screen name="Subir" component={UploadScreen} listeners={{ tabPress: requireAuth }} />
      <Tab.Screen name="Mensajes" component={MessagesScreen} listeners={{ tabPress: requireAuth }} />
      
      {/* 👇 Perfil SIN candado, dejamos que el usuario entre y vea la sorpresa 👇 */}
      <Tab.Screen name="Perfil" component={ProfileScreen} />
    </Tab.Navigator>
  );
}