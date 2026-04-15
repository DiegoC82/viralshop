import { Controller, Get, Patch, Body, Post, Param, Req, UseGuards, Request, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer'; // 👇 Cambiamos diskStorage por memoryStorage
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(JwtAuthGuard)
  @Get('me')
  getProfile(@Request() req: any) {
    const userId = req.user.sub;
    return this.usersService.getProfile(userId);
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

  // 👇 RUTA: Obtener Perfil Público
  @Get(':id/public')
  async getPublicProfile(@Param('id') id: string, @Req() req: any) {
    // Si el usuario está logueado, le pasamos su ID para saber si ya sigue a esta persona
    const currentUserId = req.user?.id; 
    return this.usersService.getPublicProfile(id, currentUserId);
  }

  // 👇 RUTA: Seguir / Dejar de seguir (Requiere estar logueado)
  @UseGuards(JwtAuthGuard) // 👈 Usa el nombre del Guard que tengas en tu proyecto para proteger rutas
  @Post(':id/follow')
  async toggleFollow(@Param('id') targetUserId: string, @Req() req: any) {
    return this.usersService.toggleFollow(targetUserId, req.user.id);
  }

  // 👇 RUTA: Guardar el token de notificaciones push
  @UseGuards(JwtAuthGuard) // (Usa el Guard de autenticación que tengas en tu proyecto)
  @Patch('update-push-token')
  async updatePushToken(@Req() req: any, @Body('pushToken') pushToken: string) {
    return this.usersService.updatePushToken(req.user.id, pushToken);
  }
}