import { inject } from '@angular/core';
import { CanActivateChildFn, CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';

import { AuthService } from '../auth/auth.service';
import { AuthStateService } from '../auth/auth-state.service';

/*
 * Protege páginas destinadas apenas a visitantes (ex.: /login, /signup).
 * Usuário com sessão autenticada é redirecionado para a área do aluno.
 */
export const guestGuard: CanActivateFn = () => {
  const authState = inject(AuthStateService);
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authState.isAuthenticated()) {
    return router.createUrlTree(['/app/dashboard']);
  }

  if (authState.accessToken()) {
    return authService.getSession().pipe(
      map((session) => {
        if (session) {
          return router.createUrlTree(['/app/dashboard']);
        }

        authState.clearSession();
        return true;
      }),
      catchError(() => {
        authState.clearSession();
        return of(true);
      }),
    );
  }

  return true;
};

export const guestChildGuard: CanActivateChildFn = guestGuard;
