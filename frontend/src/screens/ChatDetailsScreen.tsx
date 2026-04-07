import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, KeyboardAvoidingView, Platform, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';

export default function ChatDetailsScreen({ route, navigation }: any) {
  // Recibimos los parámetros que enviamos desde MessagesScreen
  const { chatId, chatName } = route.params;

  return (
    <SafeAreaView style={styles.container}>
      {/* CABECERA SUPERIOR */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{chatName}</Text>
        <View style={styles.headerRight} />
      </View>

      {/* ÁREA DE MENSAJES (Placeholder temporal) */}
      <View style={styles.messagesContainer}>
        <Ionicons name="chatbox-ellipses-outline" size={60} color={COLORS.textMuted} />
        <Text style={styles.placeholderText}>Aquí verás los mensajes con {chatName}.</Text>
      </View>

      {/* CAMPO DE TEXTO PARA ENVIAR MENSAJE */}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.inputContainer}>
          <TextInput 
            style={styles.input} 
            placeholder="Enviar mensaje..." 
            placeholderTextColor={COLORS.textMuted}
          />
          <TouchableOpacity style={styles.sendButton}>
            <Ionicons name="send" size={18} color="#000" style={{ marginLeft: 3 }}/>
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
  messagesContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  placeholderText: { color: COLORS.textMuted, fontSize: 16, marginTop: 10 },
  inputContainer: {
    flexDirection: 'row',
    padding: 10,
    borderTopWidth: 0.5,
    borderTopColor: '#333',
    alignItems: 'center',
    paddingBottom: Platform.OS === 'ios' ? 20 : 10
  },
  input: {
    flex: 1,
    backgroundColor: COLORS.surface,
    color: COLORS.text,
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginRight: 10
  },
  sendButton: { backgroundColor: COLORS.accent, borderRadius: 20, width: 40, height: 40, justifyContent: 'center', alignItems: 'center' }
});