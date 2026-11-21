import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { compare, hash } from 'bcryptjs';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  private hashRefreshToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private async createRefreshSession(userId: string) {
    const refreshToken = randomBytes(48).toString('base64url');
    await this.prisma.refreshSession.create({
      data: {
        userId,
        tokenHash: this.hashRefreshToken(refreshToken),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });
    return refreshToken;
  }

  async auditLogin(userId: string, clinicId: string, ipAddress?: string, userAgent?: string) {
    await this.prisma.auditLog.create({
      data: {
        userId,
        clinicId,
        action: 'AUTH_LOGIN',
        resource: 'auth',
        ipAddress,
        userAgent,
      },
    });
  }

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: email.trim().toLowerCase(), active: true },
      select: { id: true, clinicId: true, email: true, passwordHash: true, role: true },
    });

    if (!user || !(await compare(password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    const secret = this.config.get<string>('JWT_SECRET');
    if (!secret || secret.length < 32) {
      throw new Error('JWT_SECRET must be configured with at least 32 characters.');
    }

    const accessToken = await this.jwt.signAsync(
      { sub: user.id, clinicId: user.clinicId, role: user.role },
      {
        secret,
        expiresIn: 900,
      },
    );

    const refreshToken = await this.createRefreshSession(user.id);
    return {
      accessToken,
      tokenType: 'Bearer',
      expiresIn: 900,
      refreshToken,
      user: { id: user.id, email: user.email, role: user.role, clinicId: user.clinicId },
    };
  }

  async refresh(refreshToken: string) {
    const session = await this.prisma.refreshSession.findUnique({
      where: { tokenHash: this.hashRefreshToken(refreshToken) },
      include: { user: { select: { id: true, clinicId: true, email: true, role: true, active: true } } },
    });
    if (!session || session.revokedAt || session.expiresAt <= new Date() || !session.user.active) {
      throw new UnauthorizedException('The refresh session is invalid or expired.');
    }

    await this.prisma.refreshSession.update({
      where: { id: session.id },
      data: { revokedAt: new Date() },
    });
    const newRefreshToken = await this.createRefreshSession(session.user.id);
    const secret = this.config.get<string>('JWT_SECRET');
    if (!secret || secret.length < 32) {
      throw new Error('JWT_SECRET must be configured with at least 32 characters.');
    }
    const accessToken = await this.jwt.signAsync(
      { sub: session.user.id, clinicId: session.user.clinicId, role: session.user.role },
      { secret, expiresIn: 900 },
    );
    return {
      accessToken,
      tokenType: 'Bearer',
      expiresIn: 900,
      refreshToken: newRefreshToken,
      user: {
        id: session.user.id,
        email: session.user.email,
        role: session.user.role,
        clinicId: session.user.clinicId,
      },
    };
  }

  async logout(refreshToken?: string): Promise<void> {
    if (!refreshToken) return;
    await this.prisma.refreshSession.updateMany({
      where: { tokenHash: this.hashRefreshToken(refreshToken), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    if (currentPassword === newPassword) {
      throw new UnauthorizedException('The new password must be different from the current password.');
    }
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, clinicId: true, passwordHash: true },
    });
    if (!user || !(await compare(currentPassword, user.passwordHash))) {
      throw new UnauthorizedException('The current password is incorrect.');
    }
    const passwordHash = await hash(newPassword, 12);
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { passwordHash },
      }),
      this.prisma.refreshSession.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
      this.prisma.auditLog.create({
        data: {
          userId,
          clinicId: user.clinicId,
          action: 'AUTH_PASSWORD_CHANGED',
          resource: 'user',
          resourceId: userId,
        },
      }),
    ]);
  }
}
