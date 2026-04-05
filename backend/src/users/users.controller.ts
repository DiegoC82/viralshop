// backend/src/users/users.controller.ts
import { Controller, Get, Post, UseGuards, Request, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
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

  // 👇 NUEVA RUTA: Recibe la foto de perfil 👇
  @UseGuards(JwtAuthGuard)
  @Post('avatar')
  @UseInterceptors(FileInterceptor('avatar', {
    storage: diskStorage({
      destination: './uploads',
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, `avatar-${uniqueSuffix}${extname(file.originalname)}`);
      }
    })
  }))
  async uploadAvatar(@UploadedFile() file: Express.Multer.File, @Request() req: any) {
    if (!file) throw new BadRequestException('No se envió ninguna imagen');
    
    const userId = req.user.sub;

    // 👇 SOLUCIÓN: En lugar de req.get('host'), usa tu IP fija aquí 👇
    const miIP = '192.168.100.107'; // <-- ¡PON TU IP REAL AQUÍ!
    const avatarUrl = `http://${miIP}:3000/uploads/${file.filename}`;

    console.log("Nueva foto guardada en:", avatarUrl); // Esto te ayudará a ver la ruta en la terminal

    await this.usersService.updateAvatar(userId, avatarUrl);
    
    return { message: 'Foto de perfil actualizada', avatarUrl };
  }
}