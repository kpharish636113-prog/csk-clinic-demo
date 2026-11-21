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
  AdjustConsumableStockDto,
  CreateConsumableDto,
  ListConsumablesQueryDto,
  ListConsumableMovementsQueryDto,
  UpdateConsumableDto,
} from './consumables.dto';
import { ConsumablesService } from './consumables.service';

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

@Controller('consumables')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...INVENTORY_READERS)
export class ConsumablesController {
  constructor(private readonly consumables: ConsumablesService) {}

  @Get('categories')
  listCategories(@CurrentUser() user: AuthenticatedUser) {
    return this.consumables.listCategories(user.clinicId);
  }

  @Get()
  list(@CurrentUser() user: AuthenticatedUser, @Query() query: ListConsumablesQueryDto) {
    return this.consumables.list(user.clinicId, query);
  }

  @Post()
  @Roles(...INVENTORY_MANAGERS)
  create(@CurrentUser() user: AuthenticatedUser, @Body() body: CreateConsumableDto) {
    return this.consumables.create(user, body);
  }

  @Patch(':id')
  @Roles(...INVENTORY_MANAGERS)
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: UpdateConsumableDto,
  ) {
    return this.consumables.update(user, id, body);
  }

  @Post(':id/stock')
  @Roles(...INVENTORY_MANAGERS, UserRole.NURSE)
  adjustStock(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: AdjustConsumableStockDto,
  ) {
    return this.consumables.adjustStock(user, id, body);
  }

  @Get(':id/stock-movements')
  getStockMovements(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Query() query: ListConsumableMovementsQueryDto,
  ) {
    return this.consumables.listMovements(user, id, query);
  }
}
