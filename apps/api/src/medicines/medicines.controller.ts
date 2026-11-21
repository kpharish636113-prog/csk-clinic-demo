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
  AdjustMedicineStockDto,
  CreateMedicineDto,
  ListMedicinesQueryDto,
  ListStockMovementsQueryDto,
  UpdateMedicineDto,
} from './medicine.dto';
import { MedicinesService } from './medicines.service';

const INVENTORY_READERS = [
  UserRole.SUPER_ADMIN,
  UserRole.CLINIC_OWNER,
  UserRole.CLINIC_ADMIN,
  UserRole.RECEPTIONIST,
  UserRole.DOCTOR,
  UserRole.NURSE,
  UserRole.PHARMACIST,
  UserRole.ACCOUNTANT,
];

const INVENTORY_MANAGERS = [
  UserRole.SUPER_ADMIN,
  UserRole.CLINIC_OWNER,
  UserRole.CLINIC_ADMIN,
  UserRole.PHARMACIST,
];

@Controller('medicines')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...INVENTORY_READERS)
export class MedicinesController {
  constructor(private readonly medicines: MedicinesService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser, @Query() query: ListMedicinesQueryDto) {
    return this.medicines.list(user.clinicId, query);
  }

  @Post()
  @Roles(...INVENTORY_MANAGERS)
  create(@CurrentUser() user: AuthenticatedUser, @Body() body: CreateMedicineDto) {
    return this.medicines.create(user, body);
  }

  @Patch(':id')
  @Roles(...INVENTORY_MANAGERS)
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: UpdateMedicineDto,
  ) {
    return this.medicines.update(user, id, body);
  }

  @Post(':id/stock')
  @Roles(...INVENTORY_MANAGERS)
  adjustStock(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: AdjustMedicineStockDto,
  ) {
    return this.medicines.adjustStock(user, id, body);
  }

  @Get(':id/stock-movements')
  getStockMovements(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Query() query: ListStockMovementsQueryDto,
  ) {
    return this.medicines.listStockMovements(user, id, query);
  }
}
