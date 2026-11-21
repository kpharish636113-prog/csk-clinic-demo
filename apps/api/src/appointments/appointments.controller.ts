import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import {
  CreateAppointmentDto,
  CreateSlotDto,
  ListAppointmentsQueryDto,
  ListSlotsQueryDto,
  UpdateAppointmentStatusDto,
} from './appointment.dto';
import { AppointmentsService } from './appointments.service';

const STAFF_ROLES = [
  UserRole.SUPER_ADMIN,
  UserRole.CLINIC_OWNER,
  UserRole.CLINIC_ADMIN,
  UserRole.RECEPTIONIST,
  UserRole.DOCTOR,
  UserRole.NURSE,
];

const SCHEDULER_ROLES = [
  UserRole.SUPER_ADMIN,
  UserRole.CLINIC_OWNER,
  UserRole.CLINIC_ADMIN,
  UserRole.RECEPTIONIST,
];

const SLOT_MANAGER_ROLES = [
  UserRole.SUPER_ADMIN,
  UserRole.CLINIC_OWNER,
  UserRole.CLINIC_ADMIN,
];

const CLINIC_MANAGERS = [
  UserRole.SUPER_ADMIN,
  UserRole.CLINIC_OWNER,
  UserRole.CLINIC_ADMIN,
];

@Controller('appointments')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...STAFF_ROLES)
export class AppointmentsController {
  constructor(private readonly appointments: AppointmentsService) {}

  @Get('slots')
  listSlots(@CurrentUser() user: AuthenticatedUser, @Query() query: ListSlotsQueryDto) {
    return this.appointments.listSlots(user.clinicId, query);
  }

  @Get('doctors')
  listDoctors(@CurrentUser() user: AuthenticatedUser) {
    return this.appointments.listDoctors(user.clinicId);
  }

  @Post('slots')
  @Roles(...SLOT_MANAGER_ROLES, UserRole.DOCTOR)
  createSlot(@CurrentUser() user: AuthenticatedUser, @Body() body: CreateSlotDto) {
    return this.appointments.createSlot(user, body);
  }

  @Get()
  listAppointments(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListAppointmentsQueryDto,
  ) {
    return this.appointments.listAppointments(user, query);
  }

  @Post()
  @Roles(...SCHEDULER_ROLES, UserRole.DOCTOR, UserRole.NURSE)
  createAppointment(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: CreateAppointmentDto,
  ) {
    return this.appointments.createAppointment(user, body);
  }

  @Patch(':id/status')
  @Roles(...CLINIC_MANAGERS, UserRole.RECEPTIONIST, UserRole.DOCTOR, UserRole.NURSE)
  updateStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: UpdateAppointmentStatusDto,
  ) {
    return this.appointments.updateStatus(user, id, body.status);
  }
}
