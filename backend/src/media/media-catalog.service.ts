import { BadRequestException, Injectable } from '@nestjs/common'
import { Prisma } from '../generated/prisma/client.js'
import { PrismaService } from '../prisma/prisma.service.js'
import type { LibraryCategory } from '../library/dto/add-library-entry.dto.js'
import { MediaProvidersService } from './media-providers.service.js'

const categories = {
  films: { type: 'FILM', providerCategory: 'film', provider: 'tmdb' },
  music: { type: 'ALBUM', providerCategory: 'music', provider: 'musicbrainz' },
  books: { type: 'BOOK', providerCategory: 'book', provider: 'openlibrary' },
} as const

function stringDetail(details: Record<string, string | number | null>, key: string): string | null {
  const value = details[key]
  return typeof value === 'string' ? value : null
}

function numberDetail(details: Record<string, string | number | null>, key: string): number | null {
  const value = details[key]
  return typeof value === 'number' ? value : null
}

@Injectable()
export class MediaCatalogService {
  constructor(private readonly prisma: PrismaService, private readonly providers: MediaProvidersService) {}

  async resolve(category: LibraryCategory, externalId: string) {
    const config = categories[category]
    let mediaItem = await this.find(config.provider, externalId)
    if (mediaItem) {
      if (mediaItem.type !== config.type) throw new BadRequestException('That provider identifier belongs to a different media category.')
      return mediaItem
    }

    const media = await this.providers.get(config.providerCategory, externalId)
    if (media.provider !== config.provider || media.externalId !== externalId || media.category !== config.providerCategory) {
      throw new BadRequestException('The provider response did not match the requested media item.')
    }
    const details = media.details
    const data: Prisma.MediaItemCreateInput = {
      title: media.title,
      description: media.description,
      type: config.type,
      releaseYear: media.releaseYear,
      coverImageUrl: media.coverImagePath,
      externalIdentifiers: { create: { provider: media.provider, externalId: media.externalId } },
      ...(category === 'films' ? { filmDetails: { create: { runtime: numberDetail(details, 'runtime'), director: stringDetail(details, 'director'), originalLanguage: stringDetail(details, 'originalLanguage') } } } : {}),
      ...(category === 'music' ? { albumDetails: { create: { artist: stringDetail(details, 'artist'), trackCount: numberDetail(details, 'trackCount'), releaseDate: stringDetail(details, 'releaseDate') } } } : {}),
      ...(category === 'books' ? { bookDetails: { create: { author: stringDetail(details, 'author') } } } : {}),
    }

    try {
      return await this.prisma.mediaItem.create({ data })
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') throw error
      mediaItem = await this.find(config.provider, externalId)
      if (!mediaItem) throw error
      if (mediaItem.type !== config.type) throw new BadRequestException('That provider identifier belongs to a different media category.')
      return mediaItem
    }
  }

  private async find(provider: string, externalId: string) {
    const identifier = await this.prisma.externalIdentifier.findUnique({
      where: { provider_externalId: { provider, externalId } },
      include: { mediaItem: true },
    })
    return identifier?.mediaItem ?? null
  }
}
