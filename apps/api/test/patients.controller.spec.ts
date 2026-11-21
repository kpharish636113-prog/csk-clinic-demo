import 'reflect-metadata';
import { UserRole } from '@prisma/client';
import { PatientsController } from '../src/patients/patients.controller';
import { ROLES_KEY } from '../src/auth/roles.decorator';

describe('PatientsController read-only clinical history', () => {
  it('exposes archived intakes only through the read-only history route', () => {
    const roles = Reflect.getMetadata(
      ROLES_KEY,
      PatientsController.prototype.listIntakes,
    ) as UserRole[];

    expect(roles).toContain(UserRole.DOCTOR);
    expect(roles).toContain(UserRole.NURSE);
    expect(PatientsController.prototype).not.toHaveProperty('createRecord');
    expect(PatientsController.prototype).not.toHaveProperty('discharge');
  });
});
