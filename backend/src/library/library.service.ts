import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import { Prisma } from '../generated/prisma/client.js'
import type { LibraryStatus } from '../generated/prisma/client.js'
import { PrismaService } from '../prisma/prisma.service.js'
import { MediaProvidersService } from '../media/media-providers.service.js'
import type { MediaCategory } from '../media/media.types.js'
import type { AddLibraryEntryDto, LibraryCategory } from './dto/add-library-entry.dto.js'
import { statusesByCategory } from './dto/add-library-entry.dto.js'
import type { LibraryQueryDto } from './dto/library-query.dto.js'
import type { UpdateLibraryEntryDto } from './dto/update-library-entry.dto.js'

const categoryToMediaType = { films: 'FILM', music: 'ALBUM', books: 'BOOK' } as const
const categoryToProviderCategory: Record<LibraryCategory, MediaCategory> = { films: 'film', music: 'music', books: 'book' }
const categoryToProvider: Record<LibraryCategory, string> = { films: 'tmdb', music: 'musicbrainz', books: 'openlibrary' }
const defaultStatus: Record<LibraryCategory, string> = { films: 'WATCHLIST', music: 'WANT_TO_LISTEN', books: 'WANT_TO_READ' }

const entryInclude = {
  mediaItem: {
    include: { externalIdentifiers: true, filmDetails: true, albumDetails: true, bookDetails: true },
  },
} satisfies Prisma.UserMediaInclude

function presentEntry<T extends { ratingHalfSteps: number | null }>(entry: T) {
  const { ratingHalfSteps, ...rest } = entry
  return { ...rest, rating: ratingHalfSteps === null ? null : ratingHalfSteps / 2 }
}

function stringDetail(details: Record<string, string | number | null>, key: string): string | null {
  const value = details[key]
  return typeof value === 'string' ? value : null
}

function numberDetail(details: Record<string, string | number | null>, key: string): number | null {
  const value = details[key]
  return typeof value === 'number' ? value : null
}

function dateValue(value: string | null | undefined): Date | null | undefined {
  if (value === undefined) return undefined
  if (value === null || value === '') return null
  const result = new Date(value)
  if (Number.isNaN(result.getTime())) throw new BadRequestException('Dates must be valid ISO date strings.')
  return result
}

