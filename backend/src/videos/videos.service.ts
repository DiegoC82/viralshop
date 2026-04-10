// backend/src/videos/videos.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import Mux from '@mux/mux-node';
import * as fs from 'fs';

@Injectable()
export class VideosService {
  private mux: Mux;

  constructor(private prisma: PrismaService) {
    this.mux = new Mux({
      tokenId: process.env.MUX_TOKEN_ID,
      tokenSecret: process.env.MUX_TOKEN_SECRET,
    });
  }

  async getFeed() {
    return this.prisma.video.findMany({ include: { user: true }, orderBy: { createdAt: 'desc' } });
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

  // 👇 NUEVAS FUNCIONES PARA COMENTARIOS Y GUARDADOS 👇

  async getComments(videoId: string) {
    // Busca los comentarios de un video específico e incluye los datos del usuario que lo escribió
    return this.prisma.comment.findMany({
      where: { videoId },
      include: { user: true }, 
      orderBy: { createdAt: 'desc' } // Los más nuevos arriba
    });
  }

  async addComment(videoId: string, userId: string, text: string) {
    // Crea el comentario y devuelve la info completa (incluyendo foto del usuario) para la app
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

  // ---------------------------------------------------

  async uploadToMux(filePath: string): Promise<string> {
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

    return asset.playback_ids[0].id;
  }

  async createVideo(
    userId: string, 
    description: string, 
    playbackId: string, 
    productName?: string, 
    productPrice?: number, 
    productLink?: string,
    // 👇 AGREGAMOS LOS NUEVOS PARÁMETROS AQUÍ 👇
    category?: string,
    subCategory?: string,
    latitude?: number,
    longitude?: number
  ) {
    const videoUrl = `https://stream.mux.com/${playbackId}.m3u8`;
    
    const newVideo = await this.prisma.video.create({
      data: { 
        userId, 
        description, 
        videoUrl, 
        productName, 
        productPrice, 
        productLink,
        // 👇 GUARDAMOS TODO EN LA BASE DE DATOS 👇
        category,
        subCategory,
        latitude,
        longitude
      },
    });
    return { message: '¡Video publicado con éxito!', video: newVideo };
  }

 // 👇 REEMPLAZA LA FUNCIÓN AL FINAL DEL ARCHIVO 👇
  async searchVideos(query?: string, category?: string, subcategory?: string, lat?: string, lng?: string, radius?: string) {
    const whereClause: any = {};

    // 1. Filtro por texto
    if (query) {
      whereClause.OR = [
        { productName: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
        { user: { username: { contains: query, mode: 'insensitive' } } }
      ];
    }

    // 2. Filtro por Categoría
    if (category && category !== 'Todos') {
      whereClause.category = category;
    }

    // 3. Filtro por Sub-categoría
    if (subcategory) {
      whereClause.subCategory = subcategory;
    }

    // 4. Filtro por GPS (Radio en KM)
    if (lat && lng && radius) {
      const latNum = parseFloat(lat);
      const lngNum = parseFloat(lng);
      const radiusKm = parseFloat(radius);
      const degreeRadius = radiusKm / 111; // 1 grado son aprox 111km

      whereClause.latitude = {
        gte: latNum - degreeRadius,
        lte: latNum + degreeRadius,
      };
      whereClause.longitude = {
        gte: lngNum - degreeRadius,
        lte: lngNum + degreeRadius,
      };
    }

    // Ejecutamos la búsqueda combinada
    return this.prisma.video.findMany({
      where: whereClause,
      include: { user: true },
      orderBy: { createdAt: 'desc' }
    });
  }
}