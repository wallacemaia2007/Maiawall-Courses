import { ApplicationConfig, inject, provideAppInitializer, provideZoneChangeDetection } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import { catchError, firstValueFrom, of } from 'rxjs';

import { routes } from './app.routes';
import { AuthService } from './core/auth/auth.service';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { errorInterceptor } from './core/interceptors/error.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(
      routes,
      /*
       * Scroll fica a cargo do Lenis (SmoothScrollService). Restauração nativa
       * do router conflita com o scroll suavizado — reset/sincronização na navegação.
       */
      withInMemoryScrolling({
        anchorScrolling: 'disabled',
        scrollPositionRestoration: 'disabled',
      }),
    ),
    provideHttpClient(withInterceptors([authInterceptor, errorInterceptor])),
    /*
     * Reidrata a sessao pelo cookie httpOnly antes do app renderizar.
     * O backend rotaciona o refresh token e devolve um access token efemero;
     * o AuthStateService o mantem apenas em memoria.
     */
    provideAppInitializer(() => {
      const authService = inject(AuthService);

      return firstValueFrom(authService.refreshSession().pipe(catchError(() => of(null))));
    }),
  ],
};
