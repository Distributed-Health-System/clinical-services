import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';

@Injectable()
export class ServiceOrGatewayAuthGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const expected = this.config.get<string>('serviceApiKey')?.trim();
    const headerKey = request.headers['x-service-api-key'];

    if (expected && headerKey === expected) {
      return true;
    }

    const userId = request.headers['x-user-id'];
    const userRole = request.headers['x-user-role'];

    if (!userId || !userRole) {
      throw new UnauthorizedException(
        'Missing x-service-api-key or gateway identity headers.',
      );
    }

    return true;
  }
}
