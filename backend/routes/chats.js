// backend/routes/chats.js
const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

router.get('/chats', async (req, res) => {
  try {
    // Asumimos que tienes el ID del usuario autenticado
    // const currentUserId = req.user.id; 
    const currentUserId = "AQUI_VA_EL_ID_DEL_USUARIO"; // Cambiar por tu lógica de auth

    // 1. Buscamos los chats donde el usuario actual es participante
    const chats = await prisma.chat.findMany({
      where: {
        participants: {
          some: { id: currentUserId }
        }
      },
      include: {
        participants: true,
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1 // Solo traemos el último mensaje para la previsualización
        }
      },
      orderBy: { updatedAt: 'desc' }
    });

    // 2. Formateamos los datos para que el frontend los reciba tal cual los espera
    const formattedChats = chats.map(chat => {
      // Identificamos a la "otra" persona en el chat
      const otherUser = chat.participants.find(p => p.id !== currentUserId);
      const lastMsg = chat.messages[0];

      // Calculamos mensajes sin leer (donde el usuario no es el remitente)
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

    res.json(formattedChats);

  } catch (error) {
    console.error("Error con Prisma:", error);
    res.status(500).json({ error: "Error obteniendo chats" });
  }
});

module.exports = router;