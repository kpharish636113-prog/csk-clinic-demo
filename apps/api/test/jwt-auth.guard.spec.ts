import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { JwtAuthGuard } from '../src/auth/jwt-auth.guard';

function contextWithAuthorization(authorization?: string): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({
        headers: authorization ? { authorization } : {},
      }),
    }),
  } as ExecutionContext;
}

describe('JwtAuthGuard', () => {
  const secret = 'a'.repeat(32);
  const config = { get: () => secret } as unknown as ConfigService;

  it('rejects requests without a bearer token', async () => {
    const guard = new JwtAuthGuard(new JwtService(), config);
    await expect(guard.canActivate(contextWithAuthorization())).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('accepts a valid bearer token', async () => {
    const jwt = new JwtService();
    const token = await jwt.signAsync(
      { sub: 'user-1', clinicId: 'clinic-1', role: 'CLINIC_OWNER' },
      { secret, expiresIn: 900 },
    );
    const guard = new JwtAuthGuard(jwt, config);
    await expect(guard.canActivate(contextWithAuthorization(`Bearer ${token}`))).resolves.toBe(true);
  });
});
