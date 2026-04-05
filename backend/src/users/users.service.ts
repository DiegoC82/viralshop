import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        videos: {
          orderBy: { createdAt: 'desc' } // Los más nuevos primero
        }
      }
    });

    if (!user) throw new NotFoundException('Usuario no encontrado');
    
    // Ocultamos la contraseña por seguridad antes de enviarlo al celular
    const { password, ...result } = user;
    return result;
  }

  // backend/src/users/users.service.ts
  
  async updateAvatar(userId: string, avatarUrl: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { avatarUrl },
    });
  }
}