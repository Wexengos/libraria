import { Module } from '@nestjs/common'
import { MediaCacheService } from './media-cache.service.js'
import { MediaController } from './media.controller.js'
import { MediaProvidersService } from './media-providers.service.js'

@Module({ controllers: [MediaController], providers: [MediaCacheService, MediaProvidersService], exports: [MediaProvidersService] })
export class MediaModule {}
