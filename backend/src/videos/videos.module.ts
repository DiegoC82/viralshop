import { Module } from '@nestjs/common';
import { VideosService } from './videos.service';
import { VideosController } from './videos.controller';
import { PrismaService } from '../prisma.service'; // <-- ¡No olvides esto!
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Module({
  providers: [VideosService, PrismaService],
  controllers: [VideosController]
})
export class VideosModule {}