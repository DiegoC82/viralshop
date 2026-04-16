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
        createdAt: true, 
        videos: { 
          include: { user: true, bids: true }, // 👈 Incluimos 'bids' para calcular las ventas
          orderBy: { createdAt: 'desc' }
        },
        likes: { include: { video: { include: { user: true } } }, orderBy: { createdAt: 'desc' } },
        savedVideos: { include: { video: { include: { user: true } } }, orderBy: { createdAt: 'desc' } },
        _count: {
          select: { followers: true, following: true, likes: true } // 👈 Traemos los contadores reales
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

    return {
      ...user,
      followersCount: user._count.followers,
      followingCount: user._count.following,
      likesCount: user._count.likes,
      metrics: {
        totalViews,
        totalSales,
        activeAuctionsCount
      }
    };
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
        videos: { 
          where: { isAuction: false }, // Ocultamos los remates del perfil normal
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

    return {
      ...user,
      followersCount: user._count.followers,
      followingCount: user._count.following,
      likesCount: user._count.likes,
      isFollowing
    };
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
}