import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module.js'
import { MediaModule } from '../media/media.module.js'
import { UsersModule } from '../users/users.module.js'
import { ListsController } from './lists.controller.js'
import { ListsService } from './lists.service.js'

@Module({ imports: [AuthModule, MediaModule, UsersModule], controllers: [ListsController], providers: [ListsService] })
export class ListsModule {}
