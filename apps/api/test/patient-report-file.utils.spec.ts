import { BadRequestException } from '@nestjs/common';
import { validatePatientReportFile } from '../src/patients/patient-report-file.utils';

describe('validatePatientReportFile', () => {
  it('accepts a supported file with matching name, MIME type, and signature', () => {
    const bytes = Buffer.from('%PDF-1.7\nreport');
    const dataUrl = `data:application/pdf;base64,${bytes.toString('base64')}`;

    expect(() => validatePatientReportFile(dataUrl, 'report.pdf', 'application/pdf')).not.toThrow();
  });

  it('rejects a MIME type that does not match the data URL', () => {
    const bytes = Buffer.from('%PDF-1.7\nreport');
    const dataUrl = `data:application/pdf;base64,${bytes.toString('base64')}`;

    expect(() => validatePatientReportFile(dataUrl, 'report.pdf', 'text/plain'))
      .toThrow(BadRequestException);
  });

  it('rejects contents that do not match the declared file type', () => {
    const dataUrl = `data:application/pdf;base64,${Buffer.from('not a PDF').toString('base64')}`;

    expect(() => validatePatientReportFile(dataUrl, 'report.pdf', 'application/pdf'))
      .toThrow(BadRequestException);
  });

  it('rejects report files larger than 2 MB', () => {
    const dataUrl = `data:text/plain;base64,${Buffer.alloc(2 * 1024 * 1024 + 1, 'a').toString('base64')}`;

    expect(() => validatePatientReportFile(dataUrl, 'report.txt', 'text/plain'))
      .toThrow(BadRequestException);
  });
});
