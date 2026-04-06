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

  // 👇 NUEVAS RUTAS PARA COMENTARIOS Y GUARDADOS 👇

  // Leer comentarios (Cualquiera puede, incluso invitados)
  @Get(':id/comments')
  getComments(@Param('id') videoId: string) {
    return this.videosService.getComments(videoId);
  }

  // Escribir un comentario (Solo usuarios logueados)
  @UseGuards(JwtAuthGuard)
  @Post(':id/comments')
  addComment(@Param('id') videoId: string, @Body('text') text: string, @Request() req: any) {
    const userId = req.user.sub;
    return this.videosService.addComment(videoId, userId, text);
  }

  // Guardar video (Solo usuarios logueados)
  @UseGuards(JwtAuthGuard)
  @Post(':id/save')
  toggleSave(@Param('id') videoId: string, @Request() req: any) {
    const userId = req.user.sub;
    return this.videosService.toggleSave(videoId, userId);
  }

  // ---------------------------------------------------

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
    @Body('productName') productName: string, 
    @Body('productPrice') productPrice: string, 
    @Body('productLink') productLink: string, 
    @Request() req: any
  ) {
    if (!file) throw new BadRequestException('No se envió ningún video');
    const userId = req.user.sub;
    
    const playbackId = await this.videosService.uploadToMux(file.path);

    const price = productPrice ? parseFloat(productPrice) : null;
    return this.videosService.createVideo(userId, description, playbackId, productName, price, productLink);
  }
}