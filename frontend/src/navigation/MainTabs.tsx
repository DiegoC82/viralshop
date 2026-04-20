// frontend/src/navigation/MainTabs.tsx
import React from 'react';
import { View, Alert, Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'; // 👈 Agregamos MaterialCommunityIcons
import { COLORS } from '../theme/colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';

// Importamos todas nuestras pantallas
import FeedScreen from '../screens/FeedScreen';
import SearchScreen from '../screens/SearchScreen';
import RemateScreen from '../screens/RemateScreen';
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
          } else if (route.name === 'Remates') {
            iconName = focused ? 'add-circle' : 'add-circle-outline';
            return (
              <View style={{ top: -6, left: -2, width: 36, height: 37,backgroundColor: COLORS.background, borderRadius: 30 }}>
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
      
      {/* 👇 Pestaña de Remates con Ícono Compuesto (Martillo de Juez + Moneda) 👇 */}
      <Tab.Screen 
        name="Remates" 
        component={RemateScreen} 
        options={{
          tabBarIcon: ({ focused }) => (
            <View style={{ 
              top: -10, 
              width: 50, 
              height: 50, 
              backgroundColor: COLORS.background, 
              borderRadius: 25, 
              justifyContent: 'center', 
              alignItems: 'center',
              borderWidth: 3,
              borderColor: focused ? COLORS.accent : '#333' 
            }}>

              {/* 2. El Martillo del Juez (Arriba a la derecha, inclinado) */}
              <MaterialCommunityIcons
                name="gavel"
                size={28}
                color={focused ? COLORS.accent : COLORS.textMuted}
                style={{ 
                  position: 'absolute', 
                  top: 2, 
                  right: 2, 
                  transform: [{ scaleX: -1 }, { rotate: '-15deg' }] // Lo inclinamos un poco
                }}
              />
              
              {/* 1. La Moneda (Abajo a la izquierda) */}
              <View style={{ 
                position: 'absolute', 
                bottom: 5, 
                left: 6, 
                backgroundColor: focused ? COLORS.accent : COLORS.textMuted, // Dorada si está activa
                borderRadius: 10, 
                width: 20, 
                height: 20, 
                justifyContent: 'center', 
                alignItems: 'center' 
              }}>
                <Text style={{ color: '#000', fontSize: 12, fontWeight: 'bold' }}>$</Text>
              </View>

            </View>
          ),
          tabBarLabel: 'Remate'
        }} 
      />
      <Tab.Screen name="Mensajes" component={MessagesScreen} listeners={{ tabPress: requireAuth }} />
      
      {/* 👇 Perfil SIN candado, dejamos que el usuario entre y vea la sorpresa 👇 */}
      <Tab.Screen name="Perfil" component={ProfileScreen} />
    </Tab.Navigator>
  );
}