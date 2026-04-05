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
  uploadImageToCloudinary(fileBuffer: Buffer): Promise<string> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder: 'viralshop_avatars' }, // Se creará esta carpeta en tu Cloudinary
        (error, result) => {
          if (error) return reject(error);
          resolve(result.secure_url); // Devuelve la URL pública y segura (https)
        },
      );
      streamifier.createReadStream(fileBuffer).pipe(uploadStream);
    });
  }
}