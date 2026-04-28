import { Controller, Get, Patch, Body, Post, Param, Req, UseGuards, Request, UseInterceptors, UploadedFile, BadRequestException, Query } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer'; // 👇 Cambiamos diskStorage por memoryStorage
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // 👇 RUTA FALTANTE RECUPERADA: La que trae TODOS tus datos 👇
  @UseGuards(JwtAuthGuard)
  @Get('me')
  getProfile(@Request() req: any) {
    // Escudo antibalas para leer el token sí o sí
    const userId = req.user.sub || req.user.id || req.user.userId;
    return this.usersService.getProfile(userId);
  }

  // 👇 RUTA ACTUALIZADA: La que guarda tu verificación y biografía 👇
  @UseGuards(JwtAuthGuard)
  @Patch('profile')
  async updateProfile(@Request() req: any, @Body() body: { bio?: string; isVerified?: boolean }) {
    const userId = req.user.sub || req.user.id || req.user.userId;
    return this.usersService.updateProfile(userId, body.bio, body.isVerified);
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

  // 👇 NUEVA RUTA: Buscar Usuarios 👇
  @Get('search')
  searchUsers(@Query('q') query: string) {
    return this.usersService.searchUsers(query);
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

  @UseGuards(JwtAuthGuard)
  @Patch('active')
  async updateActiveStatus(@Request() req: any) {
    return this.usersService.updateLastActive(req.user.sub);
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
  
  // 👇 NUEVA RUTA: Obtener Actividad 👇
  @UseGuards(JwtAuthGuard)
  @Get('activity')
  getActivity(@Request() req: any) {
    const userId = req.user.sub;
    return this.usersService.getActivity(userId);
  }

  // 👇 RUTA PARA VER LA ACTIVIDAD DE OTROS PERFILES 👇
  @Get(':id/activity')
  getPublicActivity(@Param('id') id: string) {
    return this.usersService.getActivity(id);
  }

}