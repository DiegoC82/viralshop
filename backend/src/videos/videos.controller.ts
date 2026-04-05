// backend/src/videos/videos.controller.ts
import { Controller, Get, Post, Param, UseGuards, Request, Body, UseInterceptors, UploadedFile, BadRequestException, Query } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { VideosService } from './videos.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('videos')
export class VideosController {
  constructor(private readonly videosService: VideosService) {}

  @Get('feed')
  getFeed() {
    return this.videosService.getFeed();
  }

  // 👇 NUEVA RUTA DE BÚSQUEDA 👇
  @Get('search')
  searchVideos(@Query('q') query: string) {
    if (!query) return [];
    return this.videosService.searchVideos(query);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/like')
  toggleLike(@Param('id') videoId: string, @Request() req: any) {
    const userId = req.user.sub; 
    return this.videosService.toggleLike(videoId, userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('upload')
  @UseInterceptors(FileInterceptor('video', {
    storage: diskStorage({
      destination: './uploads',
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, `video-${uniqueSuffix}${extname(file.originalname)}`);
      }
    })
  }))
  async uploadVideo(
    @UploadedFile() file: Express.Multer.File, 
    @Body('description') description: string, 
    // 👇 Recibimos los datos del producto 👇
    @Body('productName') productName: string, 
    @Body('productPrice') productPrice: string, 
    @Body('productLink') productLink: string, 
    @Request() req: any
  ) {
    if (!file) throw new BadRequestException('No se envió ningún video');
    const userId = req.user.sub;
    
    const playbackId = await this.videosService.uploadToMux(file.path);

    // 👇 Pasamos los datos al servicio 👇
    const price = productPrice ? parseFloat(productPrice) : null;
    return this.videosService.createVideo(userId, description, playbackId, productName, price, productLink);
  }
}