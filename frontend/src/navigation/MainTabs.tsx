// frontend/src/navigation/MainTabs.tsx
import React from 'react';
import { View, Alert, Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack'; // 👈 Importamos
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';

import FeedScreen from '../screens/FeedScreen';
import SearchScreen from '../screens/SearchScreen';
import RemateScreen from '../screens/RemateScreen';
import MessagesScreen from '../screens/MessagesScreen';
import ProfileScreen from '../screens/ProfileScreen';
import PublicProfileScreen from '../screens/PublicProfileScreen';
import SingleVideoScreen from '../screens/SingleVideoScreen';

const Tab = createBottomTabNavigator();
const HomeStack = createNativeStackNavigator();
const SearchStack = createNativeStackNavigator();
const ProfileStack = createNativeStackNavigator(); // 👈 NUEVO: Stack para tu Perfil

// 1. STACK PARA INICIO
function HomeStackScreen() {
  return (
    <HomeStack.Navigator screenOptions={{ headerShown: false }}>
      <HomeStack.Screen name="Feed" component={FeedScreen} />
      <HomeStack.Screen name="PublicProfile" component={PublicProfileScreen} />
      <HomeStack.Screen name="SingleVideo" component={SingleVideoScreen} /> 
    </HomeStack.Navigator>
  );
}

// 2. STACK PARA BUSCAR
function SearchStackScreen() {
  return (
    <SearchStack.Navigator screenOptions={{ headerShown: false }}>
      <SearchStack.Screen name="SearchMain" component={SearchScreen} />
      <SearchStack.Screen name="PublicProfile" component={PublicProfileScreen} />
      <SearchStack.Screen name="SingleVideo" component={SingleVideoScreen} />
    </SearchStack.Navigator>
  );
}

// 👇 3. NUEVO: STACK PARA TU PERFIL 👇
function ProfileStackScreen() {
  return (
    <ProfileStack.Navigator screenOptions={{ headerShown: false }}>
      <ProfileStack.Screen name="ProfileMain" component={ProfileScreen} />
      <ProfileStack.Screen name="SingleVideo" component={SingleVideoScreen} />
      <ProfileStack.Screen name="PublicProfile" component={PublicProfileScreen} />
    </ProfileStack.Navigator>
  );
}

export default function MainTabs() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();

  const requireAuth = async (e: any) => {
    const token = await AsyncStorage.getItem('userToken');
    if (!token) {
      e.preventDefault();
      Alert.alert("¡Modo Invitado!", "Inicia sesión para interactuar.", [
        { text: "Seguir explorando", style: "cancel" },
        { text: "Unirme", onPress: () => navigation.navigate('Auth') }
      ]);
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
      })}
    >
      <Tab.Screen 
        name="Inicio" 
        component={HomeStackScreen} 
        options={{
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons name={focused ? 'home' : 'home-outline'} size={size} color={color} />
          )
        }}
      />
      
      <Tab.Screen 
        name="Buscar" 
        component={SearchStackScreen} 
        options={{
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons name={focused ? 'search' : 'search-outline'} size={size} color={color} />
          )
        }}
      />
      
      <Tab.Screen 
        name="Remates" 
        component={RemateScreen} 
        options={{
          tabBarIcon: ({ focused }) => (
            <View style={{ top: -10, width: 50, height: 50, backgroundColor: COLORS.background, borderRadius: 25, justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: focused ? COLORS.accent : '#333' }}>
              <MaterialCommunityIcons name="gavel" size={28} color={focused ? COLORS.accent : COLORS.textMuted} style={{ position: 'absolute', top: 2, right: 2, transform: [{ scaleX: -1 }, { rotate: '-15deg' }] }} />
              <View style={{ position: 'absolute', bottom: 5, left: 6, backgroundColor: focused ? COLORS.accent : COLORS.textMuted, borderRadius: 10, width: 20, height: 20, justifyContent: 'center', alignItems: 'center' }}><Text style={{ color: '#000', fontSize: 12, fontWeight: 'bold' }}>$</Text></View>
            </View>
          ),
          tabBarLabel: 'Remate'
        }}
      />
      
      <Tab.Screen 
        name="Mensajes" 
        component={MessagesScreen} 
        listeners={{ tabPress: requireAuth }} 
        options={{
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons name={focused ? 'chatbubble-ellipses' : 'chatbubble-ellipses-outline'} size={size} color={color} />
          )
        }}
      />
      
      {/* 👇 AHORA USA SU PROPIO STACK 👇 */}
      <Tab.Screen 
        name="Perfil" 
        component={ProfileStackScreen} 
        options={{
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons name={focused ? 'person' : 'person-outline'} size={size} color={color} />
          )
        }}
      />
    </Tab.Navigator>
  );
}