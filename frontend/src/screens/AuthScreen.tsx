// frontend/src/screens/AuthScreen.tsx
import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, Alert, Image, ScrollView } from 'react-native';
import axios from 'axios'; 
import { COLORS } from '../theme/colors';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BACKEND_URL = 'https://viralshop-xr9v.onrender.com'; 

export default function AuthScreen({ navigation }: any) {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleAuthentication = async () => {
    try {
      const endpoint = isLogin ? '/auth/login' : '/auth/register';
      const payload = isLogin ? { email, password } : { name, username, email, password };
      
      const response = await axios.post(`${BACKEND_URL}${endpoint}`, payload);
      await AsyncStorage.setItem('userToken', response.data.token); 
      
      navigation.navigate('MainTabs'); 
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || "Error de conexión";
      Alert.alert("Atención", errorMessage);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.formContainer}>
          
          <Image source={require('../../assets/logo.png')} style={styles.logoImage} />

          <Text style={styles.subtitle}>
            {isLogin ? 'Bienvenido de nuevo' : 'Crea tu cuenta para empezar'}
          </Text>

          {!isLogin && (
            <>
              <TextInput 
                style={styles.input} 
                placeholder="Nombre completo" 
                placeholderTextColor={COLORS.textMuted}
                value={name}
                onChangeText={setName} 
              />
              <TextInput 
                style={styles.input} 
                placeholder="Nombre de usuario" 
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

          <TouchableOpacity style={styles.mainButton} onPress={handleAuthentication}>
            <Text style={styles.mainButtonText}>
              {isLogin ? 'Iniciar Sesión' : 'Registrarse'}
            </Text>
          </TouchableOpacity>

          {/* 👇 BOTÓN DE INVITADO: Transparente y elegante 👇 */}
          <TouchableOpacity 
            style={styles.guestButton} 
            onPress={async () => {
              await AsyncStorage.removeItem('userToken'); // Limpiamos cualquier token viejo
              navigation.navigate('MainTabs');
            }}
          >
            <Text style={styles.guestButtonText}>Explorar como invitado</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setIsLogin(!isLogin)} style={styles.switchButton}>
            <Text style={styles.switchText}>
              {isLogin ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Inicia Sesión'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { 
    flexGrow: 1, 
    padding: 25,
    // 👇 Ubicación alta del logo en la pantalla 👇
    paddingTop: 30, 
  },
  formContainer: { 
    width: '100%', 
    alignItems: 'center' 
  },
  logoImage: { 
    // 👇 ¡SÚPER ANCHO FORZADO! Pasamos el subtítulo visualmente 👇
    // Aumentado drásticamente de 320 a 420.
    width: 470, 
    height: 260, // Altura ajustada proporcionalmente
    resizeMode: 'contain', 
    marginBottom: 1, // Casi tocando el subtítulo como pediste
  },
  subtitle: { 
    fontSize: 20, // Mantenemos subtítulo claro
    color: COLORS.textMuted, 
    fontWeight: '600', 
    marginBottom: 40, // Gran separación antes del formulario
    textAlign: 'center',
    // 👇 Añadimos un pequeño margen para equilibrar visualmente 👇
    marginTop: -55,
  },
//... resto de estilos igual
  input: { 
    width: '100%', 
    backgroundColor: COLORS.surface, 
    color: COLORS.text, 
    padding: 16, 
    borderRadius: 12, 
    marginBottom: 15, 
    borderWidth: 1, 
    borderColor: '#2A1A3D' 
  },
  mainButton: { 
    width: '100%', 
    backgroundColor: COLORS.primary, 
    padding: 16, 
    borderRadius: 12, 
    alignItems: 'center', 
    marginTop: 10,
    elevation: 5
  },
  mainButtonText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  
  // Estilos del Botón Invitado
  guestButton: { 
    marginTop: 15, 
    padding: 10, 
    width: '100%', 
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.textMuted,
    borderRadius: 12,
  },
  guestButtonText: { color: COLORS.textMuted, fontSize: 15, fontWeight: '500' },
  
  switchButton: { marginTop: 30 },
  switchText: { color: COLORS.accent, fontSize: 14, fontWeight: '600' },
});