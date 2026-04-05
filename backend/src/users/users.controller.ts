import { Controller, Get, Post, UseGuards, Request, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
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
}