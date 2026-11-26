import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module.js'
import { UsersModule } from '../users/users.module.js'
import { SocialController } from './social.controller.js'
import { SocialService } from './social.service.js'

@Module({ imports: [AuthModule, UsersModule], controllers: [SocialController], providers: [SocialService] })
export class SocialModule {}
