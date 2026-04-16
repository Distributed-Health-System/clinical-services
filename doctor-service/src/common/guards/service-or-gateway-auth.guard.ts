import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

/**
 * Allows either trusted service-to-service calls (X-Service-Api-Key) or
 * gateway-injected identity headers (x-user-id + x-user-role).
 */
@Injectable()
export class ServiceOrGatewayAuthGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const expected = this.config.get<string>('serviceApiKey');
    const headerKey = request.headers['x-service-api-key'];

    if (expected?.trim() && headerKey === expected) {
      return true;
    }

    const userId = request.headers['x-user-id'];
    const userRole = request.headers['x-user-role'];

    if (!userId || !userRole) {
      throw new UnauthorizedException(
        'Missing x-user-id / x-user-role or valid x-service-api-key',
      );
    }

    request['userId'] = userId as string;
    request['userRole'] = userRole as string;
    return true;
  }
}
