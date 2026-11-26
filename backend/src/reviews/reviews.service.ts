import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import { Prisma } from '../generated/prisma/client.js'
import { PrismaService } from '../prisma/prisma.service.js'
import { MediaCatalogService } from '../media/media-catalog.service.js'
import type { LibraryCategory } from '../library/dto/add-library-entry.dto.js'
import type { CreateReviewDto } from './dto/create-review.dto.js'
import type { UpdateReviewDto } from './dto/update-review.dto.js'

const reviewInclude = { user: { select: { id: true, username: true, displayName: true, avatarUrl: true } } } satisfies Prisma.ReviewInclude
const categoryProviders: Record<LibraryCategory, string> = { films: 'tmdb', music: 'musicbrainz', books: 'openlibrary' }

function presentListedReview<T extends { user: { id: string; username: string; displayName: string; avatarUrl: string | null; mediaEntries: Array<{ ratingHalfSteps: number | null }> } }>(review: T) {
  const { user, ...rest } = review
  const ratingHalfSteps = user.mediaEntries[0]?.ratingHalfSteps
  const author = { id: user.id, username: user.username, displayName: user.displayName, avatarUrl: user.avatarUrl }
  return { ...rest, user: author, rating: ratingHalfSteps == null ? null : ratingHalfSteps / 2 }
}

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService, private readonly catalog: MediaCatalogService) {}

  async list(provider: string, externalId: string) {
    if (!Object.values(categoryProviders).includes(provider)) throw new BadRequestException('Unknown media provider.')
    const identifier = await this.prisma.externalIdentifier.findUnique({
      where: { provider_externalId: { provider, externalId } },
      select: { mediaItemId: true },
    })
    if (!identifier) return []
    const entries = await this.prisma.review.findMany({
      where: { mediaItemId: identifier.mediaItemId },
      include: { user: { select: { id: true, username: true, displayName: true, avatarUrl: true, mediaEntries: { where: { mediaItemId: identifier.mediaItemId }, select: { ratingHalfSteps: true }, take: 1 } } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })
    return entries.map(presentListedReview)
  }

  async create(userId: string, dto: CreateReviewDto) {
    if (!dto.content.trim()) throw new BadRequestException('Review text cannot be empty.')
    const mediaItem = await this.catalog.resolve(dto.category, dto.externalId)
    try {
      const result = await this.prisma.$transaction(async (tx) => {
        const libraryEntry = await tx.userMedia.findUnique({
          where: { userId_mediaItemId: { userId, mediaItemId: mediaItem.id } },
          select: { ratingHalfSteps: true },
        })
        if (libraryEntry?.ratingHalfSteps == null) throw new BadRequestException('Set your rating above before posting a review.')
        const created = await tx.review.create({
          data: { userId, mediaItemId: mediaItem.id, title: dto.title?.trim() || null, content: dto.content.trim() },
          include: reviewInclude,
        })
        await tx.activity.create({ data: { userId, activityType: 'REVIEW_POSTED', mediaItemId: mediaItem.id, reviewId: created.id } })
        return { review: created, rating: libraryEntry.ratingHalfSteps / 2 }
      })
      return { ...result.review, rating: result.rating }
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('You already reviewed this title.')
      }
      throw error
    }
  }

  async update(userId: string, id: string, dto: UpdateReviewDto) {
    const existing = await this.prisma.review.findFirst({ where: { id, userId } })
    if (!existing) throw new NotFoundException('Review not found.')
    if (dto.content !== undefined && !dto.content.trim()) throw new BadRequestException('Review text cannot be empty.')
    const result = await this.prisma.$transaction(async (tx) => {
      const review = await tx.review.update({
        where: { id },
        data: {
          ...(dto.title === undefined ? {} : { title: dto.title?.trim() || null }),
          ...(dto.content === undefined ? {} : { content: dto.content.trim() }),
        },
        include: reviewInclude,
      })
      const libraryEntry = await tx.userMedia.findUnique({ where: { userId_mediaItemId: { userId, mediaItemId: existing.mediaItemId } }, select: { ratingHalfSteps: true } })
      return { review, rating: libraryEntry?.ratingHalfSteps == null ? null : libraryEntry.ratingHalfSteps / 2 }
    })
    return { ...result.review, rating: result.rating }
  }

  async remove(userId: string, id: string) {
    const result = await this.prisma.review.deleteMany({ where: { id, userId } })
    if (result.count === 0) throw new NotFoundException('Review not found.')
  }
}
