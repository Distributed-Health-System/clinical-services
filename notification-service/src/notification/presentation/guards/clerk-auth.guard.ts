import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';

/**
 * Placeholder Clerk auth guard.
 */
@Injectable()
export class ClerkAuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    throw new UnauthorizedException('ClerkAuthGuard not yet implemented.');
  }
}
