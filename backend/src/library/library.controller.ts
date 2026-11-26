import { BadRequestException, Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch, Post, Query, Req, UseGuards } from '@nestjs/common'
import type { AuthenticatedRequest } from '../auth/authenticated-user.js'
import { AuthGuard } from '../auth/auth.guard.js'
import { UsersService } from '../users/users.service.js'
import { AddLibraryEntryDto, categories, type LibraryCategory } from './dto/add-library-entry.dto.js'
import { LibraryQueryDto } from './dto/library-query.dto.js'
import { UpdateLibraryEntryDto } from './dto/update-library-entry.dto.js'
import { LibraryService } from './library.service.js'

@Controller('library')
@UseGuards(AuthGuard)
export class LibraryController {
  constructor(private readonly library: LibraryService, private readonly users: UsersService) {}

  @Post()
  async add(@Req() request: AuthenticatedRequest, @Body() dto: AddLibraryEntryDto) {
    await this.users.getMe(request.user!)
    return this.library.add(request.user!.id, dto)
  }

  @Get()
  list(@Req() request: AuthenticatedRequest, @Query() query: LibraryQueryDto) {
    return this.library.list(request.user!.id, query)
  }

  @Get('item/:provider/:externalId')
  findEntryForMedia(@Req() request: AuthenticatedRequest, @Param('provider') provider: string, @Param('externalId') externalId: string) {
    return this.library.findEntryForMedia(request.user!.id, provider, externalId)
  }

  @Get(':category')
  listCategory(@Req() request: AuthenticatedRequest, @Param('category') category: string, @Query() query: LibraryQueryDto) {
    if (!categories.includes(category as LibraryCategory)) throw new BadRequestException('Unknown library category.')
    return this.library.list(request.user!.id, query, category as LibraryCategory)
  }

  @Patch(':id')
  update(@Req() request: AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateLibraryEntryDto) {
    return this.library.update(request.user!.id, id, dto)
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Req() request: AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string) {
    await this.library.remove(request.user!.id, id)
  }
}
