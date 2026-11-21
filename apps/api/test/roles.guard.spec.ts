import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import { RolesGuard } from '../src/auth/roles.guard';

function contextFor(role: UserRole): ExecutionContext {
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({
      getRequest: () => ({ user: { sub: 'user-1', clinicId: 'clinic-1', role } }),
    }),
  } as ExecutionContext;
}

describe('RolesGuard', () => {
  it('allows a role in the configured allowlist', () => {
    const reflector = {
      getAllAndOverride: () => [UserRole.CLINIC_OWNER],
    } as unknown as Reflector;
    expect(new RolesGuard(reflector).canActivate(contextFor(UserRole.CLINIC_OWNER))).toBe(true);
  });

  it('rejects a role outside the configured allowlist', () => {
    const reflector = {
      getAllAndOverride: () => [UserRole.CLINIC_OWNER],
    } as unknown as Reflector;
    expect(() => new RolesGuard(reflector).canActivate(contextFor(UserRole.RECEPTIONIST)))
      .toThrow(ForbiddenException);
  });
});
