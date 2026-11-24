import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../generated/prisma/client.js'

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    const connectionString = process.env.DATABASE_URL
    const adapter = new PrismaPg({
      connectionString: connectionString ?? 'postgresql://localhost:5432/libraria',
      max: 5,
      connectionTimeoutMillis: 5_000,
    })

    super({ adapter })
  }

  async onModuleInit() {
    if (process.env.DATABASE_URL) await this.$connect()
  }

  async onModuleDestroy() {
    await this.$disconnect()
  }
}
