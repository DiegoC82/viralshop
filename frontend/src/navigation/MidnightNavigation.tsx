// frontend/src/navigation/MidnightNavigation.tsx
import React from 'react';
import { View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import AdultFeedScreen from '../screens/AdultFeedScreen';
import AdultDownloadsScreen from '../screens/AdultDownloadsScreen';
import AdultSearchScreen from '../screens/AdultSearchScreen';
import AdultProfileScreen from '../screens/AdultProfileScreen';
import AdultMessagesScreen from '../screens/AdultMessagesScreen'; // 👈 IMPORTANTE: Agregamos la pantalla

const Tab = createBottomTabNavigator();

export default function MidnightNavigation() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#0A0514', 
          borderTopColor: '#b829db',  
          borderTopWidth: 0.5,
          paddingTop: 8,
          height: 60, 
        },
        tabBarActiveTintColor: '#b829db', 
        tabBarInactiveTintColor: '#555',
      }}
    >
      <Tab.Screen 
        name="Feed" 
        component={AdultFeedScreen} 
        options={{ tabBarIcon: ({ color }) => <Ionicons name="moon" size={24} color={color} />, tabBarLabel: 'Inicio' }}
      />
      
      <Tab.Screen 
        name="Buscar" 
        component={AdultSearchScreen} 
        options={{ tabBarIcon: ({ color }) => <Ionicons name="search" size={24} color={color} />, tabBarLabel: 'Buscar' }}
      />
      
      <Tab.Screen 
        name="Descargas" 
        component={AdultDownloadsScreen} 
        options={{ 
          tabBarIcon: ({ focused }) => (
            <View style={{ 
              top: -15, 
              width: 54, 
              height: 54, 
              backgroundColor: '#0A0514', 
              borderRadius: 27, 
              justifyContent: 'center', 
              alignItems: 'center', 
              borderWidth: 3, 
              borderColor: focused ? '#b829db' : '#333' 
            }}>
              <Ionicons name="cloud-download" size={26} color={focused ? '#b829db' : '#555'} />
            </View>
          ), 
          tabBarLabel: 'Descargas' 
        }}
      />
      
      {/* 👇 AHORA SÍ CONECTA A LA PANTALLA REAL 👇 */}
      <Tab.Screen 
        name="Mensajes" 
        component={AdultMessagesScreen} 
        options={{ tabBarIcon: ({ color }) => <Ionicons name="chatbubbles" size={24} color={color} />, tabBarLabel: 'Mensajes' }}
      />
      
      <Tab.Screen 
        name="Perfil" 
        component={AdultProfileScreen} 
        options={{ tabBarIcon: ({ color }) => <Ionicons name="person" size={24} color={color} />, tabBarLabel: 'Perfil' }}
      />
    </Tab.Navigator>
  );
}