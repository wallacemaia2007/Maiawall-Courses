import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { timeout } from 'rxjs';

import { AuthStateService } from '../auth/auth-state.service';
import { environment } from '../../../environments/environment';

const REQUEST_TIMEOUT_MS = 15000;

/*
 * Anexa o token JWT (Authorization: Bearer) às chamadas da nossa API.
 * Requisições para hosts externos são ignoradas.
 * Se o backend migrar para sessão por cookie (com CSRF), basta trocar este
 * interceptor pelo padrão usado no Maiawall Homolog (X-CSRF-Token).
 */
export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const isExternalOrigin = request.url.startsWith('http');
  const isOurApi = !isExternalOrigin || request.url.startsWith(environment.apiUrl);

  if (!isOurApi) {
    return next(request);
  }

  const accessToken = inject(AuthStateService).accessToken();

  const authorizedRequest =
    accessToken && !request.headers.has('Authorization')
      ? request.clone({
          setHeaders: { Authorization: `Bearer ${accessToken}` },
        })
      : request;

  return next(authorizedRequest).pipe(timeout(REQUEST_TIMEOUT_MS));
};