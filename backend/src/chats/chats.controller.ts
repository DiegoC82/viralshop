// backend/src/chats/chats.controller.ts
import { Controller, Get, Post, Param, Body, Request, UseGuards } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Expo } from 'expo-server-sdk'; // 👈 1. IMPORTAMOS EXPO

@Controller('chats')
export class ChatsController {
  private expo = new Expo(); // 👈 2. INICIALIZAMOS EXPO

  constructor(private prisma: PrismaService) {}

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

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async getChatMessages(@Param('id') chatId: string) {
    return this.prisma.message.findMany({
      where: { chatId },
      orderBy: { createdAt: 'desc' } 
    });
  }

  // 👇 3. LA MAGIA SUCEDE AQUÍ: ENVIAR MENSAJE Y NOTIFICAR 👇
  @UseGuards(JwtAuthGuard)
  @Post(':id')
  async sendMessage(
    @Param('id') chatId: string, 
    @Body('text') text: string, 
    @Request() req
  ) {
    const senderId = req.user.sub;

    // A. Guardamos el mensaje en la base de datos
    const newMessage = await this.prisma.message.create({
      data: { text, chatId, senderId }
    });

    // B. Actualizamos la fecha del chat y TRAEMOS A LOS PARTICIPANTES
    const updatedChat = await this.prisma.chat.update({
      where: { id: chatId },
      data: { updatedAt: new Date() },
      include: { participants: true } // Necesitamos sus datos para la notificación
    });

    // C. Identificamos quién envía y quién recibe
    const senderUser = updatedChat.participants.find(p => p.id === senderId);
    const recipientUser = updatedChat.participants.find(p => p.id !== senderId);

    // D. DISPARAMOS LA NOTIFICACIÓN PUSH AL CELULAR
    if (recipientUser && recipientUser.pushToken && Expo.isExpoPushToken(recipientUser.pushToken)) {
      const messages = [{
        to: recipientUser.pushToken,
        sound: 'default' as const, // Hace que el celular suene como WhatsApp
        title: `Nuevo mensaje de @${senderUser?.username || 'ViralShop'}`,
        body: text,
        data: { chatId: chatId, type: 'chat_message' }, // Datos ocultos para abrir el chat al tocar
      }];

      try {
        await this.expo.sendPushNotificationsAsync(messages);
      } catch (error) {
        console.error("Error enviando notificación Push:", error);
      }
    }

    return newMessage;
  }

  @UseGuards(JwtAuthGuard)
  @Post('start/:userId')
  async findOrCreateChat(@Param('userId') targetUserId: string, @Request() req) {
    const currentUserId = req.user.sub;

    const existingChat = await this.prisma.chat.findFirst({
      where: {
        AND: [
          { participants: { some: { id: currentUserId } } },
          { participants: { some: { id: targetUserId } } }
        ]
      }
    });

    if (existingChat) return existingChat;

    return this.prisma.chat.create({
      data: {
        participants: {
          connect: [{ id: currentUserId }, { id: targetUserId }]
        }
      }
    });
  }
}