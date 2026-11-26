import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch, Post, Req, UseGuards } from '@nestjs/common'
import type { AuthenticatedRequest } from '../auth/authenticated-user.js'
import { AuthGuard } from '../auth/auth.guard.js'
import { UsersService } from '../users/users.service.js'
import { CreateReviewDto } from './dto/create-review.dto.js'
import { UpdateReviewDto } from './dto/update-review.dto.js'
import { ReviewsService } from './reviews.service.js'

@Controller('media')
export class MediaReviewsController {
  constructor(private readonly reviews: ReviewsService) {}

  @Get(':provider/:externalId/reviews')
  list(@Param('provider') provider: string, @Param('externalId') externalId: string) {
    return this.reviews.list(provider, externalId)
  }
}

@Controller('reviews')
@UseGuards(AuthGuard)
export class ReviewsController {
  constructor(private readonly reviews: ReviewsService, private readonly users: UsersService) {}

  @Post()
  async create(@Req() request: AuthenticatedRequest, @Body() dto: CreateReviewDto) {
    const profile = await this.users.getMe(request.user!)
    return this.reviews.create(profile.id, dto)
  }

  @Patch(':id')
  update(@Req() request: AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateReviewDto) {
    return this.reviews.update(request.user!.id, id, dto)
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Req() request: AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.reviews.remove(request.user!.id, id)
  }
}
