import type { Request, Response } from 'express';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { createApp } from './main';

let appPromise: Promise<NestExpressApplication> | undefined;

async function getApp(): Promise<NestExpressApplication> {
  if (!appPromise) {
    appPromise = (async () => {
      const app = await createApp();
      await app.init();
      return app;
    })().catch((error: unknown) => {
      appPromise = undefined;
      throw error;
    });
  }

  return appPromise;
}

export async function handler(request: Request, response: Response): Promise<void> {
  const app = await getApp();
  app.getHttpAdapter().getInstance()(request, response);
}
