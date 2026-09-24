import { HttpInterceptorFn } from '@angular/common/http';
import { inject, isDevMode } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

import { AuthStateService } from '../auth/auth-state.service';
import { ApiError, toApiError } from '../models/api-error.model';

/*
 * Normaliza erros HTTP para o domínio `ApiError` e trata casos transversais:
 * - 401: sessão expirada/inválida → limpa estado e redireciona para /login.
 * - demais erros: apenas repassa no formato padronizado; as páginas decidem a UI.
 */
export const errorInterceptor: HttpInterceptorFn = (request, next) => {
  const authState = inject(AuthStateService);
  const router = inject(Router);

  return next(request).pipe(
    catchError((error: unknown) => {
      const apiError: ApiError = toApiError(error);

      if (apiError.status === 401) {
        authState.clearSession();

        const currentUrl = router.url || '/';
        const isProtectedRoute = currentUrl.startsWith('/admin');

        if (isProtectedRoute) {
          router.navigate(['/login'], {
            queryParams: { redirect: currentUrl },
            replaceUrl: true,
          });
        }
      }

      if (isDevMode()) {
        console.error('[api-request-failed]', apiError);
      }

      return throwError(() => apiError);
    }),
  );
};
