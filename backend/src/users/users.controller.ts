import { Controller, Get, Patch, Body, Post, Param, Req, UseGuards, Request, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer'; // 👇 Cambiamos diskStorage por memoryStorage
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(JwtAuthGuard)
  @Patch('profile')
  async updateProfile(@Request() req: any, @Body() body: { bio?: string; isVerified?: boolean }) {
    return this.usersService.updateProfile(req.user.sub, body.bio, body.isVerified);
  }

  @UseGuards(JwtAuthGuard)
  @Post('avatar')
  @UseInterceptors(FileInterceptor('avatar', {
    storage: memoryStorage(), // Retenemos la imagen en memoria RAM
  }))
  async uploadAvatar(@UploadedFile() file: Express.Multer.File, @Request() req: any) {
    if (!file) throw new BadRequestException('No se envió ninguna imagen');
    
    const userId = req.user.sub;

    // 👇 Le pasamos el archivo en memoria a nuestra nueva función de Cloudinary
    const avatarUrl = await this.usersService.uploadImageToCloudinary(file.buffer);

    // Guardamos la URL de Cloudinary en la base de datos (Neon)
    await this.usersService.updateAvatar(userId, avatarUrl);
    
    return { message: 'Foto de perfil actualizada', avatarUrl };
  }

  @Patch('ping')
  @UseGuards(JwtAuthGuard)
  async ping(@Request() req: any) {
    // 👇 Corregido a req.user.sub para que coincida con tu sistema
    return this.usersService.updateLastActive(req.user.sub); 
  }
  
  // 👇 RUTA: Obtener Perfil Público
  @Get(':id/public')
  async getPublicProfile(@Param('id') id: string, @Req() req: any) {
    // Si el usuario está logueado, le pasamos su ID para saber si ya sigue a esta persona
    const currentUserId = req.user?.id; 
    return this.usersService.getPublicProfile(id, currentUserId);
  }

  // 👇 RUTA: Seguir / Dejar de seguir (Cambiamos req.user.id por req.user.sub)
  @UseGuards(JwtAuthGuard)
  @Post(':id/follow')
  async toggleFollow(@Param('id') targetUserId: string, @Req() req: any) {
    return this.usersService.toggleFollow(targetUserId, req.user.sub);
  }

  // 👇 RUTA: Guardar el token de notificaciones push (Cambiamos req.user.id por req.user.sub)
  @UseGuards(JwtAuthGuard)
  @Patch('update-push-token')
  async updatePushToken(@Req() req: any, @Body('pushToken') pushToken: string) {
    return this.usersService.updatePushToken(req.user.sub, pushToken);
  }
}