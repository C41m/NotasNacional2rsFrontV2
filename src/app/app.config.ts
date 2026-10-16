import {
  ApplicationConfig,
  LOCALE_ID,
  provideBrowserGlobalErrorListeners
} from '@angular/core';
import { provideRouter, withComponentInputBinding, withInMemoryScrolling } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { registerLocaleData } from '@angular/common';
import localePt from '@angular/common/locales/pt';
import { MessageService, ConfirmationService } from 'primeng/api';
import { providePrimeNG } from 'primeng/config';
import { TwoRSPreset } from './theme/2rs-preset';
import { primengLicense } from './theme/primeng-license';
import { errorInterceptor } from './services/error.interceptor';
import { routes } from './app.routes';

registerLocaleData(localePt);

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    // Sem provideZoneChangeDetection: o scaffold do Angular 22 é zoneless e
    // não instala zone.js. Adicionar o provider sem o polyfill quebra o
    // bootstrap com NG0908 — e o build NÃO acusa esse erro, porque só
    // aparece em runtime (tela preta + "requires Zone.js" no console).
    provideRouter(
      routes,
      withComponentInputBinding(),
      withInMemoryScrolling({ scrollPositionRestoration: 'top' })
    ),
    provideHttpClient(withInterceptors([errorInterceptor])),
    providePrimeNG({
      // Chave Community do PrimeUI. Indefinida enquanto não for colada em
      // src/app/theme/primeng-license.ts — nesse caso o PrimeNG mostra a
      // tarja "Invalid PrimeUI License", mas a app funciona normalmente.
      license: primengLicense,
      theme: {
        preset: TwoRSPreset,
        options: {
          darkModeSelector: '.dark-theme',
          cssLayer: false
        }
      },
      ripple: true
    }),
    MessageService,
    ConfirmationService,
    { provide: LOCALE_ID, useValue: 'pt-BR' }
  ]
};
