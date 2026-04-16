import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { VideosModule } from './videos/videos.module';
import { UsersModule } from './users/users.module';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaService } from './prisma.service'; // 👈 1. Importamos el módulo
import { ChatsController } from './chats/chats.controller';

@Module({
  imports: [AuthModule, VideosModule, UsersModule, ScheduleModule.forRoot()],
  controllers: [AppController, ChatsController],
  providers: [AppService, PrismaService], // 👈 2. Agregamos PrismaService a los providers
})
export class AppModule {}
