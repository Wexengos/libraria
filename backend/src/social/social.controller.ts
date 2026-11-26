import { Controller, Delete, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common'
import type { AuthenticatedRequest } from '../auth/authenticated-user.js'
import { AuthGuard } from '../auth/auth.guard.js'
import { OptionalAuthGuard } from '../auth/optional-auth.guard.js'
import { UsersService } from '../users/users.service.js'
import { SocialService } from './social.service.js'

@Controller()
export class SocialController {
  constructor(private readonly social: SocialService, private readonly users: UsersService) {}

  @Get('community')
  @UseGuards(OptionalAuthGuard)
  community(@Req() request: AuthenticatedRequest, @Query('q') search = '') {
    return this.social.community(search, request.user?.id)
  }

  @Get('activity')
  @UseGuards(AuthGuard)
  activity(@Req() request: AuthenticatedRequest) {
    return this.social.feed(request.user!.id)
  }

  @Get('users/:username/social')
  @UseGuards(OptionalAuthGuard)
  socialSummary(@Req() request: AuthenticatedRequest, @Param('username') username: string) {
    return this.social.summary(username, request.user?.id)
  }

  @Get('users/:username/activity')
  @UseGuards(OptionalAuthGuard)
  userActivity(@Req() request: AuthenticatedRequest, @Param('username') username: string) {
    return this.social.activityForUser(username, request.user?.id)
  }

  @Get('users/:username/lists')
  @UseGuards(OptionalAuthGuard)
  userLists(@Req() request: AuthenticatedRequest, @Param('username') username: string) {
    return this.social.publicLists(username, request.user?.id)
  }

  @Get('users/:username/followers')
  followers(@Param('username') username: string) {
    return this.social.connections(username, 'followers')
  }

  @Get('users/:username/following')
  following(@Param('username') username: string) {
    return this.social.connections(username, 'following')
  }

  @Post('users/:username/follow')
  @UseGuards(AuthGuard)
  async follow(@Req() request: AuthenticatedRequest, @Param('username') username: string) {
    const profile = await this.users.getMe(request.user!)
    return this.social.follow(profile.id, username)
  }

  @Delete('users/:username/follow')
  @UseGuards(AuthGuard)
  async unfollow(@Req() request: AuthenticatedRequest, @Param('username') username: string) {
    const profile = await this.users.getMe(request.user!)
    return this.social.unfollow(profile.id, username)
  }
}
