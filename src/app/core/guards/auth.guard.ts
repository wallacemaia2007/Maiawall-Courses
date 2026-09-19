import { inject } from '@angular/core';
import { CanActivateChildFn, CanActivateFn, Router } from '@angular/router';
import { catchError, map, of, switchMap } from 'rxjs';

import { AuthService } from '../auth/auth.service';
import { AuthStateService } from '../auth/auth-state.service';

/*
 * Protege áreas autenticadas (ex.: /app).
 * - Sem token local, bloqueia direto para /login.
 * - Com token, valida a sessão contra o backend, cobrindo sessão expirada
 *   antes de renderizar o layout. Erros (ex.: 401) são tratados aqui.
 */
export const authGuard: CanActivateFn = () => {
  const authState = inject(AuthStateService);
  const authService = inject(AuthService);
  const router = inject(Router);

  return (authState.accessToken() ? authService.getSession() : of(null)).pipe(
    catchError(() => of(null)),
    switchMap((session) => {
      if (session) {
        return of(true);
      }

      authState.clearSession();

      return of(
        router.createUrlTree(['/login'], {
          queryParams: { redirect: router.routerState.snapshot.url },
        }),
      );
    }),
    map((result) => result),
  );
};

export const authChildGuard: CanActivateChildFn = authGuard;