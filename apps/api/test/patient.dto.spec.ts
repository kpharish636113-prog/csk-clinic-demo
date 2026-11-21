import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreatePatientDto, SavePatientDraftDto, UpdatePatientDto } from '../src/patients/patient.dto';

describe('Patient DTO validation', () => {
  it('allows incomplete contact information in a registration draft', async () => {
    const draft = plainToInstance(SavePatientDraftDto, {
      payload: {
        fullName: 'Patient in progress',
        mobile: '900',
        email: 'not-finished',
      },
    });

    await expect(validate(draft)).resolves.toHaveLength(0);
  });

  it('requires a valid mobile number for a completed patient registration', async () => {
    const patient = plainToInstance(CreatePatientDto, {
      fullName: 'Patient Record',
      mobile: '900',
      email: 'not-an-email',
    });

    const errors = await validate(patient);
    expect(errors.map((error) => error.property)).toEqual(expect.arrayContaining(['mobile', 'email']));
  });

  it('rejects whitespace-only patient names and phone numbers for create and update', async () => {
    const createPatient = plainToInstance(CreatePatientDto, {
      fullName: '   ',
      mobile: '       ',
    });
    const createErrors = await validate(createPatient);
    expect(createErrors.map((error) => error.property)).toEqual(expect.arrayContaining(['fullName', 'mobile']));

    const updatePatient = plainToInstance(UpdatePatientDto, {
      fullName: '   ',
      mobile: '       ',
    });
    const updateErrors = await validate(updatePatient);
    expect(updateErrors.map((error) => error.property)).toEqual(expect.arrayContaining(['fullName', 'mobile']));
  });
});
