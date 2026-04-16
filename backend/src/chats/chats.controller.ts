// backend/src/chats/chats.controller.ts
import { Controller, Get, Post, Param, Body, Request, UseGuards } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('chats')
export class ChatsController {
  constructor(private prisma: PrismaService) {}

  // ==========================================
  // 1. OBTENER LA BANDEJA DE ENTRADA (INBOX)
  // ==========================================
  @UseGuards(JwtAuthGuard)
  @Get()
  async getChats(@Request() req) {
    const currentUserId = req.user.sub;

    const chats = await this.prisma.chat.findMany({
      where: {
        participants: { some: { id: currentUserId } }
      },
      include: {
        participants: true,
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      },
      orderBy: { updatedAt: 'desc' }
    });

    const formattedChats = chats.map(chat => {
      const otherUser = chat.participants.find(p => p.id !== currentUserId);
      const lastMsg = chat.messages[0];

      const unreadCount = chat.messages.filter(
        m => m.senderId !== currentUserId && !m.isRead
      ).length;

      return {
        id: chat.id,
        name: otherUser ? otherUser.name : 'Usuario Desconocido',
        avatar: otherUser?.avatarUrl || 'https://via.placeholder.com/150',
        lastMessage: lastMsg ? lastMsg.text : 'Sin mensajes',
        time: lastMsg ? lastMsg.createdAt : chat.updatedAt,
        unreadCount: unreadCount
      };
    });

    return formattedChats; 
  }

  // ==========================================
  // 2. LEER MENSAJES DE UN CHAT ESPECÍFICO
  // ==========================================
  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async getChatMessages(@Param('id') chatId: string) {
    return this.prisma.message.findMany({
      where: { chatId },
      orderBy: { createdAt: 'desc' } // Los más nuevos primero para la lista invertida
    });
  }

  // ==========================================
  // 3. ENVIAR UN NUEVO MENSAJE
  // ==========================================
  @UseGuards(JwtAuthGuard)
  @Post(':id')
  async sendMessage(
    @Param('id') chatId: string, 
    @Body('text') text: string, 
    @Request() req
  ) {
    const senderId = req.user.sub;

    const newMessage = await this.prisma.message.create({
      data: { text, chatId, senderId }
    });

    // Actualizamos la fecha del chat para que suba arriba en la bandeja de entrada
    await this.prisma.chat.update({
      where: { id: chatId },
      data: { updatedAt: new Date() }
    });

    return newMessage;
  }

  // ==========================================
  // NUEVO: INICIAR O BUSCAR UN CHAT EXISTENTE
  // ==========================================
  @UseGuards(JwtAuthGuard)
  @Post('start/:userId')
  async findOrCreateChat(@Param('userId') targetUserId: string, @Request() req) {
    const currentUserId = req.user.sub;

    // 1. Buscamos si ya existe un chat entre estas dos personas
    const existingChat = await this.prisma.chat.findFirst({
      where: {
        AND: [
          { participants: { some: { id: currentUserId } } },
          { participants: { some: { id: targetUserId } } }
        ]
      }
    });

    if (existingChat) return existingChat;

    // 2. Si no existe, creamos una sala de chat nueva para ellos
    return this.prisma.chat.create({
      data: {
        participants: {
          connect: [{ id: currentUserId }, { id: targetUserId }]
        }
      }
    });
  }
}