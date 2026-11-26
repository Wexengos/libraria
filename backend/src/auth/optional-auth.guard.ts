import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common'
import type { AuthenticatedRequest } from './authenticated-user.js'
import { AuthGuard } from './auth.guard.js'
import { AuthService } from './auth.service.js'

@Injectable()
export class OptionalAuthGuard extends AuthGuard implements CanActivate {
  constructor(auth: AuthService) { super(auth) }

  override async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>()
    if (!request.headers.authorization) return true
    return super.canActivate(context)
  }
}
