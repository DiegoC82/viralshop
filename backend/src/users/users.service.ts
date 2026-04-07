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
      select: { id: true, username: true, name: true, email: true, avatarUrl: true, createdAt: true, videos: true },
    });
    return user;
  }

  async updateAvatar(userId: string, avatarUrl: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { avatarUrl },
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