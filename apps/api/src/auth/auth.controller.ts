import { Body, Controller, Post, Req, Res, UseGuards } from '@nestjs/common';
import { Request, Response } from 'express';
import { IsEmail, IsString, MinLength } from 'class-validator';
import { AuthService } from './auth.service';
import { CurrentUser } from './current-user.decorator';
import { AuthenticatedUser } from './auth.types';
import { JwtAuthGuard } from './jwt-auth.guard';

class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(12)
  password!: string;
}

class ChangePasswordDto {
  @IsString()
  @MinLength(12)
  currentPassword!: string;

  @IsString()
  @MinLength(12)
  newPassword!: string;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(
    @Body() body: LoginDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.login(body.email, body.password);
    response.cookie('csk_refresh', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      path: '/api/auth',
    });
    const { refreshToken: _refreshToken, ...safeResult } = result;
    await this.authService.auditLogin(
      safeResult.user.id,
      safeResult.user.clinicId,
      request.ip,
      request.get('user-agent'),
    );
    return safeResult;
  }

  @Post('refresh')
  async refresh(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const token = request.cookies?.csk_refresh as string | undefined;
    if (!token) {
      return { accessToken: null };
    }
    const result = await this.authService.refresh(token);
    response.cookie('csk_refresh', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      path: '/api/auth',
    });
    const { refreshToken: _refreshToken, ...safeResult } = result;
    return safeResult;
  }

  @Post('logout')
  async logout(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    await this.authService.logout(request.cookies?.csk_refresh as string | undefined);
    response.clearCookie('csk_refresh', { path: '/api/auth' });
    return { loggedOut: true };
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  async changePassword(
    @Body() body: ChangePasswordDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.authService.changePassword(
      user.sub,
      body.currentPassword,
      body.newPassword,
    );
    return { changed: true };
  }
}

