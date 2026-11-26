import { Module } from '@nestjs/common'
import { HealthController } from './health/health.controller.js'
import { HealthService } from './health/health.service.js'
import { PrismaModule } from './prisma/prisma.module.js'
import { AuthModule } from './auth/auth.module.js'
import { UsersModule } from './users/users.module.js'
import { MediaModule } from './media/media.module.js'
import { LibraryModule } from './library/library.module.js'

@Module({
  imports: [PrismaModule, AuthModule, UsersModule, MediaModule, LibraryModule],
  controllers: [HealthController],
  providers: [HealthService],
})
export class AppModule {}
