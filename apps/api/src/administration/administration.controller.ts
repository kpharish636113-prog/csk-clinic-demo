import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CreateClinicUserDto, UpdateClinicSettingsDto, UpdateClinicUserDto } from './administration.dto';
import { AdministrationService } from './administration.service';

const CLINIC_MANAGERS = [UserRole.SUPER_ADMIN, UserRole.CLINIC_OWNER, UserRole.CLINIC_ADMIN];

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...CLINIC_MANAGERS)
export class AdministrationController {
  constructor(private readonly administration: AdministrationService) {}

  @Get('clinic/settings')
  getSettings(@CurrentUser() user: AuthenticatedUser) {
    return this.administration.getSettings(user.clinicId);
  }

  @Patch('clinic/settings')
  updateSettings(@CurrentUser() user: AuthenticatedUser, @Body() body: UpdateClinicSettingsDto) {
    return this.administration.updateSettings(user, user.clinicId, body);
  }

  @Get('clinic/users')
  listUsers(@CurrentUser() user: AuthenticatedUser) {
    return this.administration.listUsers(user.clinicId);
  }

  @Post('clinic/users')
  createUser(@CurrentUser() user: AuthenticatedUser, @Body() body: CreateClinicUserDto) {
    return this.administration.createUser(user, user.clinicId, body);
  }

  @Patch('clinic/users/:id')
  updateUser(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: UpdateClinicUserDto,
  ) {
    return this.administration.updateUser(user, user.clinicId, id, body);
  }
}
