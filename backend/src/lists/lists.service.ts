import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import { Prisma } from '../generated/prisma/client.js'
import type { ListVisibility } from '../generated/prisma/client.js'
import { MediaCatalogService } from '../media/media-catalog.service.js'
import { PrismaService } from '../prisma/prisma.service.js'
import type { AddListItemDto } from './dto/add-list-item.dto.js'
import type { CreateListDto } from './dto/create-list.dto.js'
import type { ReorderListDto } from './dto/reorder-list.dto.js'
import type { UpdateListDto } from './dto/update-list.dto.js'

const MAX_LIST_ITEMS = 500
const listInclude = {
  user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
  items: {
    orderBy: { position: 'asc' },
    include: { mediaItem: { include: { externalIdentifiers: true, filmDetails: true, albumDetails: true, bookDetails: true } } },
  },
} satisfies Prisma.MediaListInclude

@Injectable()
export class ListsService {
  constructor(private readonly prisma: PrismaService, private readonly catalog: MediaCatalogService) {}

  listMine(userId: string) {
    return this.prisma.mediaList.findMany({
      where: { userId }, orderBy: { updatedAt: 'desc' },
      include: { _count: { select: { items: true } } },
    })
  }

  async create(userId: string, dto: CreateListDto) {
    if (!dto.title.trim()) throw new BadRequestException('List title cannot be empty.')
    return this.prisma.$transaction(async (tx) => {
      const list = await tx.mediaList.create({
        data: { userId, title: dto.title.trim(), description: dto.description?.trim() || null, visibility: (dto.visibility ?? 'PRIVATE') as ListVisibility },
        include: { _count: { select: { items: true } } },
      })
      await tx.activity.create({ data: { userId, activityType: 'LIST_CREATED', listId: list.id } })
      return list
    })
  }

  async get(id: string, viewerId?: string) {
    const list = await this.prisma.mediaList.findUnique({ where: { id }, include: listInclude })
    if (!list || (list.visibility === 'PRIVATE' && list.userId !== viewerId)) throw new NotFoundException('List not found.')
    return list
  }

  async update(userId: string, id: string, dto: UpdateListDto) {
    await this.requireOwner(userId, id)
    if (dto.title !== undefined && !dto.title.trim()) throw new BadRequestException('List title cannot be empty.')
    return this.prisma.mediaList.update({
      where: { id },
      data: {
        ...(dto.title === undefined ? {} : { title: dto.title.trim() }),
        ...(dto.description === undefined ? {} : { description: dto.description?.trim() || null }),
        ...(dto.visibility === undefined ? {} : { visibility: dto.visibility as ListVisibility }),
      },
      include: { _count: { select: { items: true } } },
    })
  }

  async remove(userId: string, id: string) {
    await this.requireOwner(userId, id)
    await this.prisma.mediaList.delete({ where: { id } })
  }

  async addItem(userId: string, listId: string, dto: AddListItemDto) {
    await this.requireOwner(userId, listId)
    const mediaItem = await this.catalog.resolve(dto.category, dto.externalId)
    try {
      return await this.prisma.$transaction(async (tx) => {
        const count = await tx.mediaListItem.count({ where: { listId } })
        if (count >= MAX_LIST_ITEMS) throw new BadRequestException(`Lists can contain up to ${MAX_LIST_ITEMS} titles.`)
        const last = await tx.mediaListItem.findFirst({ where: { listId }, orderBy: { position: 'desc' }, select: { position: true } })
        const item = await tx.mediaListItem.create({ data: { listId, mediaItemId: mediaItem.id, position: (last?.position ?? -1) + 1 } })
        await tx.activity.create({ data: { userId, activityType: 'LIST_ITEM_ADDED', listId, mediaItemId: mediaItem.id } })
        await tx.mediaList.update({ where: { id: listId }, data: { updatedAt: new Date() } })
        return item
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new ConflictException('This title is already in the list.')
      throw error
    }
  }

  async removeItem(userId: string, listId: string, itemId: string) {
    await this.requireOwner(userId, listId)
    const result = await this.prisma.mediaListItem.deleteMany({ where: { id: itemId, listId } })
    if (result.count === 0) throw new NotFoundException('List item not found.')
    await this.prisma.mediaList.update({ where: { id: listId }, data: { updatedAt: new Date() } })
  }

  async reorder(userId: string, listId: string, dto: ReorderListDto) {
    await this.requireOwner(userId, listId)
    await this.prisma.$transaction(async (tx) => {
      const items = await tx.mediaListItem.findMany({ where: { listId }, select: { id: true } })
      if (items.length !== dto.itemIds.length || items.some((item) => !dto.itemIds.includes(item.id))) {
        throw new BadRequestException('Send every item in this list exactly once to change its order.')
      }
      for (const [index, id] of dto.itemIds.entries()) {
        await tx.mediaListItem.update({ where: { id }, data: { position: -(index + 1) } })
      }
      for (const [position, id] of dto.itemIds.entries()) {
        await tx.mediaListItem.update({ where: { id }, data: { position } })
      }
      await tx.mediaList.update({ where: { id: listId }, data: { updatedAt: new Date() } })
    })
  }

  private async requireOwner(userId: string, id: string) {
    const list = await this.prisma.mediaList.findFirst({ where: { id, userId }, select: { id: true } })
    if (!list) throw new NotFoundException('List not found.')
    return list
  }
}
