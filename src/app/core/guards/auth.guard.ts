import { inject } from '@angular/core';
import { CanActivateChildFn, CanActivateFn, Router } from '@angular/router';
import { catchError, of, switchMap } from 'rxjs';

import { AuthService } from '../auth/auth.service';
import { AuthStateService } from '../auth/auth-state.service';

/*
 * Protege áreas autenticadas (ex.: /app).
 * - O bootstrap tenta restaurar a sessao pelo cookie httpOnly.
 * - Com access token em memoria, valida a sessao contra o backend; erros
 *   (ex.: refresh expirado) sao tratados aqui.
 */
export const authGuard: CanActivateFn = (_route, state) => {
  const authState = inject(AuthStateService);
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authState.isAuthenticated()) {
    return true;
  }

  return (authState.accessToken() ? authService.getSession() : of(null)).pipe(
    catchError(() => of(null)),
    switchMap((session) => {
      if (session) {
        return of(true);
      }

      authState.clearSession();

      return of(
        router.createUrlTree(['/login'], {
          queryParams: { redirect: state.url },
        }),
      );
    }),
  );
};

export const authChildGuard: CanActivateChildFn = authGuard;
