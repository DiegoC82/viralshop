// backend/src/videos/videos.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import Mux from '@mux/mux-node';
import * as fs from 'fs';

@Injectable()
export class VideosService {
  private mux: Mux;

  constructor(private prisma: PrismaService) {
    // 1. Inicializamos Mux con tus llaves del .env
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

  // 👇 NUEVA FUNCIÓN: ENVÍA EL ARCHIVO A MUX Y ESPERA EL PROCESAMIENTO 👇
  async uploadToMux(filePath: string): Promise<string> {
    // A. Pedimos un ticket de subida a los servidores de Mux
    const upload = await this.mux.video.uploads.create({
      new_asset_settings: { playback_policy: ['public'] },
      cors_origin: '*',
    });

    // B. Leemos el archivo mp4 que el celular envió a nuestra carpeta local y lo mandamos a Mux
    const fileBuffer = fs.readFileSync(filePath);
    await fetch(upload.url, {
      method: 'PUT',
      headers: { 'Content-Type': 'video/mp4' },
      body: fileBuffer,
    });

    // C. Mux toma un par de segundos en procesar el video. Hacemos un "Polling" para esperarlo.
    let assetId = null;
    while (!assetId) {
      await new Promise(resolve => setTimeout(resolve, 1500)); // Esperamos 1.5 segundos
      const check = await this.mux.video.uploads.retrieve(upload.id);
      assetId = check.asset_id;
    }

    // D. ¡Listo! Obtenemos el ID de reproducción final
    const asset = await this.mux.video.assets.retrieve(assetId);
    
    // E. (Opcional) Borramos el archivo local pesado porque Mux ya lo tiene en la nube
    fs.unlinkSync(filePath);

    return asset.playback_ids[0].id;
  }

  // 👇 ACTUALIZADA: Ahora guarda el enlace de Mux en tu Neon Database 👇
  async createVideo(userId: string, description: string, playbackId: string, productName?: string, productPrice?: number, productLink?: string) {
    const videoUrl = `https://stream.mux.com/${playbackId}.m3u8`;
    
    const newVideo = await this.prisma.video.create({
      // 👇 Guardamos el producto en la base de datos 👇
      data: { userId, description, videoUrl, productName, productPrice, productLink },
    });
    return { message: '¡Video publicado con éxito!', video: newVideo };
  }

  async searchVideos(query: string) {
    return this.prisma.video.findMany({
      where: {
        OR: [
          { productName: { contains: query, mode: 'insensitive' } }, // Busca en el nombre del producto
          { description: { contains: query, mode: 'insensitive' } }, // Busca en la descripción
          { user: { username: { contains: query, mode: 'insensitive' } } } // Busca por usuario
        ]
      },
      include: { user: true },
      orderBy: { createdAt: 'desc' }
    });
  }
}