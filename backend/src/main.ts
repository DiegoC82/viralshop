import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
// Es vital importar esto para poder servir archivos estáticos:
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

async function bootstrap() {
  // Le decimos a NestJS que actúe como una aplicación Express
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  
  app.enableCors(); // Permite que el celular se conecte sin problemas
  
  // 👇 AQUÍ ESTÁ LA LLAVE MÁGICA 👇
  // Le decimos que abra la carpeta "uploads" al mundo exterior
  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads/',
  });

  await app.listen(3000);
}
bootstrap();