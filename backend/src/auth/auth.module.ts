import { Module } from '@nestjs/common'
import { AuthGuard } from './auth.guard.js'
import { AuthService } from './auth.service.js'
import { OptionalAuthGuard } from './optional-auth.guard.js'

@Module({ providers: [AuthService, AuthGuard, OptionalAuthGuard], exports: [AuthService, AuthGuard, OptionalAuthGuard] })
export class AuthModule {}
