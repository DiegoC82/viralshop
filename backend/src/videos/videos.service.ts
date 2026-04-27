// backend/src/videos/videos.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import Mux from '@mux/mux-node';
import { Cron, CronExpression } from '@nestjs/schedule'; // 👈 Importamos el Robot
import * as fs from 'fs';
import { Expo } from 'expo-server-sdk';

@Injectable()
export class VideosService {
  private mux: Mux;
  private expo: Expo; // 👈 1. Declaramos Expo

  constructor(private prisma: PrismaService) {
    this.mux = new Mux({
      tokenId: process.env.MUX_TOKEN_ID,
      tokenSecret: process.env.MUX_TOKEN_SECRET,
    });
    this.expo = new Expo(); // 👈 2. Lo inicializamos
  }

  async getFeed(currentUserId?: string) {
    const videos = await this.prisma.video.findMany({ 
      where: { isAuction: false , is18Plus: false}, // 👈 ¡VOLVEMOS A PONER EL CANDADO!
      include: { 
        user: true,
        _count: {
          select: { likes: true, comments: true }
        }
      }, 
      orderBy: { createdAt: 'desc' } 
    });

    if (!currentUserId) return videos;

    const following = await this.prisma.follows.findMany({
      where: { followerId: currentUserId },
      select: { followingId: true }
    });
    const followedIds = following.map(f => f.followingId);

    return videos.map(video => {
      // Calculamos si la última actividad fue hace menos de 5 minutos (300,000 milisegundos)
      const isOnline = video.user.lastActive 
        ? (new Date().getTime() - new Date(video.user.lastActive).getTime()) < 300000 
        : false;

      return {
        ...video,
        user: { ...video.user, isOnline }, // Inyectamos el isOnline para el frontend
        isFollowing: followedIds.includes(video.userId)
      };
    });
  }

  async toggleLike(videoId: string, userId: string) {
    const existingLike = await this.prisma.like.findFirst({ where: { videoId, userId } });
    if (existingLike) {
      await this.prisma.like.delete({ where: { id: existingLike.id } });
      return { liked: false };
    } else {
      await this.prisma.like.create({ data: { videoId, userId } });
      return { liked: true };
    }
  }

  async getComments(videoId: string) {
    return this.prisma.comment.findMany({
      where: { videoId },
      include: { user: true }, 
      orderBy: { createdAt: 'desc' }
    });
  }

  async addComment(videoId: string, userId: string, text: string) {
    return this.prisma.comment.create({
      data: { videoId, userId, text },
      include: { user: true }
    });
  }

  async toggleSave(videoId: string, userId: string) {
    const existingSave = await this.prisma.savedVideo.findFirst({ where: { videoId, userId } });
    if (existingSave) {
      await this.prisma.savedVideo.delete({ where: { id: existingSave.id } });
      return { saved: false };
    } else {
      await this.prisma.savedVideo.create({ data: { videoId, userId } });
      return { saved: true };
    }
  }

  async uploadToMux(filePath: string): Promise<{ playbackId: string, assetId: string }> {
    const upload = await this.mux.video.uploads.create({
      new_asset_settings: { playback_policy: ['public'] },
      cors_origin: '*',
    });

    const fileBuffer = fs.readFileSync(filePath);
    await fetch(upload.url, {
      method: 'PUT',
      headers: { 'Content-Type': 'video/mp4' },
      body: fileBuffer,
    });

    let assetId = null;
    while (!assetId) {
      await new Promise(resolve => setTimeout(resolve, 1500));
      const check = await this.mux.video.uploads.retrieve(upload.id);
      assetId = check.asset_id;
    }

    const asset = await this.mux.video.assets.retrieve(assetId);
    fs.unlinkSync(filePath);

    // 👇 NUEVO: Devolvemos ambos IDs
    return { 
      playbackId: asset.playback_ids[0].id, 
      assetId: asset.id 
    };
  }

  async createVideo(
    userId: string, description: string, playbackId: string, 
    productName?: string, productPrice?: number, productLink?: string,
    category?: string, subCategory?: string, latitude?: number, longitude?: number,
    is18Plus?: boolean,
    muxAssetId?: string // 👈 NUEVO PARÁMETRO
  ) {
    const videoUrl = `https://stream.mux.com/${playbackId}.m3u8`;
    const newVideo = await this.prisma.video.create({
      data: { 
        userId, description, videoUrl, productName, productPrice, productLink,
        category, subCategory, latitude, longitude,
        is18Plus: is18Plus || false,
        muxAssetId // 👈 LO GUARDAMOS EN LA BASE DE DATOS
      },
    });
    return { message: '¡Video publicado con éxito!', video: newVideo };
  }

