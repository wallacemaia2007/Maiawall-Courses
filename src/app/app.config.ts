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
      withInMemoryScrolling({
        anchorScrolling: 'enabled',
        scrollPositionRestoration: 'enabled',
      }),
    ),
    provideHttpClient(withInterceptors([authInterceptor, errorInterceptor])),
    /*
     * Reidrata a sessão a partir do access token salvo ANTES do app renderizar.
     * Sem isso, o AuthStateService só é populado quando um guard (authGuard/
     * guestGuard) roda — ou seja, em rotas públicas (/, /sobre, /cursos) um
     * F5 nunca valida o token salvo e a UI mostra "deslogado" até o usuário
     * cair numa rota protegida, que aí sim dispara getSession() e "conserta"
     * o estado. Isso é o que causa o efeito de alternar a cada reload.
     */
    provideAppInitializer(() => {
      const authService = inject(AuthService);

      return firstValueFrom(authService.getSession().pipe(catchError(() => of(null))));
    }),
  ],
};