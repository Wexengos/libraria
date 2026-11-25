import { Body, Controller, Get, Param, Patch, Req, UseGuards } from '@nestjs/common'
import type { AuthenticatedRequest } from '../auth/authenticated-user.js'
import { AuthGuard } from '../auth/auth.guard.js'
import { UpdateProfileDto } from './dto/update-profile.dto.js'
import { UsersService } from './users.service.js'

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @UseGuards(AuthGuard)
  getMe(@Req() request: AuthenticatedRequest) {
    return this.usersService.getMe(request.user!)
  }

  @Patch('me')
  @UseGuards(AuthGuard)
  updateMe(@Req() request: AuthenticatedRequest, @Body() dto: UpdateProfileDto) {
    return this.usersService.update(request.user!.id, dto)
  }

  @Get(':username')
  getByUsername(@Param('username') username: string) {
    return this.usersService.getByUsername(username)
  }
}
