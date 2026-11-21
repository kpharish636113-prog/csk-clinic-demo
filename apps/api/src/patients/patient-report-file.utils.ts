import { BadRequestException } from '@nestjs/common';

const MAX_REPORT_BYTES = 2 * 1024 * 1024;
const MIME_BY_EXTENSION: Record<string, string> = {
  pdf: 'application/pdf',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif',
  txt: 'text/plain',
};

export function validatePatientReportFile(
  fileDataUrl?: string,
  fileName?: string,
  mimeType?: string,
): void {
  if (!fileDataUrl) return;

  const match = /^data:(application\/pdf|image\/(?:png|jpeg|webp|gif)|text\/plain);base64,([A-Za-z0-9+/]+={0,2})$/.exec(fileDataUrl);
  if (!match || !fileName) {
    throw new BadRequestException('Report attachment must be a supported, valid base64 file.');
  }

  const [, dataMime, encodedBytes] = match;
  const extension = fileName.split('.').pop()?.toLowerCase() || '';
  if (MIME_BY_EXTENSION[extension] !== dataMime || mimeType !== dataMime) {
    throw new BadRequestException('Report file name, MIME type, and file content must match.');
  }

  const bytes = Buffer.from(encodedBytes, 'base64');
  if (bytes.length > MAX_REPORT_BYTES) {
    throw new BadRequestException('Report file must be smaller than 2 MB.');
  }
  if (!bytes.length || bytes.toString('base64') !== encodedBytes) {
    throw new BadRequestException('Report attachment contains invalid base64 data.');
  }

  const startsWith = (...signature: number[]) => signature.every((byte, index) => bytes[index] === byte);
  const validContent = dataMime === 'application/pdf'
    ? startsWith(0x25, 0x50, 0x44, 0x46, 0x2d)
    : dataMime === 'image/png'
      ? startsWith(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)
      : dataMime === 'image/jpeg'
        ? startsWith(0xff, 0xd8, 0xff)
        : dataMime === 'image/webp'
          ? startsWith(0x52, 0x49, 0x46, 0x46) && bytes.toString('ascii', 8, 12) === 'WEBP'
          : dataMime === 'image/gif'
            ? ['GIF87a', 'GIF89a'].includes(bytes.toString('ascii', 0, 6))
            : validUtf8Text(bytes);
  if (!validContent) {
    throw new BadRequestException('Report attachment content does not match its file type.');
  }
}

function validUtf8Text(bytes: Buffer): boolean {
  if (bytes.includes(0)) return false;
  try {
    new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    return true;
  } catch {
    return false;
  }
}
