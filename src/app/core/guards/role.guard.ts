import { inject } from '@angular/core';
import { CanActivateChildFn, CanActivateFn, Router } from '@angular/router';

import { AuthStateService } from '../auth/auth-state.service';
import { UserRole } from '../models/user.model';

/*
 * Guard por permissão (roles). Usado na área administrativa.
 *
 * Uso:
 *   canActivate: [roleGuard(['ADMIN', 'INSTRUCTOR'])]
 */
export const roleGuard =
  (roles: UserRole[]): CanActivateFn =>
  () => {
    const authState = inject(AuthStateService);
    const router = inject(Router);

    if (authState.hasAnyRole(roles)) {
      return true;
    }

    return router.createUrlTree(['/app/dashboard']);
  };

export const roleChildGuard =
  (roles: UserRole[]): CanActivateChildFn =>
  () => {
    const authState = inject(AuthStateService);
    const router = inject(Router);

    if (authState.hasAnyRole(roles)) {
      return true;
    }

    return router.createUrlTree(['/app/dashboard']);
  };