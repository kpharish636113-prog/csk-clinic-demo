import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
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
  CreateInvoiceDto,
  CreateInvoicePaymentDto,
  ListInvoicesQueryDto,
} from './billing.dto';
import { BillingService } from './billing.service';

const BILLING_ROLES = [
  UserRole.SUPER_ADMIN,
  UserRole.CLINIC_OWNER,
  UserRole.CLINIC_ADMIN,
  UserRole.RECEPTIONIST,
  UserRole.ACCOUNTANT,
];

@Controller('billing')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...BILLING_ROLES)
export class BillingController {
  constructor(private readonly billing: BillingService) {}

  @Get('invoices')
  listInvoices(@CurrentUser() user: AuthenticatedUser, @Query() query: ListInvoicesQueryDto) {
    return this.billing.listInvoices(user, query);
  }

  @Post('invoices')
  createInvoice(@CurrentUser() user: AuthenticatedUser, @Body() body: CreateInvoiceDto) {
    return this.billing.createInvoice(user, body);
  }

  @Get('invoices/:id')
  getInvoice(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.billing.getInvoice(user, id);
  }

  @Post('invoices/:id/payments')
  receivePayment(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: CreateInvoicePaymentDto,
  ) {
    return this.billing.receivePayment(user, id, body);
  }
}
