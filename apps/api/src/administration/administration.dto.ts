import { IsBoolean, IsEmail, IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { UserRole } from '@prisma/client';

export class UpdateClinicSettingsDto {
  @IsOptional() @IsString() @MaxLength(100) name?: string;
  @IsOptional() @IsString() @MaxLength(30) phone?: string;
  @IsOptional() @IsEmail() @MaxLength(120) email?: string;
  @IsOptional() @IsString() @MaxLength(200) address?: string;
  @IsOptional() @IsString() @MaxLength(100) practitionerName?: string;
  @IsOptional() @IsString() @MaxLength(60) registrationNumber?: string;
  @IsOptional() @IsString() @MaxLength(40) taxId?: string;
  @IsOptional() @IsString() @MaxLength(10) currency?: string;
  @IsOptional() @IsString() @MaxLength(200) invoiceFooter?: string;
}

export class CreateClinicUserDto {
  @IsEmail() @MaxLength(120) email!: string;
  @IsString() @MinLength(12) @MaxLength(128) password!: string;
  @IsEnum(UserRole) role!: UserRole;
}

export class UpdateClinicUserDto {
  @IsOptional() @IsEnum(UserRole) role?: UserRole;
  @IsOptional() @IsBoolean() active?: boolean;
}
