// frontend/src/screens/FeedScreen.tsx
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { StyleSheet, Text, View, FlatList, Dimensions, TouchableOpacity, Image, ActivityIndicator, RefreshControl, Alert, Share, Modal, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { COLORS } from '../theme/colors';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { height, width } = Dimensions.get('window');

// 👇 Arreglamos la URL base para poder usarla en diferentes llamadas 👇
const BASE_URL = 'https://viralshop-xr9v.onrender.com';

const FeedItem = ({ item, isActive }: { item: any; isActive: boolean }) => {
  const navigation = useNavigation<any>();
  
  const player = useVideoPlayer(item.videoUrl, player => {
    player.loop = true;
    player.muted = false; 
  });

  useEffect(() => {
    if (isActive) player.play();
    else player.pause();
  }, [isActive, player]); 

  const avatarUri = item.user?.avatarUrl || 'https://i.pravatar.cc/150?u=' + item.userId;

  // 🌟 ESTADOS PARA LOS BOTONES Y COMENTARIOS 🌟
  const [isLiked, setIsLiked] = useState(item.isLiked || false);
  const [isSaved, setIsSaved] = useState(item.isSaved || false);
  
  // Estados del panel de comentarios
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);

  const handleProtectedAction = async (actionCallback: () => void) => {
    const token = await AsyncStorage.getItem('userToken');
    if (!token) {
      Alert.alert(
        "¡Únete a la comunidad! 🚀",
        "Regístrate gratis para interactuar con tus videos favoritos.",
        [
          { text: "Seguir mirando", style: "cancel" },
          { text: "Registrarme", onPress: () => navigation.navigate('Auth') }
        ]
      );
      return;
    }
    actionCallback();
  };

  // 👇 1. LÓGICA DE COMPARTIR (Nativo del celular) 👇
  const shareVideo = async () => {
    try {
      await Share.share({
        message: `¡Mira este increíble video en ViralShop! 🚀 ${item.description || ''} - Descarga la app para verlo.`,
      });
    } catch (error) {
      console.log("Error al compartir:", error);
    }
  };

  // 👇 2. LÓGICA DE ME GUSTA (Optimista) 👇
  const toggleLike = async () => {
    const previousState = isLiked;
    setIsLiked(!isLiked); // Cambia al instante (UI Optimista)
    
    try {
      const token = await AsyncStorage.getItem('userToken');
      // Llama a tu backend (asegúrate de que esta ruta exista en NestJS)
      await axios.post(`${BASE_URL}/videos/${item.id}/like`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (error) {
      setIsLiked(previousState); // Si falla, lo devuelve a la normalidad
      console.log("Error al dar like:", error);
    }
  };

  // 👇 3. LÓGICA DE GUARDAR (Optimista) 👇
  const toggleBookmark = async () => {
    const previousState = isSaved;
    setIsSaved(!isSaved); // Cambia al instante
    
    try {
      const token = await AsyncStorage.getItem('userToken');
      await axios.post(`${BASE_URL}/videos/${item.id}/save`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (error) {
      setIsSaved(previousState);
      console.log("Error al guardar:", error);
    }
  };

  // 👇 4. LÓGICA DE COMENTARIOS 👇
  const openComments = async () => {
    setShowComments(true);
    setLoadingComments(true);
    try {
      // Trae los comentarios del video
      const response = await axios.get(`${BASE_URL}/videos/${item.id}/comments`);
      setComments(response.data || []);
    } catch (error) {
      console.log("Error al cargar comentarios", error);
    } finally {
      setLoadingComments(false);
    }
  };

  const postComment = async () => {
    if (newComment.trim() === '') return;
    
    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await axios.post(`${BASE_URL}/videos/${item.id}/comments`, 
        { text: newComment },
        { headers: { Authorization: `Bearer ${token}` }}
      );
      
      // Agrega el comentario a la lista local para que se vea de inmediato
      setComments([response.data, ...comments]); 
      setNewComment(''); // Limpia el input
    } catch (error) {
      Alert.alert("Error", "No se pudo enviar el comentario.");
      console.log(error);
    }
  };

  const toggleFollow = () => {
    console.log("Llamar a la API para Seguir al usuario");
  };

  return (
    <View style={styles.videoContainer}>
      <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="cover" nativeControls={false} />
      <View style={styles.darkOverlay} />
      
      <View style={styles.infoOverlay}>
        {item.productName && (
          <TouchableOpacity style={styles.productTag}>
            <Ionicons name="cart" size={16} color="#000" />
            <Text style={styles.productName} numberOfLines={1}>{item.productName}</Text>
            {item.productPrice && (
              <Text style={styles.productPrice}>${item.productPrice.toFixed(2)}</Text>
            )}
            <Ionicons name="chevron-forward" size={14} color="#000" />
          </TouchableOpacity>
        )}

        <Text style={styles.username}>@{item.user?.username || 'usuario'}</Text>
        <Text style={styles.description}>{item.description}</Text>
      </View>

      <View style={styles.actionOverlay}>
        <View style={styles.profileContainer}>
          <Image source={{ uri: avatarUri }} style={styles.profilePic} />
          <TouchableOpacity style={styles.followButton} onPress={() => handleProtectedAction(toggleFollow)}>
            <Ionicons name="add" size={14} color="#FFF" />
          </TouchableOpacity>
        </View>

        {/* BOTONES CONECTADOS */}
        <TouchableOpacity style={styles.actionButton} onPress={() => handleProtectedAction(toggleLike)}>
          <Ionicons name={isLiked ? "heart" : "heart-outline"} size={32} color={isLiked ? "#FF2D55" : COLORS.text} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={() => handleProtectedAction(openComments)}>
          <Ionicons name="chatbubble-ellipses" size={28} color={COLORS.text} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={() => handleProtectedAction(toggleBookmark)}>
          <Ionicons name={isSaved ? "bookmark" : "bookmark-outline"} size={28} color={isSaved ? COLORS.accent : COLORS.text} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={shareVideo}>
          <Ionicons name="arrow-redo" size={28} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      {/* 🌟 EL PANEL DESLIZABLE DE COMENTARIOS (MODAL) 🌟 */}
      <Modal visible={showComments} animationType="slide" transparent={true} onRequestClose={() => setShowComments(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalContainer}>
          <View style={styles.bottomSheet}>
            
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Comentarios</Text>
              <TouchableOpacity onPress={() => setShowComments(false)}>
                <Ionicons name="close-circle" size={28} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>

            {loadingComments ? (
              <ActivityIndicator size="large" color={COLORS.accent} style={{ marginTop: 20 }} />
            ) : (
              <FlatList
                data={comments}
                keyExtractor={(c, index) => index.toString()}
                renderItem={({ item: comment }) => (
                  <View style={styles.commentBox}>
                    <Image source={{ uri: 'https://i.pravatar.cc/150?u=' + comment.userId }} style={styles.commentAvatar} />
                    <View style={styles.commentContent}>
                      <Text style={styles.commentUser}>@{comment.user?.username || 'usuario'}</Text>
                      <Text style={styles.commentText}>{comment.text}</Text>
                    </View>
                  </View>
                )}
                ListEmptyComponent={<Text style={styles.emptyText}>Sé el primero en comentar.</Text>}
              />
            )}

            <View style={styles.inputContainer}>
              <TextInput 
                style={styles.commentInput} 
                placeholder="Añadir un comentario..." 
                placeholderTextColor={COLORS.textMuted}
                value={newComment}
                onChangeText={setNewComment}
              />
              <TouchableOpacity style={styles.sendButton} onPress={postComment}>
                <Ionicons name="send" size={20} color={newComment.trim() ? COLORS.accent : COLORS.textMuted} />
              </TouchableOpacity>
            </View>

          </View>
        </KeyboardAvoidingView>
      </Modal>

    </View>
  );
};


export default function FeedScreen() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [videos, setVideos] = useState<any[]>([]); 
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchVideos = async () => {
    try {
      // Usamos BASE_URL
      const response = await axios.get(`${BASE_URL}/videos/feed`);
      setVideos(response.data);
    } catch (error) {
      console.error("Error al traer videos:", error);
    } finally {
      setLoading(false);
      setRefreshing(false); 
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchVideos();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchVideos();
  };

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 50 }).current;
  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) setActiveIndex(viewableItems[0].index);
  }).current;

  if (loading) {
    return (
      <View style={[styles.videoContainer, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={COLORS.accent} />
      </View>
    );
  }

  return (
    <FlatList
      data={videos}
      renderItem={({ item, index }) => <FeedItem item={item} isActive={index === activeIndex} />}
      keyExtractor={item => item.id}
      pagingEnabled 
      showsVerticalScrollIndicator={false}
      snapToAlignment="start"
      decelerationRate="fast"
      onViewableItemsChanged={onViewableItemsChanged}
      viewabilityConfig={viewabilityConfig}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.accent} colors={[COLORS.accent]} />
      }
    />
  );
}

