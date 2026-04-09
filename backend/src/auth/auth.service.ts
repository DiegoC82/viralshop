// backend/src/auth/auth.service.ts
import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService, private jwtService: JwtService) {}

  async register(body: any) {
    const { email, username, name, password } = body;

    const userExists = await this.prisma.user.findUnique({ where: { email } });
    if (userExists) throw new BadRequestException('El email ya está registrado');

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await this.prisma.user.create({
      data: { email, username, name, password: hashedPassword },
    });

    const payload = { sub: newUser.id, username: newUser.username, role: newUser.role };
    const token = await this.jwtService.signAsync(payload);

    return { message: 'Cuenta creada con éxito', token, user: newUser };
  }

  async login(body: any) {
    const { email, password } = body;

    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new UnauthorizedException('Credenciales incorrectas');

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) throw new UnauthorizedException('Credenciales incorrectas');

    const payload = { sub: user.id, username: user.username, role: user.role };
    const token = await this.jwtService.signAsync(payload);

    return { message: 'Inicio de sesión exitoso', token, user };
  }

  // 👇 NUEVA LÓGICA PARA GUARDAR USUARIOS DE GOOGLE 👇
  async socialLogin(body: any) {
    const { email, name, avatarUrl, provider } = body;

    // 1. Buscamos si el correo de Google ya está en tu base de datos
    let user = await this.prisma.user.findUnique({ where: { email } });

    // 2. Si no existe, creamos su perfil automáticamente
    if (!user) {
      // Creamos un username aleatorio basado en su correo
      const baseName = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
      const uniqueSuffix = Math.floor(Math.random() * 10000);
      const newUsername = `${baseName}_${uniqueSuffix}`;

      // Le generamos una contraseña aleatoria encriptada (para que Prisma no se queje)
      const randomPassword = Math.random().toString(36).slice(-10);
      const hashedPassword = await bcrypt.hash(randomPassword, 10);

      user = await this.prisma.user.create({
        data: {
          email: email,
          name: name,
          username: newUsername,
          password: hashedPassword,
          avatarUrl: avatarUrl,
          isVerified: true // Confiamos en Google, así que entra verificado
        },
      });
    }

    // 3. Generamos el Token de tu app igual que en el login normal
    const payload = { sub: user.id, username: user.username, role: user.role };
    const token = await this.jwtService.signAsync(payload);

    return { message: 'Inicio de sesión social exitoso', token, user };
  }
}