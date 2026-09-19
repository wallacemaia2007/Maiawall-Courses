import { inject } from '@angular/core';
import { CanActivateChildFn, CanActivateFn, Router } from '@angular/router';

import { AuthStateService } from '../auth/auth-state.service';

/*
 * Protege páginas destinadas apenas a visitantes (ex.: /login, /signup).
 * Usuário com sessão autenticada é redirecionado para a área do aluno.
 */
export const guestGuard: CanActivateFn = () => {
  const authState = inject(AuthStateService);
  const router = inject(Router);

  if (authState.isAuthenticated()) {
    return router.createUrlTree(['/app/dashboard']);
  }

  return true;
};

export const guestChildGuard: CanActivateChildFn = guestGuard;