// backend/src/auth/auth.service.ts
import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { JwtService } from '@nestjs/jwt'; // <-- Importamos el servicio JWT
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  // Agregamos JwtService al constructor
  constructor(private prisma: PrismaService, private jwtService: JwtService) {}

  async register(body: any) {
    const { email, username, name, password } = body;

    const userExists = await this.prisma.user.findUnique({ where: { email } });
    if (userExists) throw new BadRequestException('El email ya está registrado');

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await this.prisma.user.create({
      data: { email, username, name, password: hashedPassword },
    });

    // Creamos el Token para el nuevo usuario
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

    // Creamos el Token para el usuario que ingresa
    const payload = { sub: user.id, username: user.username, role: user.role };
    const token = await this.jwtService.signAsync(payload);

    return { message: 'Inicio de sesión exitoso', token, user };
  }
}