import { ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import { Prisma } from '../generated/prisma/client.js'
import type { User } from '@supabase/supabase-js'
import { PrismaService } from '../prisma/prisma.service.js'
import type { UpdateProfileDto } from './dto/update-profile.dto.js'

const usernamePattern = /^[a-z0-9]+(?:[_-][a-z0-9]+)*$/

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getMe(user: User) {
    const existing = await this.prisma.userProfile.findUnique({ where: { id: user.id } })
    if (existing) return existing

    const metadata = user.user_metadata ?? {}
    const metadataName = typeof metadata.display_name === 'string' ? metadata.display_name.trim() : ''
    const emailName = user.email?.split('@')[0]?.toLowerCase() ?? ''
    const base = typeof metadata.username === 'string' ? metadata.username.toLowerCase() : emailName
    const candidate = base.slice(0, 24)
    const username = usernamePattern.test(candidate) && candidate.length >= 3
      ? candidate
      : `reader-${user.id.replaceAll('-', '').slice(0, 8)}`
    const displayName = metadataName.slice(0, 80) || (user.email?.split('@')[0] ?? 'Reader').slice(0, 80)

    try {
      return await this.prisma.userProfile.create({
        data: { id: user.id, username, displayName },
      })
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        try {
          return await this.prisma.userProfile.create({
            data: {
              id: user.id,
              username: `reader-${user.id.replaceAll('-', '').slice(0, 12)}`,
              displayName,
            },
          })
        } catch (retryError) {
          if (retryError instanceof Prisma.PrismaClientKnownRequestError && retryError.code === 'P2002') {
            return this.prisma.userProfile.findUniqueOrThrow({ where: { id: user.id } })
          }
          throw retryError
        }
      }
      throw error
    }
  }

  async getByUsername(username: string) {
    const profile = await this.prisma.userProfile.findUnique({ where: { username: username.toLowerCase() } })
    if (!profile) throw new NotFoundException('Profile not found.')
    return profile
  }

  async update(userId: string, dto: UpdateProfileDto) {
    try {
      return await this.prisma.userProfile.update({
        where: { id: userId },
        data: {
          username: dto.username.toLowerCase(),
          displayName: dto.displayName.trim(),
          bio: dto.bio?.trim() || null,
          avatarUrl: dto.avatarUrl || null,
        },
      })
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') throw new ConflictException('That username is already in use.')
        if (error.code === 'P2025') throw new NotFoundException('Profile not found.')
      }
      throw error
    }
  }
}
