import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { providePrimeNG } from 'primeng/config';
import ZincPreset from './my-preset';

export const appConfig: ApplicationConfig = {
  providers: [
    providePrimeNG({
      theme:{
        preset: ZincPreset
      }
    }),
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes)
  ]
};
