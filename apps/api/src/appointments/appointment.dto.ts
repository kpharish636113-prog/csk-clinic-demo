import { AppointmentStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateSlotDto {
  @IsUUID()
  doctorId!: string;

  @IsDateString()
  startsAt!: string;

  @IsDateString()
  endsAt!: string;
}

export class ListSlotsQueryDto {
  @IsUUID()
  doctorId!: string;

  @IsDateString()
  from!: string;

  @IsDateString()
  to!: string;
}

export class CreateAppointmentDto {
  @IsUUID()
  patientId!: string;

  @IsUUID()
  slotId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string;
}

export class ListAppointmentsQueryDto {
  @IsOptional()
  @IsEnum(AppointmentStatus)
  status?: AppointmentStatus;

  @IsOptional()
  @IsUUID()
  doctorId?: string;

  @IsOptional()
  @IsUUID()
  patientId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;
}

export class UpdateAppointmentStatusDto {
  @IsEnum(AppointmentStatus)
  status!: AppointmentStatus;
}
