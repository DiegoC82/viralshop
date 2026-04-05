import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// 1. Importamos la nueva pantalla
import AuthScreen from './src/screens/AuthScreen';
import InterestsScreen from './src/screens/InterestsScreen';
import MainTabs from './src/navigation/MainTabs';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator 
          initialRouteName="Auth" // 2. La app arranca aquí ahora
          screenOptions={{ headerShown: false }} 
        >
          {/* 3. Registramos la pantalla */}
          <Stack.Screen name="Auth" component={AuthScreen} />
          <Stack.Screen name="Interests" component={InterestsScreen} />
          <Stack.Screen name="MainTabs" component={MainTabs} /> 
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}