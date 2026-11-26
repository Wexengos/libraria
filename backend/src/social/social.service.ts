import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { Prisma } from '../generated/prisma/client.js'
import { PrismaService } from '../prisma/prisma.service.js'

const publicUserSelect = { id: true, username: true, displayName: true, bio: true, avatarUrl: true, createdAt: true } satisfies Prisma.UserProfileSelect
const activityInclude = {
  user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
  mediaItem: { select: { id: true, title: true, type: true, releaseYear: true, coverImageUrl: true, externalIdentifiers: { select: { provider: true, externalId: true } } } },
  review: { select: { id: true, title: true, content: true } },
  list: { select: { id: true, title: true, visibility: true } },
} satisfies Prisma.ActivityInclude

@Injectable()
export class SocialService {
  constructor(private readonly prisma: PrismaService) {}

  async follow(followerId: string, username: string) {
    const profile = await this.prisma.userProfile.findUnique({ where: { username: username.toLowerCase() }, select: { id: true } })
    if (!profile) throw new NotFoundException('Profile not found.')
    if (profile.id === followerId) throw new BadRequestException('You cannot follow your own profile.')
    await this.prisma.follow.upsert({
      where: { followerId_followingId: { followerId, followingId: profile.id } },
      create: { followerId, followingId: profile.id },
      update: {},
    })
    return { following: true }
  }

  async unfollow(followerId: string, username: string) {
    const profile = await this.prisma.userProfile.findUnique({ where: { username: username.toLowerCase() }, select: { id: true } })
    if (!profile) throw new NotFoundException('Profile not found.')
    await this.prisma.follow.deleteMany({ where: { followerId, followingId: profile.id } })
    return { following: false }
  }

  async summary(username: string, viewerId?: string) {
    const profile = await this.prisma.userProfile.findUnique({
      where: { username: username.toLowerCase() },
      select: { id: true, _count: { select: { followers: true, following: true } } },
    })
    if (!profile) throw new NotFoundException('Profile not found.')
    const isFollowing = viewerId && viewerId !== profile.id
      ? Boolean(await this.prisma.follow.findUnique({ where: { followerId_followingId: { followerId: viewerId, followingId: profile.id } }, select: { followerId: true } }))
      : false
    return { followersCount: profile._count.followers, followingCount: profile._count.following, isFollowing }
  }

  async community(search = '', viewerId?: string) {
    const query = search.trim()
    if (query.length > 80) throw new BadRequestException('Community search must be 80 characters or fewer.')
    const profiles = await this.prisma.userProfile.findMany({
      where: {
        ...(viewerId ? { id: { not: viewerId } } : {}),
        ...(query ? { OR: [
          { username: { contains: query, mode: 'insensitive' } },
          { displayName: { contains: query, mode: 'insensitive' } },
        ] } : {}),
      },
      select: { ...publicUserSelect, _count: { select: { followers: true, following: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
    if (!viewerId || profiles.length === 0) return profiles.map((profile) => ({ ...profile, isFollowing: false }))
    const follows = await this.prisma.follow.findMany({ where: { followerId: viewerId, followingId: { in: profiles.map((profile) => profile.id) } }, select: { followingId: true } })
    const followedIds = new Set(follows.map((follow) => follow.followingId))
    return profiles.map((profile) => ({ ...profile, isFollowing: followedIds.has(profile.id) }))
  }

  async connections(username: string, direction: 'followers' | 'following') {
    const profile = await this.prisma.userProfile.findUnique({ where: { username: username.toLowerCase() }, select: { id: true } })
    if (!profile) throw new NotFoundException('Profile not found.')
    const rows = await this.prisma.follow.findMany({
      where: direction === 'followers' ? { followingId: profile.id } : { followerId: profile.id },
      include: { [direction === 'followers' ? 'follower' : 'following']: { select: publicUserSelect } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })
    return rows.map((row) => ({ createdAt: row.createdAt, user: direction === 'followers' ? row.follower : row.following }))
  }

  async publicLists(username: string, viewerId?: string) {
    const profile = await this.prisma.userProfile.findUnique({ where: { username: username.toLowerCase() }, select: { id: true } })
    if (!profile) throw new NotFoundException('Profile not found.')
    return this.prisma.mediaList.findMany({
      where: { userId: profile.id, ...(viewerId === profile.id ? {} : { visibility: 'PUBLIC' }) },
      include: { _count: { select: { items: true } } },
      orderBy: { updatedAt: 'desc' },
      take: 50,
    })
  }

  async activityForUser(username: string, viewerId?: string) {
    const profile = await this.prisma.userProfile.findUnique({ where: { username: username.toLowerCase() }, select: { id: true } })
    if (!profile) throw new NotFoundException('Profile not found.')
    const isOwner = profile.id === viewerId
    return this.activity({ userId: profile.id, ...(!isOwner ? { OR: [{ listId: null }, { list: { visibility: 'PUBLIC' } }] } : {}) })
  }

  async feed(viewerId: string) {
    const follows = await this.prisma.follow.findMany({ where: { followerId: viewerId }, select: { followingId: true } })
    if (!follows.length) return []
    return this.activity({
      userId: { in: follows.map((follow) => follow.followingId) },
      OR: [{ listId: null }, { list: { visibility: 'PUBLIC' } }],
    })
  }

  private async activity(where: Prisma.ActivityWhereInput) {
    const entries = await this.prisma.activity.findMany({ where, include: activityInclude, orderBy: { createdAt: 'desc' }, take: 100 })
    const ratingPairs = entries.flatMap((entry) => entry.mediaItemId ? [{ userId: entry.userId, mediaItemId: entry.mediaItemId }] : [])
    const ratings = ratingPairs.length
      ? await this.prisma.userMedia.findMany({ where: { OR: ratingPairs }, select: { userId: true, mediaItemId: true, ratingHalfSteps: true } })
      : []
    const ratingByPair = new Map(ratings.map((rating) => [`${rating.userId}:${rating.mediaItemId}`, rating.ratingHalfSteps == null ? null : rating.ratingHalfSteps / 2]))
    return entries.map((entry) => ({
      id: entry.id,
      activityType: entry.activityType,
      createdAt: entry.createdAt,
      user: entry.user,
      mediaItem: entry.mediaItem,
      review: entry.review,
      list: entry.list,
      rating: entry.mediaItemId ? ratingByPair.get(`${entry.userId}:${entry.mediaItemId}`) ?? null : null,
    }))
  }
}