const styles = StyleSheet.create({
  videoContainer: { height: height, width: width, backgroundColor: COLORS.background },
  darkOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.2)' },
  infoOverlay: { position: 'absolute', bottom: 90, left: 20, right: 80 },
  username: { color: COLORS.text, fontSize: 18, fontWeight: 'bold', marginBottom: 5, textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 3 },
  description: { color: COLORS.text, fontSize: 15, textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 3 },
  actionOverlay: { position: 'absolute', bottom: 90, right: 10, alignItems: 'center' },
  profileContainer: { alignItems: 'center', marginBottom: 20 },
  profilePic: { width: 50, height: 50, borderRadius: 25, borderWidth: 2, borderColor: COLORS.accent },
  followButton: { position: 'absolute', bottom: -10, backgroundColor: COLORS.primary, width: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  actionButton: { width: 50, height: 50, justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
  productTag: { flexDirection: 'row', backgroundColor: COLORS.accent, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, alignItems: 'center', marginBottom: 12, alignSelf: 'flex-start', maxWidth: '90%', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.5, shadowRadius: 3, elevation: 5 },
  productName: { color: '#000', fontWeight: 'bold', fontSize: 14, marginLeft: 5, marginRight: 8, flexShrink: 1 },
  productPrice: { color: '#000', fontWeight: '900', fontSize: 14, marginRight: 5 },
  
  // 👇 ESTILOS PARA EL PANEL DE COMENTARIOS 👇
  modalContainer: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  bottomSheet: { backgroundColor: COLORS.surface, height: height * 0.6, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#333', paddingBottom: 15, marginBottom: 15 },
  sheetTitle: { color: COLORS.text, fontSize: 18, fontWeight: 'bold' },
  commentBox: { flexDirection: 'row', marginBottom: 15 },
  commentAvatar: { width: 40, height: 40, borderRadius: 20, marginRight: 10 },
  commentContent: { flex: 1 },
  commentUser: { color: COLORS.textMuted, fontSize: 12, fontWeight: 'bold', marginBottom: 3 },
  commentText: { color: COLORS.text, fontSize: 14 },
  emptyText: { color: COLORS.textMuted, textAlign: 'center', marginTop: 20 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#333', paddingTop: 15, marginTop: 10 },
  commentInput: { flex: 1, backgroundColor: COLORS.background, color: COLORS.text, borderRadius: 20, paddingHorizontal: 15, paddingVertical: 10, marginRight: 10 },
  sendButton: { padding: 10 },
});