@Injectable()
export class LibraryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly providers: MediaProvidersService,
  ) {}

  async add(userId: string, dto: AddLibraryEntryDto) {
    this.validateStatus(dto.category, dto.status ?? defaultStatus[dto.category])
    if (categoryToProvider[dto.category] !== dto.provider) throw new BadRequestException('The provider does not match the selected category.')

    let mediaItem = await this.findMedia(dto.provider, dto.externalId)
    if (!mediaItem) {
      const media = await this.providers.get(categoryToProviderCategory[dto.category], dto.externalId)
      const details = media.details
      const data: Prisma.MediaItemCreateInput = {
        title: media.title,
        description: media.description,
        type: categoryToMediaType[dto.category],
        releaseYear: media.releaseYear,
        coverImageUrl: media.coverImagePath,
        externalIdentifiers: { create: { provider: media.provider, externalId: media.externalId } },
        ...(dto.category === 'films'
          ? { filmDetails: { create: { runtime: numberDetail(details, 'runtime'), director: stringDetail(details, 'director'), originalLanguage: stringDetail(details, 'originalLanguage') } } }
          : {}),
        ...(dto.category === 'music'
          ? { albumDetails: { create: { artist: stringDetail(details, 'artist'), trackCount: numberDetail(details, 'trackCount'), releaseDate: stringDetail(details, 'releaseDate') } } }
          : {}),
        ...(dto.category === 'books'
          ? { bookDetails: { create: { author: stringDetail(details, 'author') } } }
          : {}),
      }

      try {
        mediaItem = await this.prisma.mediaItem.create({ data })
      } catch (error) {
        if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') throw error
        mediaItem = await this.findMedia(dto.provider, dto.externalId)
        if (!mediaItem) throw error
      }
    }

    if (mediaItem.type !== categoryToMediaType[dto.category]) throw new BadRequestException('That provider identifier belongs to a different media category.')
    const startedAt = dateValue(dto.startedAt)
    const completedAt = dateValue(dto.completedAt)
    this.validateDates(startedAt ?? null, completedAt ?? null)

    try {
      const entry = await this.prisma.userMedia.create({
        data: {
          userId,
          mediaItemId: mediaItem.id,
          status: (dto.status ?? defaultStatus[dto.category]) as LibraryStatus,
          ratingHalfSteps: dto.rating == null ? null : Math.round(dto.rating * 2),
          isFavorite: dto.isFavorite ?? false,
          notes: dto.notes?.trim() || null,
          startedAt: startedAt ?? null,
          completedAt: completedAt ?? null,
        },
        include: entryInclude,
      })
      return presentEntry(entry)
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('This item is already in your library.')
      }
      throw error
    }
  }

  async list(userId: string, query: LibraryQueryDto, pathCategory?: LibraryCategory) {
    const category = pathCategory ?? query.category
    if (category && query.status) this.validateStatus(category, query.status)
    const direction = query.direction ?? 'desc'
    let orderBy: Prisma.UserMediaOrderByWithRelationInput
    switch (query.sort ?? 'addedAt') {
      case 'title': orderBy = { mediaItem: { title: direction } }; break
      case 'releaseYear': orderBy = { mediaItem: { releaseYear: direction } }; break
      case 'rating': orderBy = { ratingHalfSteps: direction }; break
      default: orderBy = { createdAt: direction }
    }

    const entries = await this.prisma.userMedia.findMany({
      where: {
        userId,
        ...(category ? { mediaItem: { type: categoryToMediaType[category] } } : {}),
        ...(query.status ? { status: query.status as LibraryStatus } : {}),
        ...(query.favorite === undefined ? {} : { isFavorite: query.favorite === 'true' }),
      },
      include: entryInclude,
      orderBy,
      take: 100,
    })
    return entries.map(presentEntry)
  }

  async findEntryForMedia(userId: string, provider: string, externalId: string) {
    const entry = await this.prisma.userMedia.findFirst({
      where: {
        userId,
        mediaItem: { externalIdentifiers: { some: { provider, externalId } } },
      },
      include: entryInclude,
    })
    return entry ? presentEntry(entry) : null
  }

  async update(userId: string, id: string, dto: UpdateLibraryEntryDto) {
    const existing = await this.prisma.userMedia.findFirst({ where: { id, userId }, include: { mediaItem: true } })
    if (!existing) throw new NotFoundException('Library entry not found.')

    const category = this.categoryForType(existing.mediaItem.type)
    if (dto.status !== undefined) this.validateStatus(category, dto.status)
    const startedAt = dateValue(dto.startedAt)
    const completedAt = dateValue(dto.completedAt)
    this.validateDates(startedAt === undefined ? existing.startedAt : startedAt, completedAt === undefined ? existing.completedAt : completedAt)

    const entry = await this.prisma.userMedia.update({
      where: { id },
      data: {
        ...(dto.status === undefined ? {} : { status: dto.status as LibraryStatus }),
        ...(dto.rating === undefined ? {} : { ratingHalfSteps: dto.rating === null ? null : Math.round(dto.rating * 2) }),
        ...(dto.isFavorite === undefined ? {} : { isFavorite: dto.isFavorite }),
        ...(dto.notes === undefined ? {} : { notes: dto.notes?.trim() || null }),
        ...(startedAt === undefined ? {} : { startedAt }),
        ...(completedAt === undefined ? {} : { completedAt }),
      },
      include: entryInclude,
    })
    return presentEntry(entry)
  }

  async remove(userId: string, id: string) {
    const result = await this.prisma.userMedia.deleteMany({ where: { id, userId } })
    if (result.count === 0) throw new NotFoundException('Library entry not found.')
  }

  private findMedia(provider: string, externalId: string) {
    return this.prisma.externalIdentifier.findUnique({
      where: { provider_externalId: { provider, externalId } },
      include: { mediaItem: true },
    }).then((identifier) => identifier?.mediaItem ?? null)
  }

  private validateStatus(category: LibraryCategory, status: string) {
    if (!statusesByCategory[category].includes(status)) {
      throw new BadRequestException(`Status ${status} is not valid for ${category}.`)
    }
  }

  private categoryForType(type: (typeof categoryToMediaType)[LibraryCategory]): LibraryCategory {
    const result = (Object.entries(categoryToMediaType) as Array<[LibraryCategory, string]>).find(([, mediaType]) => mediaType === type)?.[0]
    if (!result) throw new BadRequestException('Unknown media category.')
    return result
  }

  private validateDates(startedAt: Date | null, completedAt: Date | null) {
    if (startedAt && completedAt && completedAt < startedAt) {
      throw new BadRequestException('Completed date must be on or after the started date.')
    }
  }
}
