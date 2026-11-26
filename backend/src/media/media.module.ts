import { Module } from '@nestjs/common'
import { MediaCacheService } from './media-cache.service.js'
import { MediaController } from './media.controller.js'
import { MediaProvidersService } from './media-providers.service.js'
import { MediaCatalogService } from './media-catalog.service.js'

@Module({ controllers: [MediaController], providers: [MediaCacheService, MediaProvidersService, MediaCatalogService], exports: [MediaProvidersService, MediaCatalogService] })
export class MediaModule {}
