import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { v2 as cloudinary } from 'cloudinary';
import * as streamifier from 'streamifier';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {
    // Configuramos Cloudinary con nuestras llaves secretas
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { 
        id: true, 
        username: true, 
        name: true, 
        email: true, 
        avatarUrl: true,
        bio: true,           // Traemos la biografía
        isVerified: true,    // Traemos si está verificado
        lastActive: true,
        createdAt: true, 
        videos: { 
          include: { 
            user: true, 
            bids: true,
            // 👇 2. AGREGAR ESTO PARA TU PROPIO PERFIL 👇
            _count: { select: { likes: true, comments: true } }
          }, 
          orderBy: { createdAt: 'desc' }
        },
        likes: { include: { video: { include: { user: true } } }, orderBy: { createdAt: 'desc' } },
        savedVideos: { include: { video: { include: { user: true } } }, orderBy: { createdAt: 'desc' } },
        _count: {
          select: { followers: true, following: true, likes: true, adultFollowers: true, adultFollowing: true }// 👈 Traemos los contadores reales
        }
      },
    });

    if (!user) return null;

    // 👇 CALCULAMOS LAS MÉTRICAS REALES 👇
    let totalViews = 0;
    let totalSales = 0;
    let activeAuctionsCount = 0;

    user.videos.forEach(video => {
      totalViews += video.viewCount || 0; // Sumamos reproducciones
      
      if (video.isAuction) {
        if (video.isAuctionClosed && video.bids.length > 0) {
          // Si el remate se cerró y hubo ofertas, sumamos la oferta más alta (ganadora) a las ventas
          const highestBid = Math.max(...video.bids.map(b => b.amount));
          totalSales += highestBid;
        } else if (!video.isAuctionClosed) {
          // Si el remate no se ha cerrado, lo contamos como "Activo"
          activeAuctionsCount += 1;
        }
      }
    });

    // 👇 AGREGA EL CÁLCULO DE isOnline EXACTAMENTE AQUÍ 👇
    const isOnline = user.lastActive 
      ? (new Date().getTime() - new Date(user.lastActive).getTime()) < 300000 
      : false;

    return {
      ...user,
      isOnline,
      followersCount: user._count.followers,
      followingCount: user._count.following,
      likesCount: user._count.likes,
      adultFollowersCount: user._count.adultFollowers,
      adultFollowingCount: user._count.adultFollowing,
      metrics: {
        totalViews,
        totalSales,
        activeAuctionsCount
      }
    };
  }

  // 👇 BUSCADOR GLOBAL DE USUARIOS 👇
  async searchUsers(query: string) {
    if (!query || query.trim() === '') return [];
    
    return this.prisma.user.findMany({
      where: {
        OR: [
          { username: { contains: query, mode: 'insensitive' } },
          { name: { contains: query, mode: 'insensitive' } }
        ]
      },
      select: {
        id: true,
        username: true,
        name: true,
        avatarUrl: true,
        isVerified: true
      },
      take: 10 // Limitamos a 10 resultados para que sea súper rápido
    });
  }

  // 👇 Trae el perfil público de un usuario y verifica si lo estamos siguiendo
  async getPublicProfile(targetUserId: string, currentUserId?: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      select: {
        id: true,
        username: true,
        name: true,
        avatarUrl: true,
        bio: true,
        isVerified: true,
        lastActive: true,
        videos: { 
          where: { isAuction: false }, // Ocultamos los remates del perfil normal
          // 👇 3. AGREGAR ESTO PARA EL PERFIL DE OTROS 👇
          include: { 
            _count: { select: { likes: true, comments: true } } 
          },
          orderBy: { createdAt: 'desc' } 
        },
        _count: {
          select: { followers: true, following: true, likes: true }
        }
      }
    });

    if (!user) throw new Error('Usuario no encontrado');

    let isFollowing = false;
    if (currentUserId) {
      const follow = await this.prisma.follows.findUnique({
        where: { followerId_followingId: { followerId: currentUserId, followingId: targetUserId } }
      });
      isFollowing = !!follow;
    }

    // 👇 AGREGA EL CÁLCULO Y MODIFICA EL RETURN 👇
    const isOnline = user.lastActive 
      ? (new Date().getTime() - new Date(user.lastActive).getTime()) < 300000 
      : false;

    return {
      ...user,
      isOnline,
      followersCount: user._count.followers,
      followingCount: user._count.following,
      likesCount: user._count.likes,
      isFollowing
    };
  }

  // 👇 NUEVA FUNCIÓN: Actualizar la biografía del perfil 👇
  async updateProfile(userId: string, bio?: string, isVerified?: boolean) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { 
        bio: bio !== undefined ? bio : undefined,
        isVerified: isVerified !== undefined ? isVerified : undefined
      }
    });
  }

  // 👇 NUEVA FUNCIÓN: Actualizar el Alter Ego (Bóveda +18) 👇
  async updateAdultProfile(userId: string, data: { adultBio?: string; adultUsername?: string; adultAvatarUrl?: string }) {
    return this.prisma.user.update({
      where: { id: userId },
      data
    });
  }

  // 👇 FUNCIÓN FALTANTE: Actualiza la última conexión (PUNTO VERDE) 👇
  async updateLastActive(userId: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { lastActive: new Date() },
      select: { id: true }
    });
  }

  // 👇 Activa o desactiva el "Seguir"
  async toggleFollow(targetUserId: string, currentUserId: string) {
    if (targetUserId === currentUserId) throw new Error('No puedes seguirte a ti mismo');

    const existingFollow = await this.prisma.follows.findUnique({
      where: { followerId_followingId: { followerId: currentUserId, followingId: targetUserId } }
    });

    if (existingFollow) {
      await this.prisma.follows.delete({
        where: { followerId_followingId: { followerId: currentUserId, followingId: targetUserId } }
      });
      return { following: false };
    } else {
      await this.prisma.follows.create({
        data: { followerId: currentUserId, followingId: targetUserId }
      });
      return { following: true };
    }
  }

  async updateAvatar(userId: string, avatarUrl: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { avatarUrl },
    });
  }

  // 👇 Función para guardar el token del celular y poder enviarle notificaciones
  async updatePushToken(userId: string, pushToken: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { pushToken },
    });
  }
  
  // ==========================================
  // 👇 PERFIL PÚBLICO MODO ADULTO 👇
  // ==========================================
  async getAdultPublicProfile(targetUserId: string, currentUserId?: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      select: {
        id: true,
        username: true,
        name: true,
        adultUsername: true,
        adultAvatarUrl: true,
        adultBio: true,
        isVerified: true,
        lastActive: true,
        videos: {
          where: { is18Plus: true }, // 👈 EL MURO: Solo trae videos secretos
          include: {
            _count: { select: { likes: true, comments: true } }
          },
          orderBy: { createdAt: 'desc' }
        },
        _count: {
          select: { adultFollowers: true, adultFollowing: true }
        }
      }
    });

    if (!user) throw new Error('Usuario no encontrado');

    let isFollowing = false;
    if (currentUserId) {
      // 👈 Busca en la tabla secreta de seguidores
      const follow = await this.prisma.adultFollows.findUnique({
        where: { followerId_followingId: { followerId: currentUserId, followingId: targetUserId } }
      });
      isFollowing = !!follow;
    }

    // Cuenta los likes SOLO de los videos +18
    const adultLikesCount = await this.prisma.like.count({
      where: { video: { userId: targetUserId, is18Plus: true } }
    });

    const isOnline = user.lastActive
      ? (new Date().getTime() - new Date(user.lastActive).getTime()) < 300000
      : false;

    return {
      ...user,
      isOnline,
      adultFollowersCount: user._count.adultFollowers,
      adultFollowingCount: user._count.adultFollowing,
      likesCount: adultLikesCount,
      isFollowing
    };
  }

  // ==========================================
  // 👇 SEGUIR / DEJAR DE SEGUIR EN MODO ADULTO 👇
  // ==========================================
  async toggleAdultFollow(targetUserId: string, currentUserId: string) {
    if (targetUserId === currentUserId) throw new Error('No puedes seguirte a ti mismo');

    const existingFollow = await this.prisma.adultFollows.findUnique({
      where: { followerId_followingId: { followerId: currentUserId, followingId: targetUserId } }
    });

    if (existingFollow) {
      await this.prisma.adultFollows.delete({
        where: { followerId_followingId: { followerId: currentUserId, followingId: targetUserId } }
      });
      return { following: false };
    } else {
      await this.prisma.adultFollows.create({
        data: { followerId: currentUserId, followingId: targetUserId }
      });
      return { following: true };
    }
  }

  // ==========================================
  // 👇 ACTIVIDAD MODO ADULTO (Para los Modales) 👇
  // ==========================================
  async getAdultActivity(userId: string) {
    const newFollowers = await this.prisma.adultFollows.findMany({
      where: { followingId: userId },
      include: { follower: { select: { id: true, adultUsername: true, username: true, adultAvatarUrl: true, isVerified: true } } },
      orderBy: { createdAt: 'desc' }
    });

    const following = await this.prisma.adultFollows.findMany({
      where: { followerId: userId },
      include: { following: { select: { id: true, adultUsername: true, username: true, adultAvatarUrl: true, isVerified: true } } },
      orderBy: { createdAt: 'desc' }
    });

    const newLikes = await this.prisma.like.findMany({
      where: { video: { userId: userId, is18Plus: true } }, // Solo likes en videos ocultos
      include: {
        user: { select: { id: true, adultUsername: true, username: true, adultAvatarUrl: true, isVerified: true } },
        video: { select: { id: true, videoUrl: true, muxAssetId: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    const activityList = [
      ...newFollowers.map(f => ({ id: `adult_follower_${f.followerId}`, type: 'FOLLOW', user: f.follower, createdAt: f.createdAt })),
      ...following.map(f => ({ id: `adult_following_${f.followingId}`, type: 'FOLLOWING', user: f.following, createdAt: f.createdAt })),
      ...newLikes.map(l => ({ id: `adult_like_${l.id}`, type: 'LIKE', user: l.user, video: l.video, createdAt: l.createdAt }))
    ];

    activityList.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return activityList;
  }

  // ==========================================
  // 👇 NUEVO: Listas de Actividad (Followers, Following, Likes) 👇
  // ==========================================
  async getActivity(userId: string) {
    // 1. Seguidores (Quién te sigue)
    const newFollowers = await this.prisma.follows.findMany({
      where: { followingId: userId },
      include: { follower: { select: { id: true, username: true, name: true, avatarUrl: true, isVerified: true } } },
      orderBy: { createdAt: 'desc' }
    });

    // 2. Siguiendo (A quién sigues tú) 👈 ¡NUEVO!
    const following = await this.prisma.follows.findMany({
      where: { followerId: userId },
      include: { following: { select: { id: true, username: true, name: true, avatarUrl: true, isVerified: true } } },
      orderBy: { createdAt: 'desc' }
    });

    // 3. Likes en tus videos
    const newLikes = await this.prisma.like.findMany({
      where: { video: { userId: userId } },
      include: { 
        user: { select: { id: true, username: true, name: true, avatarUrl: true, isVerified: true } },
        video: { select: { id: true, videoUrl: true, muxAssetId: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    // 4. Unimos todo con su etiqueta correspondiente
    const activityList = [
      ...newFollowers.map(f => ({ id: `follower_${f.followerId}`, type: 'FOLLOW', user: f.follower, createdAt: f.createdAt })),
      ...following.map(f => ({ id: `following_${f.followingId}`, type: 'FOLLOWING', user: f.following, createdAt: f.createdAt })), // 👈 Agregado
      ...newLikes.map(l => ({ id: `like_${l.id}`, type: 'LIKE', user: l.user, video: l.video, createdAt: l.createdAt }))
    ];

    activityList.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return activityList;
  }
  
    // 👇 NUEVA FUNCIÓN: Sube la imagen directamente a Cloudinary 👇
  async uploadImageToCloudinary(fileBuffer: Buffer): Promise<string> {
  return new Promise((resolve, reject) => {
    // 1. Convertimos el Buffer de memoria a un string en Base64
    const base64Image = fileBuffer.toString('base64');
    
    // 2. Le agregamos el encabezado que Cloudinary necesita para reconocerlo
    const dataUri = `data:image/jpeg;base64,${base64Image}`;

    // 3. Lo subimos a Cloudinary
    cloudinary.uploader.upload(
      dataUri,
      { folder: 'viralshop_avatars' }, // Opcional: para organizar las fotos en una carpeta
      (error, result) => {
        if (error || !result) {
          console.error("Error de Cloudinary:", error);
          return reject(error || new Error('No se pudo subir la imagen a Cloudinary'));
        }
        resolve(result.secure_url);
      }
    );
  });
}
 // ==========================================
  // 👇 NUEVA FUNCIÓN: TRAER LAS DESCARGAS COMPRADAS 👇
  // ==========================================
  async getUnlockedContent(userId: string) {
    const unlockedRecords = await this.prisma.unlockedContent.findMany({
      where: { userId },
      include: {
        video: {
          include: {
            user: {
              select: { 
                id: true, 
                username: true, 
                adultUsername: true, 
                adultAvatarUrl: true 
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Mapeamos para que el frontend reciba directamente la lista de videos
    return unlockedRecords.map(record => record.video);
  }
}