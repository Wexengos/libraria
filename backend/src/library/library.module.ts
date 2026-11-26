import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module.js'
import { MediaModule } from '../media/media.module.js'
import { UsersModule } from '../users/users.module.js'
import { LibraryController } from './library.controller.js'
import { LibraryService } from './library.service.js'

@Module({ imports: [AuthModule, MediaModule, UsersModule], controllers: [LibraryController], providers: [LibraryService] })
export class LibraryModule {}
