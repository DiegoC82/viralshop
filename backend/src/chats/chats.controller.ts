import { Controller, Get, Request, UseGuards } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard'; // Importamos el Guard

@Controller('chats')
export class ChatsController {
  constructor(private prisma: PrismaService) {}

  @UseGuards(JwtAuthGuard) // Esto protege la ruta
  @Get()
  async getChats(@Request() req) {
    const currentUserId = req.user.id; // Ya viene del token gracias al Guard

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

    // Formateamos los datos para que el frontend los reciba tal cual los espera
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
}