  async searchVideos(query?: string, category?: string, subcategory?: string, lat?: string, lng?: string, radius?: string) {
    const whereClause: any = {
      isAuction: false, is18Plus: false // 👈 CANDADO TAMBIÉN EN EL BUSCADOR
    };

    if (query) {
      whereClause.OR = [
        { productName: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
        { user: { username: { contains: query, mode: 'insensitive' } } }
      ];
    }
    if (category && category !== 'Todos') whereClause.category = category;
    if (subcategory) whereClause.subCategory = subcategory;

    if (lat && lng && radius) {
      const latNum = parseFloat(lat);
      const lngNum = parseFloat(lng);
      const radiusKm = parseFloat(radius);
      const degreeRadius = radiusKm / 111;

      whereClause.latitude = { gte: latNum - degreeRadius, lte: latNum + degreeRadius };
      whereClause.longitude = { gte: lngNum - degreeRadius, lte: lngNum + degreeRadius };
    }

    const videos = await this.prisma.video.findMany({
      where: whereClause,
      include: { 
        user: true,
        // 👇 ESTO ES CLAVE PARA QUE AL ABRIR EL VIDEO SE VEAN LOS LIKES Y COMENTARIOS 👇
        _count: {
          select: { likes: true, comments: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return videos.map(video => {
      const isOnline = video.user?.lastActive 
        ? (new Date().getTime() - new Date(video.user.lastActive).getTime()) < 300000 
        : false;

      return {
        ...video,
        user: { ...video.user, isOnline } 
      };
    });
  }

  // ==========================================
  // 👇 FEED EXCLUSIVO +18 👇
  // ==========================================
  async getAdultFeed() {
    return this.prisma.video.findMany({
      where: { is18Plus: true }, // 👈 AQUÍ SOLO ENTRAN LOS +18
      include: { 
        user: true,
        _count: { select: { likes: true, comments: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  // ==========================================
  // 👇 FUNCIONES PARA REMATES (SUBASTAS) 👇
  // ==========================================

  async createRemate(userId: string, playbackId: string, productName: string, basePrice: number, muxAssetId?: string) {
    const videoUrl = `https://stream.mux.com/${playbackId}.m3u8`;
    const auctionEndsAt = new Date();
    auctionEndsAt.setHours(auctionEndsAt.getHours() + 24);

    const newRemate = await this.prisma.video.create({
      data: {
        userId, description: "Remate 24hs", videoUrl, productName, 
        productPrice: basePrice, isAuction: true, auctionEndsAt,
        muxAssetId // 👈 LO GUARDAMOS EN LA BASE DE DATOS
      },
    });
    return { message: '¡Remate publicado con éxito!', remate: newRemate };
  }

  async getActiveAuctions() {
    const auctions = await this.prisma.video.findMany({
      where: {
        isAuction: true,
        is18Plus: false,
        auctionEndsAt: { gt: new Date() }
      },
      include: { 
        user: true,
        bids: { include: { user: true }, orderBy: { amount: 'desc' } }
      },
      orderBy: { auctionEndsAt: 'asc' }
    });

    // 👇 AQUÍ ESTÁ LA MAGIA: Convertimos la fecha en un Sí/No para el puntito 👇
    return auctions.map(auction => {
      const isOnline = auction.user.lastActive 
        ? (new Date().getTime() - new Date(auction.user.lastActive).getTime()) < 300000 
        : false;

      return {
        ...auction,
        user: { ...auction.user, isOnline } 
      };
    });
  }

  async placeBid(videoId: string, userId: string, amount: number) {
    const video = await this.prisma.video.findUnique({ where: { id: videoId } });
    if (!video || !video.isAuction || new Date() > new Date(video.auctionEndsAt!)) {
      throw new Error('El remate ya finalizó o no existe.');
    }

    const bid = await this.prisma.bid.create({
      data: { videoId, userId, amount },
      include: { user: true }
    });

    await this.prisma.video.update({
      where: { id: videoId },
      data: { productPrice: amount }
    });

    return bid;
  }

  // 👇 NUEVO: Aplicar un descuento a un video
  async setDiscount(videoId: string, userId: string, discountPrice: number) {
    const video = await this.prisma.video.findUnique({ where: { id: videoId } });
    if (!video || video.userId !== userId) throw new Error('No autorizado');

    return this.prisma.video.update({
      where: { id: videoId },
      data: { discountPrice } // Guarda el precio de oferta
    });
  }

  // 👇 NUEVO: Servicio para crear denuncias
  async createReport(reporterId: string, targetId: string, type: string, reason: string) {
    return this.prisma.report.create({
      data: { reporterId, targetId, type, reason }
    });
  }
  
  // ==========================================
  // Borrar videos (solo para el dueño del video o admin)
  // ==========================================

  async deleteVideo(videoId: string, userId: string) {
    const video = await this.prisma.video.findUnique({ where: { id: videoId } });
    
    if (!video || video.userId !== userId) {
      throw new Error('No autorizado o video no encontrado');
    }

    // 👇 1. BORRAMOS EL VIDEO FÍSICO DE MUX PRIMERO 👇
    if (video.muxAssetId) {
      try {
        await this.mux.video.assets.delete(video.muxAssetId);
        console.log(`🗑️ Video eliminado de los servidores de Mux: ${video.muxAssetId}`);
      } catch (error) {
        console.error("❌ Error al borrar en Mux (Puede que ya no exista):", error);
      }
    }

    // 2. Borramos los datos de Prisma
    return this.prisma.$transaction([
      this.prisma.like.deleteMany({ where: { videoId } }),
      this.prisma.comment.deleteMany({ where: { videoId } }),
      this.prisma.savedVideo.deleteMany({ where: { videoId } }),
      this.prisma.bid.deleteMany({ where: { videoId } }), 
      
      this.prisma.video.delete({
        where: { id: videoId }
      })
    ]);
  }

  async updateThumbnailTime(videoId: string, userId: string, time: number) {
  const video = await this.prisma.video.findUnique({ where: { id: videoId } });
  if (!video || video.userId !== userId) throw new Error('No autorizado');

  return this.prisma.video.update({
    where: { id: videoId },
    data: { thumbnailTime: time }
  });
}

  // ==========================================
  // ⚖️ EL ROBOT AUTOMÁTICO QUE CIERRA REMATES
  // ==========================================

  @Cron(CronExpression.EVERY_MINUTE)
  async checkAndCloseAuctions() {
    const now = new Date();

    // 1. Busca remates que ya pasaron las 24 horas y siguen abiertos
    const expiredAuctions = await this.prisma.video.findMany({
      where: {
        isAuction: true,
        isAuctionClosed: false,
        auctionEndsAt: { lte: now } 
      },
      include: { 
        bids: { orderBy: { amount: 'desc' }, take: 1, include: { user: true } },
        user: true 
      }
    });

    if (expiredAuctions.length === 0) return;

    // 2. Si encuentra remates vencidos, los procesa
    for (const auction of expiredAuctions) {
      // Los marca como CERRADOS en la base de datos
      await this.prisma.video.update({
        where: { id: auction.id },
        data: { isAuctionClosed: true }
      });

      // 3. Vemos si hubo un ganador y le armamos el chat
      if (auction.bids.length > 0) {
        const winner = auction.bids[0].user;
        const finalPrice = auction.bids[0].amount;
        const sellerId = auction.userId;
        
        console.log(`🎉 REMATE CERRADO: ${auction.productName}`);
        
        try {
          // CREA EL CHAT AUTOMÁTICAMENTE
          await this.prisma.chat.create({
            data: {
              participants: { connect: [{ id: sellerId }, { id: winner.id }] },
              messages: {
                create: {
                  text: `🎉 ¡Felicidades @${winner.username}! Has ganado mi remate de "${auction.productName}" por $${finalPrice.toLocaleString('es-AR')}. Coordinemos por aquí el pago y el envío.`,
                  senderId: sellerId 
                }
              }
            }
          });
          console.log(`💬 Chat creado exitosamente.`);
          // 👇 ¡NUEVO: DISPARAR NOTIFICACIÓN PUSH AL CELULAR! 👇
          if (winner.pushToken && Expo.isExpoPushToken(winner.pushToken)) {
            try {
              await this.expo.sendPushNotificationsAsync([{
                to: winner.pushToken,
                sound: 'default',
                title: '¡Ganaste el remate! 🎉',
                body: `Tu oferta de $${finalPrice} fue la más alta por "${auction.productName}". ¡Toca aquí para coordinar el pago!`,
                data: { route: 'ChatDetails', chatId: auction.id }, // Para que al tocar la notificación abra el chat
              }]);
              console.log(`📱 Notificación Push enviada al celular de @${winner.username}`);
            } catch (pushError) {
              console.error(`❌ Error enviando Push al ganador:`, pushError);
            }
          }
        } catch (error) {
          console.error(`❌ Error creando el chat:`, error);
        }
      } else {
        console.log(`😔 REMATE CERRADO: ${auction.productName} (Sin ofertas)`);
      }
    }
  }
}