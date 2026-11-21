import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ConsumableStockMovementType,
  MedicineStockMovementType,
  Prisma,
} from '@prisma/client';
import { AuthenticatedUser } from '../auth/auth.types';
import { writeAuditLog } from '../audit/audit-log.utils';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateInvoiceDto,
  CreateInvoicePaymentDto,
  ListInvoicesQueryDto,
} from './billing.dto';

const INVOICE_INCLUDE = {
  patient: {
    select: {
      id: true,
      patientCode: true,
      fullName: true,
      mobile: true,
      email: true,
      dateOfBirth: true,
      gender: true,
      address: true,
      bloodGroup: true,
    },
  },
  items: { orderBy: { createdAt: 'asc' as const } },
  payments: { orderBy: { paidAt: 'asc' as const } },
} satisfies Prisma.InvoiceInclude;

type InvoiceWithDetails = Prisma.InvoiceGetPayload<{ include: typeof INVOICE_INCLUDE }>;
type BillingTransaction = Prisma.TransactionClient;

@Injectable()
export class BillingService {
  constructor(private readonly prisma: PrismaService) {}

  async listInvoices(user: AuthenticatedUser, query: ListInvoicesQueryDto) {
    if (query.page < 1 || query.limit < 1 || query.limit > 100) {
      throw new BadRequestException('Page must be positive and limit must be between 1 and 100.');
    }
    const from = query.from ? new Date(query.from) : undefined;
    const to = query.to ? new Date(query.to) : undefined;
    if (from && to && from > to) {
      throw new BadRequestException('The invoice date range is invalid.');
    }

    const where: Prisma.InvoiceWhereInput = {
      clinicId: user.clinicId,
      ...(query.patientId ? { patientId: query.patientId } : {}),
      ...(query.encounterId ? { encounterId: query.encounterId } : {}),
      ...(from || to
        ? { invoiceDate: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } }
        : {}),
      ...(query.search
        ? {
            OR: [
              { invoiceNumber: { contains: query.search, mode: 'insensitive' } },
              { patient: { fullName: { contains: query.search, mode: 'insensitive' } } },
              { patient: { patientCode: { contains: query.search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };
    return this.prisma.$transaction(async (transaction) => {
      const [items, total] = await Promise.all([
        transaction.invoice.findMany({
          where,
          include: INVOICE_INCLUDE,
          orderBy: [{ invoiceDate: 'desc' }, { createdAt: 'desc' }],
          skip: (query.page - 1) * query.limit,
          take: query.limit,
        }),
        transaction.invoice.count({ where }),
      ]);
      await writeAuditLog(transaction, {
        clinicId: user.clinicId,
        userId: user.sub,
        action: 'INVOICE_LIST_VIEWED',
        resource: 'invoice',
        metadata: { page: query.page, resultCount: items.length },
      });

      return {
        items: items.map((invoice) => this.withPaymentSummary(invoice)),
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      };
    });
  }

  async getInvoice(user: AuthenticatedUser, id: string) {
    return this.prisma.$transaction(async (transaction) => {
      const invoice = await transaction.invoice.findFirst({
        where: { id, clinicId: user.clinicId },
        include: INVOICE_INCLUDE,
      });
      if (!invoice) {
        throw new NotFoundException('Invoice not found.');
      }
      await writeAuditLog(transaction, {
        clinicId: user.clinicId,
        userId: user.sub,
        action: 'INVOICE_VIEWED',
        resource: 'invoice',
        resourceId: id,
      });
      return this.withPaymentSummary(invoice);
    });
  }

  async createInvoice(user: AuthenticatedUser, input: CreateInvoiceDto) {
    const invoiceDate = input.invoiceDate ? new Date(input.invoiceDate) : new Date();
    try {
      const invoice = await this.prisma.$transaction(
        async (transaction) => {
          const patient = await transaction.patient.findFirst({
            where: { id: input.patientId, clinicId: user.clinicId, status: 'ACTIVE' },
            select: { id: true },
          });
          if (!patient) {
            throw new NotFoundException('Active patient not found in this clinic.');
          }
          let resolvedEncounterId = input.encounterId ?? null;
          if (resolvedEncounterId) {
            const encounter = await transaction.patientEncounter.findFirst({
              where: {
                id: resolvedEncounterId,
                clinicId: user.clinicId,
                patientId: patient.id,
              },
              select: { id: true },
            });
            if (!encounter) {
              throw new NotFoundException('Encounter was not found for this patient.');
            }
          }

          const seenMedicines = new Set<string>();
          const seenConsumables = new Set<string>();
          const seenPrescriptionItems = new Set<string>();
          const billableItems: {
            medicine: {
              id: string;
              quantity: number;
              name: string;
              sellingPrice: Prisma.Decimal;
              batchNumber: string | null;
              expiresAt: Date | null;
            } | null;
            consumable: {
              id: string;
              quantity: number;
              name: string;
              sellingPrice: Prisma.Decimal;
              batchNumber: string | null;
              expiresAt: Date | null;
            } | null;
            prescription: {
              id: string;
              dosage: string;
              frequency: string;
              durationDays: number;
              instructions: string | null;
              billedQuantity: number;
            } | null;
            name: string;
            quantity: number;
            unitPrice: Prisma.Decimal;
            lineTotal: Prisma.Decimal;
          }[] = [];
          for (const line of input.items) {
            let medicine: (typeof billableItems)[number]['medicine'] = null;
            let consumable: (typeof billableItems)[number]['consumable'] = null;
            let prescription: (typeof billableItems)[number]['prescription'] = null;
            let name = line.name?.trim() || '';
            let unitPrice = this.decimal(line.unitPrice ?? 0);
            let medicineId = line.medicineId;
            if (line.prescriptionItemId) {
              if (seenPrescriptionItems.has(line.prescriptionItemId)) {
                throw new BadRequestException('Add each prescription item only once per invoice.');
              }
              seenPrescriptionItems.add(line.prescriptionItemId);
              const prescribed = await transaction.prescriptionItem.findFirst({
                where: { id: line.prescriptionItemId, clinicId: user.clinicId },
                select: {
                  id: true,
                  medicineId: true,
                  medicineName: true,
                  dosage: true,
                  frequency: true,
                  durationDays: true,
                  quantity: true,
                  billedQuantity: true,
                  instructions: true,
                  encounter: { select: { id: true, patientId: true } },
                },
              });
              if (!prescribed || prescribed.encounter.patientId !== patient.id) {
                throw new NotFoundException('Prescription item was not found for this patient.');
              }
              if (resolvedEncounterId && resolvedEncounterId !== prescribed.encounter.id) {
                throw new BadRequestException('All billed prescriptions must belong to the linked encounter.');
              }
              resolvedEncounterId = prescribed.encounter.id;
              if (medicineId && medicineId !== prescribed.medicineId) {
                throw new BadRequestException('Prescription medicine does not match the invoice medicine.');
              }
              if (prescribed.billedQuantity + line.quantity > prescribed.quantity) {
                throw new ConflictException(
                  `Only ${prescribed.quantity - prescribed.billedQuantity} prescribed units remain for ${prescribed.medicineName}.`,
                );
              }
              medicineId = prescribed.medicineId;
              prescription = {
                id: prescribed.id,
                dosage: prescribed.dosage,
                frequency: prescribed.frequency,
                durationDays: prescribed.durationDays,
                instructions: prescribed.instructions,
                billedQuantity: prescribed.billedQuantity,
              };
            }
            if (medicineId) {
              if (seenMedicines.has(medicineId)) {
                throw new BadRequestException('Add each medicine only once per invoice.');
              }
              seenMedicines.add(medicineId);
              medicine = await transaction.medicine.findFirst({
                where: { id: medicineId, clinicId: user.clinicId, active: true },
                select: {
                  id: true,
                  name: true,
                  quantity: true,
                  sellingPrice: true,
                  batchNumber: true,
                  expiresAt: true,
                },
              });
              if (!medicine) {
                throw new NotFoundException('An active invoice medicine was not found in this clinic.');
              }
              if (medicine.quantity < line.quantity) {
                throw new ConflictException(`Insufficient stock for ${medicine.name}.`);
              }
              if (
                medicine.expiresAt &&
                medicine.expiresAt.toISOString().slice(0, 10) < new Date().toISOString().slice(0, 10)
              ) {
                throw new BadRequestException(`Expired medicine cannot be billed: ${medicine.name}.`);
              }
              name = medicine.name;
              unitPrice = medicine.sellingPrice;
            }
            if (line.consumableId) {
              if (seenConsumables.has(line.consumableId)) {
                throw new BadRequestException('Add each clinical supply only once per invoice.');
              }
              seenConsumables.add(line.consumableId);
              consumable = await transaction.consumable.findFirst({
                where: { id: line.consumableId, clinicId: user.clinicId, active: true },
                select: {
                  id: true,
                  name: true,
                  quantity: true,
                  sellingPrice: true,
                  batchNumber: true,
                  expiresAt: true,
                },
              });
              if (!consumable) {
                throw new NotFoundException('An active invoice clinical supply was not found in this clinic.');
              }
              if (consumable.quantity < line.quantity) {
                throw new ConflictException(`Insufficient stock for ${consumable.name}.`);
              }
              if (
                consumable.expiresAt &&
                consumable.expiresAt.toISOString().slice(0, 10) < new Date().toISOString().slice(0, 10)
              ) {
                throw new BadRequestException(`Expired clinical supply cannot be billed: ${consumable.name}.`);
              }
              name = consumable.name;
              unitPrice = consumable.sellingPrice;
            }
            if (!name) {
              throw new BadRequestException('Invoice item name cannot be empty.');
            }
            const lineTotal = unitPrice.mul(line.quantity).toDecimalPlaces(2);
            if (lineTotal.greaterThan('9999999999.99')) {
              throw new BadRequestException('An invoice line total exceeds the supported amount.');
            }
            billableItems.push({
              medicine,
              consumable,
              prescription,
              name,
              quantity: line.quantity,
              unitPrice,
              lineTotal,
            });
          }
          const subtotal = billableItems.reduce(
            (sum, line) => sum.plus(line.lineTotal),
            new Prisma.Decimal(0),
          );
          const amounts = this.calculateTotals(subtotal, input.discount, input.taxRate);

          const clinic = await transaction.clinic.update({
            where: { id: user.clinicId },
            data: { nextInvoiceNumber: { increment: 1 } },
            select: { nextInvoiceNumber: true },
          });
          const serial = clinic.nextInvoiceNumber - 1;
          const invoiceNumber = `CSK-${invoiceDate.getUTCFullYear()}-${String(serial).padStart(6, '0')}`;
          const invoice = await transaction.invoice.create({
            data: {
              clinicId: user.clinicId,
              patientId: patient.id,
              encounterId: resolvedEncounterId,
              createdById: user.sub,
              invoiceNumber,
              invoiceDate,
              subtotal: amounts.subtotal,
              discount: amounts.discount,
              taxRate: amounts.taxRate,
              taxAmount: amounts.taxAmount,
              total: amounts.total,
              template: input.template,
              notes: input.notes?.trim() || null,
            },
          });

          for (const line of billableItems) {
            const { medicine } = line;
            if (medicine) {
              const quantityUpdate = await transaction.medicine.updateMany({
                where: {
                  id: medicine.id,
                  clinicId: user.clinicId,
                  active: true,
                  quantity: { gte: line.quantity },
                },
                data: { quantity: { decrement: line.quantity } },
              });
              if (quantityUpdate.count !== 1) {
                throw new ConflictException(`Insufficient or changed stock for ${line.name}.`);
              }
              await transaction.medicineStockMovement.create({
                data: {
                  clinicId: user.clinicId,
                  medicineId: medicine.id,
                  userId: user.sub,
                  type: MedicineStockMovementType.DISPENSED,
                  quantityDelta: -line.quantity,
                  quantityBefore: medicine.quantity,
                  quantityAfter: medicine.quantity - line.quantity,
                  reason: `Dispensed on invoice ${invoiceNumber}`,
                },
              });
            }

            if (line.consumable) {
              const consumableUpdate = await transaction.consumable.updateMany({
                where: {
                  id: line.consumable.id,
                  clinicId: user.clinicId,
                  active: true,
                  quantity: { gte: line.quantity },
                },
                data: { quantity: { decrement: line.quantity } },
              });
              if (consumableUpdate.count !== 1) {
                throw new ConflictException(`Insufficient or changed stock for ${line.name}.`);
              }
              await transaction.consumableStockMovement.create({
                data: {
                  clinicId: user.clinicId,
                  consumableId: line.consumable.id,
                  userId: user.sub,
                  patientId: patient.id,
                  ...(resolvedEncounterId ? { encounterId: resolvedEncounterId } : {}),
                  invoiceId: invoice.id,
                  type: ConsumableStockMovementType.DISPENSED,
                  quantityDelta: -line.quantity,
                  quantityBefore: line.consumable.quantity,
                  quantityAfter: line.consumable.quantity - line.quantity,
                  reason: `Used for patient care and billed on invoice ${invoiceNumber}`,
                },
              });
            }

            if (line.prescription) {
              const updatedPrescription = await transaction.prescriptionItem.updateMany({
                where: {
                  id: line.prescription.id,
                  clinicId: user.clinicId,
                  billedQuantity: line.prescription.billedQuantity,
                },
                data: { billedQuantity: { increment: line.quantity } },
              });
              if (updatedPrescription.count !== 1) {
                throw new ConflictException('Prescription quantity changed during billing. Refresh and retry.');
              }
            }

            await transaction.invoiceItem.create({
              data: {
                clinicId: user.clinicId,
                invoiceId: invoice.id,
                medicineId: medicine?.id,
                consumableId: line.consumable?.id,
                name: line.name,
                quantity: line.quantity,
                unitPrice: line.unitPrice,
                lineTotal: line.lineTotal,
                batchNumber: medicine?.batchNumber,
                expiresAt: medicine?.expiresAt,
                prescriptionItemId: line.prescription?.id,
                prescriptionDosage: line.prescription?.dosage,
                prescriptionFrequency: line.prescription?.frequency,
                prescriptionDurationDays: line.prescription?.durationDays,
                prescriptionInstructions: line.prescription?.instructions,
              },
            });
          }

          if (input.initialPayment) {
            await this.createPayment(transaction, user, invoice, input.initialPayment, invoiceNumber);
          }

          const createdInvoice = await transaction.invoice.findFirstOrThrow({
            where: { id: invoice.id, clinicId: user.clinicId },
            include: INVOICE_INCLUDE,
          });
          await writeAuditLog(transaction, {
            clinicId: user.clinicId,
            userId: user.sub,
            action: 'INVOICE_CREATED',
            resource: 'invoice',
            resourceId: invoice.id,
            metadata: {
              invoiceNumber,
              itemCount: billableItems.length,
              total: amounts.total.toString(),
            },
          });
          return createdInvoice;
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
      return this.withPaymentSummary(invoice);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') {
        throw new ConflictException('Clinic data changed during invoice creation. Please retry.');
      }
      throw error;
    }
  }

  async receivePayment(user: AuthenticatedUser, invoiceId: string, input: CreateInvoicePaymentDto) {
    try {
      const invoice = await this.prisma.$transaction(
        async (transaction) => {
          const existing = await transaction.invoice.findFirst({
            where: { id: invoiceId, clinicId: user.clinicId },
            include: { payments: true },
          });
          if (!existing) {
            throw new NotFoundException('Invoice not found.');
          }
          await this.createPayment(transaction, user, existing, input, existing.invoiceNumber);
          return transaction.invoice.findFirstOrThrow({
            where: { id: invoiceId, clinicId: user.clinicId },
            include: INVOICE_INCLUDE,
          });
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
      return this.withPaymentSummary(invoice);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') {
        throw new ConflictException('Payment or invoice balance changed. Refresh and retry.');
      }
      throw error;
    }
  }

  private calculateTotals(subtotal: Prisma.Decimal, discountValue: number, taxRateValue: number) {
    if (subtotal.greaterThan('9999999999.99')) {
      throw new BadRequestException('Invoice subtotal exceeds the supported amount.');
    }
    const discount = this.decimal(discountValue);
    const taxRate = this.decimal(taxRateValue);
    if (discount.greaterThan(subtotal)) {
      throw new BadRequestException('Discount cannot exceed the invoice subtotal.');
    }
    const taxAmount = subtotal.minus(discount).mul(taxRate).div(100).toDecimalPlaces(2);
    const total = subtotal.minus(discount).plus(taxAmount).toDecimalPlaces(2);
    if (total.greaterThan('9999999999.99')) {
      throw new BadRequestException('Invoice total exceeds the supported amount.');
    }
    return {
      subtotal,
      discount,
      taxRate,
      taxAmount,
      total,
    };
  }

  private async createPayment(
    transaction: BillingTransaction,
    user: AuthenticatedUser,
    invoice: { id: string; total: Prisma.Decimal; payments?: { amount: Prisma.Decimal }[] },
    input: CreateInvoicePaymentDto,
    invoiceNumber: string,
  ) {
    const paid = (invoice.payments || []).reduce(
      (sum, payment) => sum.plus(payment.amount),
      new Prisma.Decimal(0),
    );
    const amount = this.decimal(input.amount);
    if (amount.lessThanOrEqualTo(0)) {
      throw new BadRequestException('Payment amount must be greater than zero.');
    }
    if (paid.plus(amount).greaterThan(invoice.total)) {
      throw new BadRequestException(
        `Payment exceeds the outstanding balance of ${invoice.total.minus(paid).toFixed(2)}.`,
      );
    }

    const paymentCount = await transaction.invoicePayment.count({
      where: { clinicId: user.clinicId, invoiceId: invoice.id },
    });
    await transaction.invoice.update({
      where: { id: invoice.id },
      data: { updatedAt: new Date() },
    });
    const payment = await transaction.invoicePayment.create({
      data: {
        clinicId: user.clinicId,
        invoiceId: invoice.id,
        receivedById: user.sub,
        receiptNumber: `${invoiceNumber}-R${String(paymentCount + 1).padStart(3, '0')}`,
        amount,
        method: input.method,
        reference: input.reference?.trim() || null,
        paidAt: input.paidAt ? new Date(input.paidAt) : new Date(),
      },
    });
    await writeAuditLog(transaction, {
      clinicId: user.clinicId,
      userId: user.sub,
      action: 'PAYMENT_RECEIVED',
      resource: 'invoice_payment',
      resourceId: payment.id,
      metadata: {
        invoiceId: invoice.id,
        receiptNumber: payment.receiptNumber,
        amount: payment.amount.toString(),
        method: payment.method,
      },
    });
    return payment;
  }

  private decimal(value: number) {
    return new Prisma.Decimal(String(value));
  }

  private withPaymentSummary<T extends InvoiceWithDetails>(invoice: T) {
    const paid = invoice.payments.reduce(
      (sum, payment) => sum.plus(payment.amount),
      new Prisma.Decimal(0),
    );
    const balance = invoice.total.minus(paid).toDecimalPlaces(2);
    return {
      ...invoice,
      paid,
      balance,
      status: balance.isZero() ? 'PAID' : paid.isZero() ? 'UNPAID' : 'PARTIALLY_PAID',
    };
  }
}
