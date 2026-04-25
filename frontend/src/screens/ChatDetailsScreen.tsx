// frontend/src/screens/ChatDetailsScreen.tsx
import React, { useState, useEffect, useRef } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { 
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView, 
  KeyboardAvoidingView, Platform, TextInput, FlatList, ActivityIndicator,
  Image, Animated // 👈 ¡AGREGA ESTO!
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { COLORS } from '../theme/colors';

const BACKEND_URL = 'https://viralshop-xr9v.onrender.com';

export default function ChatDetailsScreen({ route, navigation }: any) {
  const { chatId, chatName, avatar, isVerified, isOnline } = route.params;
  const flatListRef = useRef<FlatList>(null);
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [myUserId, setMyUserId] = useState<string | null>(null);
  // ... (tus otros estados) ...

  // 👇 2. ANIMACIÓN DEL LATIDO 👇
  const blinkAnim = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(blinkAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(blinkAnim, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  // 1. Cargar el historial de mensajes desde el servidor
  const fetchMessages = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      // Sacamos tu ID del token para saber de qué lado poner tus burbujas
      if (token) {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setMyUserId(payload.sub);
      }

      const response = await axios.get(`${BACKEND_URL}/chats/${chatId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessages(response.data);
    } catch (error) {
      console.error("Error cargando mensajes:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
    // Opcional: Refrescar el chat automáticamente cada 5 segundos para simular tiempo real
    const interval = setInterval(fetchMessages, 5000);
    return () => clearInterval(interval);
  }, []);

  // 2. Enviar un nuevo mensaje
  const handleSend = async () => {
    if (!inputText.trim()) return;

    // Actualización optimista: lo dibujamos en pantalla de inmediato para que se sienta rápido
    const tempMsg = {
      id: Date.now().toString(),
      text: inputText,
      senderId: myUserId,
      createdAt: new Date().toISOString(),
    };
    
    setMessages(prev => [tempMsg, ...prev]); // Va primero porque la lista está invertida
    setInputText('');

    try {
      const token = await AsyncStorage.getItem('userToken');
      await axios.post(`${BACKEND_URL}/chats/${chatId}`, 
        { text: tempMsg.text },
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch (error) {
      console.error("Error enviando mensaje:", error);
      fetchMessages(); // Si el servidor falla, recargamos la verdad de la base de datos
    }
  };

  // 3. Dibujar cada burbuja (Tus mensajes a la derecha, el resto a la izquierda)
  const renderMessage = ({ item }: { item: any }) => {
    const isMe = item.senderId === myUserId;
    
    return (
      <View style={[styles.messageWrapper, isMe ? styles.messageWrapperMe : styles.messageWrapperOther]}>
        <View style={[styles.messageBubble, isMe ? styles.messageBubbleMe : styles.messageBubbleOther]}>
          <Text style={[styles.messageText, isMe ? styles.messageTextMe : styles.messageTextOther]}>
            {item.text}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
    <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color={COLORS.text} />
        </TouchableOpacity>
        
        <View style={styles.headerUserInfo}>
          <View style={{ position: 'relative', marginRight: 10 }}>
            <Image 
              source={{ uri: avatar || 'https://via.placeholder.com/150' }} 
              style={[styles.headerAvatar, isVerified && { borderColor: '#1DA1F2', borderWidth: 1.5 }]} 
            />
            
            <Animated.View style={[
              styles.onlineDotHeader,
              { backgroundColor: isOnline ? COLORS.accent : '#888888' },
              isOnline ? { opacity: blinkAnim } : { opacity: 1 }
            ]} />

            {isVerified && (
              <View style={styles.verifiedBadgeHeader}>
                <Ionicons name="shield-checkmark" size={8} color="#FFF" />
              </View>
            )}
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={styles.headerTitle}>{chatName}</Text>
            {isVerified && <Ionicons name="shield-checkmark" size={16} color="#1DA1F2" style={{ marginLeft: 4 }} />}
          </View>
        </View>

        <View style={styles.headerRight} />
      </View>
      

      {/* ÁREA DE MENSAJES */}
      <KeyboardAvoidingView 
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {loading ? (
          <View style={styles.messagesContainer}>
            <ActivityIndicator size="large" color={COLORS.accent} />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={item => item.id}
            renderItem={renderMessage}
            inverted // 👈 Hace que los mensajes empiecen desde abajo (como WhatsApp/TikTok)
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 15, paddingVertical: 20 }}
            ListEmptyComponent={
              <View style={[styles.messagesContainer, { transform: [{ scaleY: -1 }] }]}>
                <Ionicons name="chatbox-ellipses-outline" size={60} color={COLORS.textMuted} />
                <Text style={styles.placeholderText}>No hay mensajes aún.</Text>
                <Text style={[styles.placeholderText, { fontSize: 13, marginTop: 5 }]}>¡Envía el primero para romper el hielo!</Text>
              </View>
            }
          />
        )}

        {/* CAMPO DE TEXTO PARA ENVIAR MENSAJE */}
        <View style={[styles.inputContainer, { paddingBottom: Platform.OS === 'ios' ? Math.max(insets.bottom, 20) : 15 }]}>
          <TextInput 
            style={styles.input} 
            placeholder="Enviar mensaje..." 
            placeholderTextColor={COLORS.textMuted}
            value={inputText}
            onChangeText={setInputText}
            multiline
          />
          <TouchableOpacity 
            style={[styles.sendButton, inputText.trim() ? { backgroundColor: COLORS.accent } : { backgroundColor: '#333' }]} 
            onPress={handleSend}
            disabled={!inputText.trim()}
          >
            <Ionicons name="send" size={18} color={inputText.trim() ? "#000" : "#888"} style={{ marginLeft: 3 }}/>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
    );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'android' ? 40 : 10,
    paddingBottom: 15,
    borderBottomWidth: 0.5,
    borderBottomColor: '#333'
  },
  backButton: { paddingHorizontal: 15, width: 50 },
  headerTitle: { color: COLORS.text, fontSize: 18, fontWeight: 'bold' },
  headerRight: { width: 50 },
  headerUserInfo: { flexDirection: 'row', alignItems: 'center', flex: 1, justifyContent: 'center' },
  headerAvatar: { width: 34, height: 34, borderRadius: 17 },
  verifiedBadgeHeader: {
    position: 'absolute', bottom: -2, right: -2, backgroundColor: '#1DA1F2',
    borderRadius: 8, padding: 1, borderWidth: 1.5, borderColor: COLORS.background, zIndex: 2,
  },
  onlineDotHeader: {
    position: 'absolute', top: 0, right: 0, width: 10, height: 10, borderRadius: 5,
    borderWidth: 1.5, borderColor: COLORS.background, zIndex: 10,
  },
  
  messagesContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  placeholderText: { color: COLORS.textMuted, fontSize: 16, marginTop: 10 },
  
  // Estilos de las Burbujas
  messageWrapper: { width: '100%', marginVertical: 5, flexDirection: 'row' },
  messageWrapperMe: { justifyContent: 'flex-end' },
  messageWrapperOther: { justifyContent: 'flex-start' },
  
  messageBubble: { maxWidth: '80%', paddingHorizontal: 15, paddingVertical: 10, borderRadius: 20 },
  messageBubbleMe: { backgroundColor: COLORS.accent, borderBottomRightRadius: 5 },
  messageBubbleOther: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: '#333', borderBottomLeftRadius: 5 },
  
  messageText: { fontSize: 15, lineHeight: 20 },
  messageTextMe: { color: '#000', fontWeight: '500' },
  messageTextOther: { color: COLORS.text },

  // Input
  inputContainer: {
    flexDirection: 'row',
    padding: 10,
    borderTopWidth: 0.5,
    borderTopColor: '#333',
    alignItems: 'flex-end',
    backgroundColor: COLORS.background
  },
  input: {
    flex: 1,
    backgroundColor: COLORS.surface,
    color: COLORS.text,
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingTop: 12,
    paddingBottom: 12,
    marginRight: 10,
    maxHeight: 100,
    fontSize: 15,
    borderWidth: 1, 
    borderColor: '#333'
  },
  sendButton: { borderRadius: 22, width: 44, height: 44, justifyContent: 'center', alignItems: 'center', marginBottom: 2 }
});