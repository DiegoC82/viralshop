// frontend/src/screens/AuthScreen.tsx
import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import axios from 'axios'; // Importamos el cartero
import { COLORS } from '../theme/colors';
import AsyncStorage from '@react-native-async-storage/async-storage';

// 👇 REEMPLAZA ESTO CON LA IP DE TU COMPUTADORA 👇
const BACKEND_URL = 'http://192.168.100.107:3000/auth'; 

export default function AuthScreen({ navigation }: any) {
  const [isLogin, setIsLogin] = useState(true);
  
  // Estados para guardar lo que escribe el usuario
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // La función maestra que se comunica con NestJS
  const handleAuthentication = async () => {
    try {
      if (isLogin) {
        const response = await axios.post(`${BACKEND_URL}/login`, { email, password });
        
        // ¡GUARDAMOS EL TOKEN EN EL CELULAR!
        await AsyncStorage.setItem('userToken', response.data.token); 
        
        Alert.alert("¡Éxito!", response.data.message);
        navigation.navigate('Interests'); 
        
      } else {
        const response = await axios.post(`${BACKEND_URL}/register`, { name, username, email, password });
        
        // ¡TAMBIÉN LO GUARDAMOS AL REGISTRARSE!
        await AsyncStorage.setItem('userToken', response.data.token);
        
        Alert.alert("¡Cuenta Creada!", response.data.message);
        navigation.navigate('Interests'); // Viajamos directo a la app sin pedir login extra
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || "Ocurrió un error de conexión";
      Alert.alert("Error", errorMessage);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={styles.title}>ViralShop</Text>
        <Text style={styles.subtitle}>{isLogin ? 'Bienvenido de nuevo' : 'Crea tu cuenta para empezar'}</Text>
      </View>

      <View style={styles.formContainer}>
        {!isLogin && (
          <>
            <TextInput 
              style={styles.input} 
              placeholder="Nombre completo" 
              placeholderTextColor={COLORS.textMuted}
              value={name}
              onChangeText={setName} // Guardamos el texto
            />
            <TextInput 
              style={styles.input} 
              placeholder="Nombre de usuario (@usuario)" 
              placeholderTextColor={COLORS.textMuted} 
              autoCapitalize="none"
              value={username}
              onChangeText={setUsername}
            />
          </>
        )}

        <TextInput 
          style={styles.input} 
          placeholder="Correo electrónico" 
          placeholderTextColor={COLORS.textMuted} 
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput 
          style={styles.input} 
          placeholder="Contraseña" 
          placeholderTextColor={COLORS.textMuted} 
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        {/* Conectamos el botón a nuestra función maestra */}
        <TouchableOpacity style={styles.mainButton} onPress={handleAuthentication}>
          <Text style={styles.mainButtonText}>
            {isLogin ? 'Iniciar Sesión' : 'Registrarse'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setIsLogin(!isLogin)} style={styles.switchButton}>
          <Text style={styles.switchText}>
            {isLogin ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Inicia Sesión'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('Interests')} style={styles.skipButton}>
          <Text style={styles.skipText}>Saltar por ahora (Modo Prueba)</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, padding: 20, justifyContent: 'center' },
  headerContainer: { alignItems: 'center', marginBottom: 50 },
  title: { fontSize: 48, fontWeight: 'bold', color: COLORS.primary, marginBottom: 10 },
  subtitle: { fontSize: 18, color: COLORS.textMuted },
  formContainer: { width: '100%' },
  input: { backgroundColor: COLORS.surface, color: COLORS.text, padding: 15, borderRadius: 10, marginBottom: 15, borderWidth: 1, borderColor: '#333', fontSize: 16 },
  mainButton: { backgroundColor: COLORS.accent, padding: 15, borderRadius: 10, alignItems: 'center', marginTop: 10, shadowColor: COLORS.accent, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 5, elevation: 8 },
  mainButtonText: { color: '#000', fontSize: 18, fontWeight: 'bold' },
  switchButton: { marginTop: 20, alignItems: 'center' },
  switchText: { color: COLORS.primary, fontSize: 16, fontWeight: '600' },
  skipButton: { marginTop: 40, alignItems: 'center' },
  skipText: { color: COLORS.textMuted, fontSize: 14, textDecorationLine: 'underline' },
});