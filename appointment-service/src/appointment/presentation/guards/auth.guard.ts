import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { UserRole } from '../../domain/enums/user-role.enum';

/**
 * RequestUser
 *
 * The shape of the authenticated user object attached to every request
 * by the AuthGuard. Available in controllers as `request.user` and
 * passed down to the service layer for authorization checks.
 */
export interface RequestUser {
  userId: string;
  role: UserRole;
}

/**
 * AuthenticatedRequest
 *
 * Extends the Express Request type to include the typed `user` property
 * set by AuthGuard. Used in controller method signatures for type safety.
 */
export type AuthenticatedRequest = Request & { user: RequestUser };

/**
 * AuthGuard — Presentation Layer Guard
 *
 * Handles request AUTHENTICATION by extracting and parsing an identity token
 * from the Authorization header, then attaching a typed user object to the
 * request for downstream use by controllers and services.
 *
 * ⚠️  CURRENT IMPLEMENTATION: Mock / Development Stand-in
 * Auth strategy is not finalized. This guard accepts a hand-crafted
 * base64-encoded JSON payload in lieu of a real signed JWT. There is
 * ZERO cryptographic verification — it simply decodes and trusts the payload.
 *
 * How to test with curl/Postman:
 *   1. Create a JSON payload:   { "userId": "user_123", "role": "PATIENT" }
 *   2. Base64-encode it:        eyJ1c2VySWQiOiJ1c2VyXzEyMyIsInJvbGUiOiJQQVRJRU5UIn0=
 *   3. Build a fake JWT:        header.<encoded-payload>.signature
 *      e.g.:                    mock.eyJ1c2VySWQiOiJ1c2VyXzEyMyIsInJvbGUiOiJQQVRJRU5UIn0=.mock
 *   4. Set header:              Authorization: Bearer mock.eyJ...In0=.mock
 *
 * When a real auth strategy is chosen (Clerk, Auth0, Keycloak, custom JWT),
 * this file is the ONLY file that needs to change. The rest of the codebase
 * consumes `request.user` and is auth-provider agnostic.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context
      .switchToHttp()
      .getRequest<AuthenticatedRequest>();

    const authHeader = request.headers.authorization;

    // --- Presence check ---
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException(
        'Missing or malformed Authorization header. Expected: Authorization: Bearer <token>',
      );
    }

    const token = authHeader.slice(7); // strip "Bearer "
    const segments = token.split('.');

    // A JWT has 3 segments: header.payload.signature
    // We accept anything with at least 2 segments (header.payload) to be
    // flexible with hand-crafted test tokens.
    if (segments.length < 2) {
      throw new UnauthorizedException(
        'Malformed token: expected a JWT-like format with at least 2 dot-separated segments.',
      );
    }

    try {
      // Decode the payload (index 1). Handle URL-safe base64 and missing padding.
      const payloadBase64 = segments[1]
        .replace(/-/g, '+')
        .replace(/_/g, '/');
      const padded =
        payloadBase64 + '='.repeat((4 - (payloadBase64.length % 4)) % 4);
      const payloadJson = Buffer.from(padded, 'base64').toString('utf-8');
      const payload = JSON.parse(payloadJson) as {
        userId?: string;
        role?: string;
      };

      // --- Field presence ---
      if (!payload.userId || !payload.role) {
        throw new UnauthorizedException(
          'Token payload must contain both "userId" and "role" fields.',
        );
      }

      // --- Role validation ---
      const validRoles = Object.values(UserRole) as string[];
      if (!validRoles.includes(payload.role)) {
        throw new UnauthorizedException(
          `Invalid role '${payload.role}'. Must be one of: ${validRoles.join(', ')}.`,
        );
      }

      // --- Attach to request ---
      request.user = {
        userId: payload.userId,
        role: payload.role as UserRole,
      };

      return true;
    } catch (error) {
      // Re-throw UnauthorizedException as-is (preserves specific message)
      if (error instanceof UnauthorizedException) throw error;

      // Any JSON parse or Buffer error: malformed token
      throw new UnauthorizedException(
        'Could not parse token payload. Ensure it is valid base64-encoded JSON.',
      );
    }
  }
}
