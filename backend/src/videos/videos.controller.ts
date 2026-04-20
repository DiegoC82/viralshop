// backend/src/videos/videos.controller.ts
import { Controller, Get, Post, Param, Patch, UseGuards, Request, Body, UseInterceptors, UploadedFile, BadRequestException, Query, HttpException, HttpStatus } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { VideosService } from './videos.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import * as fs from 'fs';
import * as os from 'os';

@Controller('videos')
export class VideosController {
  constructor(private readonly videosService: VideosService) {}

  @Get('feed')
  getFeed(@Request() req: any) {
    // Extraemos el token manualmente para permitir tanto a invitados como usuarios logueados
    const authHeader = req.headers.authorization;
    let userId = null;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.split(' ')[1];
        const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
        userId = payload.sub; // Guardamos el ID del usuario
      } catch (e) {
        // Si no hay sesión válida, sigue como invitado
      }
    }
    return this.videosService.getFeed(userId);
  }

  @Get('search')
  searchVideos(
    @Query('q') query?: string,
    @Query('category') category?: string,
    @Query('subcategory') subcategory?: string,
    @Query('lat') lat?: string,
    @Query('lng') lng?: string,
    @Query('radius') radius?: string,
  ) {
    // Ahora atrapamos TODOS los filtros y se los pasamos al servicio
    return this.videosService.searchVideos(query, category, subcategory, lat, lng, radius);
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
    @Body('category') category: string,
    @Body('subCategory') subCategory: string,
    @Body('latitude') latitude: string,
    @Body('longitude') longitude: string,
    @Request() req: any
  ) {
    if (!file) throw new BadRequestException('No se envió ningún video');
    const userId = req.user.sub;
    
    // Subimos a Mux
    const playbackId = await this.videosService.uploadToMux(file.path);

    // Convertimos los textos a números si existen
    const price = productPrice ? parseFloat(productPrice) : null;
    const lat = latitude ? parseFloat(latitude) : null;
    const lng = longitude ? parseFloat(longitude) : null;

    // Se lo pasamos al servicio para que lo guarde en la BD
    return this.videosService.createVideo(
      userId, description, playbackId, productName, price, productLink, 
      category, subCategory, lat, lng
    );
  }

  // 👇 NUEVO: Ruta para guardar la oferta
  @UseGuards(JwtAuthGuard)
  @Patch(':id/oferta')
  async setDiscount(@Param('id') videoId: string, @Body('discountPrice') discountPrice: number, @Request() req: any) {
    return this.videosService.setDiscount(videoId, req.user.sub, discountPrice);
  }

  // ==========================================
  // 👇 NUEVAS RUTAS PARA REMATES (SUBASTAS) 👇
  // ==========================================

  @Get('remates')
  getActiveAuctions() {
    return this.videosService.getActiveAuctions();
  }

  @UseGuards(JwtAuthGuard)
  @Post('remate')
  @UseInterceptors(FileInterceptor('video', {
    storage: diskStorage({
      // 👇 1. Usamos la carpeta temporal nativa del servidor (A prueba de fallos en Render) 👇
      destination: os.tmpdir(), 
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, `remate-${uniqueSuffix}${extname(file.originalname)}`);
      }
    })
  }))
  async uploadRemate(
    @UploadedFile() file: Express.Multer.File, 
    @Body('title') title: string,
    @Body('basePrice') basePrice: string,
    @Request() req: any
  ) {
    try {
      if (!file) throw new BadRequestException('Falta el video del remate');
      const userId = req.user.sub;
      const priceNum = parseFloat(basePrice);

      // 1. Subimos a Mux
      const playbackId = await this.videosService.uploadToMux(file.path);

      // 2. Guardamos en la base de datos
      return await this.videosService.createRemate(userId, playbackId, title, priceNum);
      
    } catch (error: any) {
      // 👇 2. Si explota, le mandamos el error EXACTO al celular 👇
      console.error("🔥 Error crítico en uploadRemate:", error);
      throw new HttpException(
        error.message || 'Error desconocido en la base de datos o Mux',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/bid')
  async placeBid(@Param('id') videoId: string, @Body('amount') amount: number, @Request() req: any) {
    const userId = req.user.sub;
    return this.videosService.placeBid(videoId, userId, amount);
  }
}