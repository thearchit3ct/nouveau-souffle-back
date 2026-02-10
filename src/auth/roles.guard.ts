import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from './roles.decorator.js';

// Multi-branch role hierarchy
// Branch 1 (membership): ANONYMOUS(0) < DONOR(1) < MEMBER(2) < ADMIN(3) < SUPER_ADMIN(4)
// Branch 2 (volunteer):  VOLUNTEER(1) < COORDINATOR(2) < ADMIN(3) < SUPER_ADMIN(4)
const ROLE_HIERARCHY: Record<string, Record<string, number>> = {
  ANONYMOUS:   { membership: 0 },
  DONOR:       { membership: 1 },
  MEMBER:      { membership: 2 },
  VOLUNTEER:   { volunteer: 1 },
  COORDINATOR: { volunteer: 2 },
  ADMIN:       { membership: 3, volunteer: 3 },
  SUPER_ADMIN: { membership: 4, volunteer: 4 },
};

function satisfiesRole(userRole: string, requiredRole: string): boolean {
  if (userRole === 'SUPER_ADMIN') return true;
  if (userRole === requiredRole) return true;

  const userLevels = ROLE_HIERARCHY[userRole];
  const requiredLevels = ROLE_HIERARCHY[requiredRole];
  if (!userLevels || !requiredLevels) return false;

  // Check if userRole level >= requiredRole level in ANY shared branch
  for (const branch of Object.keys(requiredLevels)) {
    if (branch in userLevels && userLevels[branch] >= requiredLevels[branch]) {
      return true;
    }
  }
  return false;
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!requiredRoles) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const session = request.session;

    if (!session) {
      throw new ForbiddenException('Acces refuse');
    }

    const payload = session.getAccessTokenPayload();
    const userRole: string = payload?.role;

    if (!userRole) {
      throw new ForbiddenException('Droits insuffisants pour cette action');
    }

    // User satisfies if their role covers ANY of the required roles
    const hasPermission = requiredRoles.some((required) =>
      satisfiesRole(userRole, required),
    );

    if (!hasPermission) {
      throw new ForbiddenException('Droits insuffisants pour cette action');
    }

    return true;
  }
}
