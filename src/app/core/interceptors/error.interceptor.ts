import { HttpInterceptorFn } from '@angular/common/http';
import { inject, isDevMode } from '@angular/core';
import { catchError, throwError } from 'rxjs';

import { AuthStateService } from '../auth/auth-state.service';
import { ApiError, toApiError } from '../models/api-error.model';

/*
 * Normaliza erros HTTP para o domínio `ApiError` e trata casos transversais:
 * - 401: sessão expirada/inválida → limpa estado e redireciona para /login.
 * - demais erros: apenas repassa no formato padronizado; as páginas decidem a UI.
 */
export const errorInterceptor: HttpInterceptorFn = (request, next) => {
  return next(request).pipe(
    catchError((error: unknown) => {
      const apiError: ApiError = toApiError(error);

      if (apiError.status === 401) {
        const authState = inject(AuthStateService);
        authState.clearSession();

        const currentUrl = window.location.pathname;
        const isAuthRoute = currentUrl.startsWith('/login');

        if (!isAuthRoute) {
          window.location.href = `/login?redirect=${encodeURIComponent(currentUrl)}`;
        }
      }

      if (isDevMode()) {
        console.error('[api-request-failed]', apiError);
      }

      return throwError(() => apiError);
    }),
  );
};