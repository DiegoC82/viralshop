// backend/src/prisma.service.ts
import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Buscamos el .env en la raíz de backend
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    const url = process.env.DATABASE_URL;
    
    if (!url) {
      throw new Error('❌ ¡CRÍTICO! No se encontró la variable DATABASE_URL.');
    }

    // 1. Creamos un "Pool" (grupo de conexiones de alto rendimiento)
    const pool = new Pool({ connectionString: url });
    
    // 2. Creamos el adaptador oficial de Prisma para Postgres
    const adapter = new PrismaPg(pool);

    // 3. Le pasamos el adaptador a Prisma (¡Como exige la versión 7!)
    super({ adapter });
  }

  async onModuleInit() {
    this.logger.log('Conectando a la base de datos Neon...');
    await this.$connect();
    this.logger.log('✅ ¡Conexión exitosa a Neon!');
  }
}