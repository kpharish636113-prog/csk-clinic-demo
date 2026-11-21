import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateExternalMedicalRecordDto } from '../src/patients/external-medical-record.dto';

describe('External medical record DTO validation', () => {
  it('requires an outside-provider type, doctor, and valid historical date', async () => {
    const record = plainToInstance(CreateExternalMedicalRecordDto, {
      recordDate: 'not-a-date',
      recordType: 'x',
      doctorName: '',
    });

    const errors = await validate(record);
    expect(errors.map((error) => error.property)).toEqual(
      expect.arrayContaining(['recordDate', 'recordType', 'doctorName']),
    );
  });
});
