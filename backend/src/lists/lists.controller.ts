import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Put, Req, UseGuards } from '@nestjs/common'
import type { AuthenticatedRequest } from '../auth/authenticated-user.js'
import { AuthGuard } from '../auth/auth.guard.js'
import { OptionalAuthGuard } from '../auth/optional-auth.guard.js'
import { UsersService } from '../users/users.service.js'
import { AddListItemDto } from './dto/add-list-item.dto.js'
import { CreateListDto } from './dto/create-list.dto.js'
import { ReorderListDto } from './dto/reorder-list.dto.js'
import { UpdateListDto } from './dto/update-list.dto.js'
import { ListsService } from './lists.service.js'

@Controller('lists')
export class ListsController {
  constructor(private readonly lists: ListsService, private readonly users: UsersService) {}

  @Get()
  @UseGuards(AuthGuard)
  listMine(@Req() request: AuthenticatedRequest) {
    return this.lists.listMine(request.user!.id)
  }

  @Post()
  @UseGuards(AuthGuard)
  async create(@Req() request: AuthenticatedRequest, @Body() dto: CreateListDto) {
    const profile = await this.users.getMe(request.user!)
    return this.lists.create(profile.id, dto)
  }

  @Get(':id')
  @UseGuards(OptionalAuthGuard)
  get(@Req() request: AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.lists.get(id, request.user?.id)
  }

  @Patch(':id')
  @UseGuards(AuthGuard)
  update(@Req() request: AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateListDto) {
    return this.lists.update(request.user!.id, id, dto)
  }

  @Delete(':id')
  @UseGuards(AuthGuard)
  remove(@Req() request: AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.lists.remove(request.user!.id, id)
  }

  @Post(':id/items')
  @UseGuards(AuthGuard)
  addItem(@Req() request: AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string, @Body() dto: AddListItemDto) {
    return this.lists.addItem(request.user!.id, id, dto)
  }

  @Delete(':id/items/:itemId')
  @UseGuards(AuthGuard)
  removeItem(@Req() request: AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string, @Param('itemId', ParseUUIDPipe) itemId: string) {
    return this.lists.removeItem(request.user!.id, id, itemId)
  }

  @Put(':id/items/order')
  @UseGuards(AuthGuard)
  reorder(@Req() request: AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string, @Body() dto: ReorderListDto) {
    return this.lists.reorder(request.user!.id, id, dto)
  }
}
