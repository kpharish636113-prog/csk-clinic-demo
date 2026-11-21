import { NotFoundException } from '@nestjs/common';
import { InvoiceTemplate } from '@prisma/client';
import { Prisma } from '@prisma/client';
import { AuthenticatedUser } from '../src/auth/auth.types';
import { CreateInvoiceDto } from '../src/billing/billing.dto';
import { BillingService } from '../src/billing/billing.service';
import { PrismaService } from '../src/prisma/prisma.service';

describe('BillingService encounter links', () => {
  const patientId = '00000000-0000-4000-8000-000000000003';
  const encounterId = '00000000-0000-4000-8000-000000000004';
  const user: AuthenticatedUser = {
    sub: '00000000-0000-4000-8000-000000000001',
    clinicId: '00000000-0000-4000-8000-000000000002',
    role: 'ACCOUNTANT',
  };

  it('creates a clinic-scoped invoice linked to the selected patient encounter', async () => {
    const transaction = {
      patient: { findFirst: jest.fn().mockResolvedValue({ id: patientId }) },
      patientEncounter: { findFirst: jest.fn().mockResolvedValue({ id: encounterId }) },
      clinic: { update: jest.fn().mockResolvedValue({ nextInvoiceNumber: 2 }) },
      invoice: {
        create: jest.fn().mockResolvedValue({ id: 'invoice-1' }),
        findFirstOrThrow: jest.fn().mockResolvedValue({
          id: 'invoice-1',
          total: new Prisma.Decimal(500),
          payments: [],
        }),
      },
      invoiceItem: { create: jest.fn().mockResolvedValue({ id: 'item-1' }) },
      auditLog: { create: jest.fn().mockResolvedValue({ id: 'audit-1' }) },
    };
    const prisma = {
      $transaction: jest.fn((callback: (tx: typeof transaction) => Promise<unknown>) => callback(transaction)),
    } as unknown as PrismaService;
    const input = Object.assign(new CreateInvoiceDto(), {
      patientId,
      encounterId,
      template: InvoiceTemplate.PROFESSIONAL,
      items: [{ name: 'Consultation', quantity: 1, unitPrice: 500 }],
    });

    await expect(new BillingService(prisma).createInvoice(user, input)).resolves.toMatchObject({
      id: 'invoice-1',
      status: 'UNPAID',
    });
    expect(transaction.patientEncounter.findFirst).toHaveBeenCalledWith({
      where: { id: encounterId, clinicId: user.clinicId, patientId },
      select: { id: true },
    });
    expect(transaction.invoice.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ patientId, encounterId }),
    }));
  });

  it('rejects a visit link that does not belong to the selected patient', async () => {
    const transaction = {
      patient: { findFirst: jest.fn().mockResolvedValue({ id: patientId }) },
      patientEncounter: { findFirst: jest.fn().mockResolvedValue(null) },
    };
    const prisma = {
      $transaction: jest.fn((callback: (tx: typeof transaction) => Promise<unknown>) => callback(transaction)),
    } as unknown as PrismaService;
    const input = Object.assign(new CreateInvoiceDto(), {
      patientId,
      encounterId,
      items: [{ name: 'Consultation', quantity: 1, unitPrice: 500 }],
    });

    await expect(new BillingService(prisma).createInvoice(user, input))
      .rejects.toBeInstanceOf(NotFoundException);
  });
});
