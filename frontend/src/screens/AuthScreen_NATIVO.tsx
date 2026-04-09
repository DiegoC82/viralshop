// frontend/src/screens/AuthScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, Alert, Image, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios'; 
import { COLORS } from '../theme/colors';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GoogleSignin } from '@react-native-google-signin/google-signin';

const BACKEND_URL = 'https://viralshop-xr9v.onrender.com'; 

export default function AuthScreen({ navigation }: any) {
  // 👇 EL useEffect VA AQUÍ ADENTRO 👇
  useEffect(() => {
    try {
      GoogleSignin.configure({
        webClientId: '625049952424-t0deu6n1m9o30o9anitdpjh899mtj93n.apps.googleusercontent.com', 
      });
    } catch (error) {
      console.warn("GoogleSignin no pudo inicializarse. ¿Estás en Expo Go sin compilar el cliente nativo?", error);
    }
  }, []);

  const [isLogin, setIsLogin] = useState(true);
  const [showEmailForm, setShowEmailForm] = useState(false);

  // Estados del formulario
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // 👇 AQUÍ ESTÁ LA FUNCIÓN PARA EL BOTÓN DE GOOGLE 👇
  const handleGoogleLogin = async () => {
    setIsLoading(true); // Prende el círculo
    try {
      // 1. Google hace su trabajo
      await GoogleSignin.hasPlayServices();
      const response = await GoogleSignin.signIn();
      const user = response.data?.user;
      
      if (!user) return;

      // 2. Enviamos los datos a la nueva ruta de tu backend
      const backendResponse = await axios.post(`${BACKEND_URL}/auth/social`, {
        email: user.email,
        name: user.name,
        avatarUrl: user.photo,
        provider: 'google'
      });

      // 3. Guardamos el token real de tu base de datos en el celular
      await AsyncStorage.setItem('userToken', backendResponse.data.token); 
      
      // 4. ¡Adentro!
      Alert.alert("¡Bienvenido!", `Hola ${user.name}`);
      navigation.navigate('MainTabs');

    } catch (error: any) {
      console.error("Error en Google Sign-In o Backend:", error);
      Alert.alert("Error", "No se pudo iniciar sesión correctamente.");
    } finally {
    setIsLoading(false); // Apaga el círculo pase lo que pase
    }
  };

  const handleAuthentication = async () => {
    setIsLoading(true); // Prende el círculo
    try {
      const endpoint = isLogin ? '/auth/login' : '/auth/register';
      const payload = isLogin ? { email, password } : { name, username, email, password };

      const response = await axios.post(`${BACKEND_URL}${endpoint}`, payload);
      await AsyncStorage.setItem('userToken', response.data.token); 

      // 👇 AQUÍ RESOLVEMOS EL PUNTO 4: Mandamos a Intereses primero
      navigation.navigate('Interests'); 

    } catch (error: any) {
      const errorMessage = error.response?.data?.message || "Error de conexión";
      Alert.alert("Atención", errorMessage);
    } finally {
      setIsLoading(false); // Apaga el círculo pase lo que pase
    }
  };

  const handleGuest = async () => {
    await AsyncStorage.removeItem('userToken');
    navigation.navigate('MainTabs');
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        <View style={styles.mainWrapper}>
          <View style={styles.formContainer}>
            
            <Image source={require('../../assets/logo.png')} style={styles.logoImage} />

            <Text style={styles.subtitle}>
              {!showEmailForm 
                ? 'Regístrate en ViralShop' 
                : (isLogin ? 'Bienvenido de nuevo' : 'Crea tu cuenta para empezar')}
            </Text>

            {!showEmailForm ? (
              <View style={{ width: '100%' }}>
                <TouchableOpacity style={styles.socialButton} onPress={() => setShowEmailForm(true)}>
                  <Ionicons name="person-outline" size={24} color={COLORS.text} style={styles.icon} />
                  <Text style={styles.socialButtonText}>Usar correo electrónico</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.socialButton} onPress={() => console.log('Facebook')}>
                  <Ionicons name="logo-facebook" size={24} color="#1877F2" style={styles.icon} />
                  <Text style={styles.socialButtonText}>Continuar con Facebook</Text>
                </TouchableOpacity>

                {/* 👇 CONECTAMOS EL BOTÓN DE GOOGLE AQUÍ 👇 */}
                <TouchableOpacity style={styles.socialButton} onPress={handleGoogleLogin}>
                  <Ionicons name="logo-google" size={24} color="#DB4437" style={styles.icon} />
                  <Text style={styles.socialButtonText}>Continuar con Google</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.guestButton} onPress={handleGuest}>
                  <Text style={styles.guestButtonText}>Explorar como invitado</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={{ width: '100%', alignItems: 'center' }}>
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

                <TouchableOpacity style={styles.mainButton} onPress={handleAuthentication} disabled={isLoading}>
                  {isLoading ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <Text style={styles.mainButtonText}>
                      {isLogin ? 'Iniciar Sesión' : 'Registrarse'}
                   </Text>
                 )}
                </TouchableOpacity>

                <TouchableOpacity onPress={() => setIsLogin(!isLogin)} style={styles.switchButton}>
                  <Text style={styles.switchText}>
                    {isLogin ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Inicia Sesión'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => setShowEmailForm(false)} style={styles.backButton}>
                  <Ionicons name="arrow-back" size={20} color={COLORS.textMuted} />
                  <Text style={styles.backText}>Volver a las opciones</Text>
                </TouchableOpacity>
              </View>
            )}

          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Al continuar, aceptas nuestras <Text style={styles.link}>Condiciones de servicio</Text> y confirmas que has leído nuestra <Text style={styles.link}>Política de privacidad</Text>.
          </Text>
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { flexGrow: 1, padding: 25, paddingTop: 30 , paddingBottom: 60 },
  mainWrapper: { flex: 1 }, 
  formContainer: { width: '100%', alignItems: 'center' },
  logoImage: { width: 470, height: 260, resizeMode: 'contain', marginBottom: 1 },
  subtitle: { fontSize: 20, color: COLORS.textMuted, fontWeight: '600', marginBottom: 40, textAlign: 'center', marginTop: -55 },
  socialButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, borderWidth: 1, borderColor: '#2A1A3D', paddingVertical: 15, paddingHorizontal: 20, borderRadius: 12, marginBottom: 15, width: '100%' },
  icon: { position: 'absolute', left: 20 },
  socialButtonText: { flex: 1, textAlign: 'center', color: COLORS.text, fontSize: 16, fontWeight: '600' },
  input: { width: '100%', backgroundColor: COLORS.surface, color: COLORS.text, padding: 16, borderRadius: 12, marginBottom: 15, borderWidth: 1, borderColor: '#2A1A3D' },
  mainButton: { width: '100%', backgroundColor: COLORS.primary, padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 10, elevation: 5 },
  mainButtonText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  guestButton: { marginTop: 10, padding: 10, width: '100%', alignItems: 'center', borderWidth: 1, borderColor: COLORS.textMuted, borderRadius: 12 },
  guestButtonText: { color: COLORS.textMuted, fontSize: 15, fontWeight: '500' },
  switchButton: { marginTop: 30 },
  switchText: { color: COLORS.accent, fontSize: 14, fontWeight: '600' },
  backButton: { flexDirection: 'row', alignItems: 'center', marginTop: 30 },
  backText: { color: COLORS.textMuted, fontSize: 14, marginLeft: 5 },
  footer: { marginTop: 20, paddingBottom: 10, paddingHorizontal: 10 },
  footerText: { color: COLORS.textMuted, fontSize: 12, textAlign: 'center', lineHeight: 18 },
  link: { color: COLORS.text, fontWeight: 'bold' }
});