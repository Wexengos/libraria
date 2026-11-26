import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import { Prisma } from '../generated/prisma/client.js'
import type { LibraryStatus } from '../generated/prisma/client.js'
import { PrismaService } from '../prisma/prisma.service.js'
import { MediaCatalogService } from '../media/media-catalog.service.js'
import type { AddLibraryEntryDto, LibraryCategory } from './dto/add-library-entry.dto.js'
import { statusesByCategory } from './dto/add-library-entry.dto.js'
import type { LibraryQueryDto } from './dto/library-query.dto.js'
import type { UpdateLibraryEntryDto } from './dto/update-library-entry.dto.js'

const categoryToMediaType = { films: 'FILM', music: 'ALBUM', books: 'BOOK' } as const
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
    private readonly catalog: MediaCatalogService,
  ) {}

  async add(userId: string, dto: AddLibraryEntryDto) {
    this.validateStatus(dto.category, dto.status ?? defaultStatus[dto.category])
    const categoryProvider: Record<LibraryCategory, string> = { films: 'tmdb', music: 'musicbrainz', books: 'openlibrary' }
    if (categoryProvider[dto.category] !== dto.provider) throw new BadRequestException('The provider does not match the selected category.')
    const mediaItem = await this.catalog.resolve(dto.category, dto.externalId)
    const startedAt = dateValue(dto.startedAt)
    const completedAt = dateValue(dto.completedAt)
    this.validateDates(startedAt ?? null, completedAt ?? null)

    try {
      const entry = await this.prisma.$transaction(async (tx) => {
        const created = await tx.userMedia.create({
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
        await tx.activity.create({ data: { userId, activityType: 'MEDIA_ADDED', mediaItemId: mediaItem.id } })
        if (dto.rating != null) await tx.activity.create({ data: { userId, activityType: 'RATING_SET', mediaItemId: mediaItem.id } })
        return created
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

    const entry = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.userMedia.update({
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
      if (dto.status !== undefined && dto.status !== existing.status) {
        await tx.activity.create({ data: { userId, activityType: 'LIBRARY_STATUS_CHANGED', mediaItemId: existing.mediaItemId } })
      }
      if (dto.rating != null && Math.round(dto.rating * 2) !== existing.ratingHalfSteps) {
        await tx.activity.create({ data: { userId, activityType: 'RATING_SET', mediaItemId: existing.mediaItemId } })
      }
      return updated
    })
    return presentEntry(entry)
  }

  async remove(userId: string, id: string) {
    const result = await this.prisma.userMedia.deleteMany({ where: { id, userId } })
    if (result.count === 0) throw new NotFoundException('Library entry not found.')
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
