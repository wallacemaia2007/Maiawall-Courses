import { HttpInterceptorFn } from '@angular/common/http';
import { isDevMode } from '@angular/core';
import { catchError, throwError } from 'rxjs';

import { ApiError, toApiError } from '../models/api-error.model';

/*
 * Normaliza erros HTTP para o domínio `ApiError` e trata casos transversais:
 * - 401: a renovacao e a limpeza da sessao ficam a cargo do authInterceptor.
 * - demais erros: apenas repassa no formato padronizado; as páginas decidem a UI.
 */
export const errorInterceptor: HttpInterceptorFn = (request, next) => {
  return next(request).pipe(
    catchError((error: unknown) => {
      const apiError: ApiError = toApiError(error);

      if (isDevMode()) {
        console.error('[api-request-failed]', apiError);
      }

      return throwError(() => apiError);
    }),
  );
};
