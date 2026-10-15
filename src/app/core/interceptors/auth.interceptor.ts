import { HttpContextToken, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError, timeout } from 'rxjs';

import { AuthService } from '../auth/auth.service';
import { AuthStateService } from '../auth/auth-state.service';
import { AUTH_ENDPOINTS } from '../constants/api.constants';
import { environment } from '../../../environments/environment';

const REQUEST_TIMEOUT_MS = 15000;
const AUTH_RETRIED = new HttpContextToken<boolean>(() => false);
const NON_RETRYABLE_AUTH_ENDPOINTS = [
  AUTH_ENDPOINTS.login,
  AUTH_ENDPOINTS.signup,
  AUTH_ENDPOINTS.logout,
  AUTH_ENDPOINTS.refreshToken,
  AUTH_ENDPOINTS.forgotPassword,
  AUTH_ENDPOINTS.resetPassword,
  AUTH_ENDPOINTS.verifyEmail,
  AUTH_ENDPOINTS.oauthExchange,
].map((endpoint) => `${environment.apiUrl}${endpoint}`);

function hasUnauthorizedStatus(error: unknown): boolean {
  if (typeof error !== 'object' || error === null || !('status' in error)) {
    return false;
  }

  return (error as { status?: unknown }).status === 401;
}

function isNonRetryableAuthRequest(url: string): boolean {
  const path = url.split('?')[0].replace(/\/+$/, '');
  return NON_RETRYABLE_AUTH_ENDPOINTS.includes(path);
}

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const authState = inject(AuthStateService);
  const authService = inject(AuthService);
  const router = inject(Router);

  const isExternalOrigin = request.url.startsWith('http');
  const isOurApi = !isExternalOrigin || request.url.startsWith(environment.apiUrl);

  if (!isOurApi) {
    return next(request);
  }

  const accessToken = authState.accessToken();
  const authorizedRequest = request.clone({
    withCredentials: true,
    ...(accessToken && !request.headers.has('Authorization')
      ? { setHeaders: { Authorization: `Bearer ${accessToken}` } }
      : {}),
  });

  if (isNonRetryableAuthRequest(request.url)) {
    return next(authorizedRequest).pipe(timeout(REQUEST_TIMEOUT_MS));
  }

  const clearAndRedirectIfNeeded = (): void => {
    authState.clearSession();
    const currentUrl = router.url || '/';

    if (currentUrl.startsWith('/admin')) {
      router.navigate(['/login'], {
        queryParams: { redirect: currentUrl },
        replaceUrl: true,
      });
    }
  };

  return next(authorizedRequest).pipe(
    timeout(REQUEST_TIMEOUT_MS),
    catchError((error: unknown) => {
      if (!hasUnauthorizedStatus(error) || request.context.get(AUTH_RETRIED)) {
        return throwError(() => error);
      }

      return authService.refreshSession().pipe(
        catchError(() => {
          clearAndRedirectIfNeeded();
          return throwError(() => error);
        }),
        switchMap((session) => {
          if (!session) {
            clearAndRedirectIfNeeded();
            return throwError(() => error);
          }

          const retriedRequest = request.clone({
            withCredentials: true,
            setHeaders: { Authorization: `Bearer ${session.tokens.accessToken}` },
            context: request.context.set(AUTH_RETRIED, true),
          });

          return next(retriedRequest).pipe(
            timeout(REQUEST_TIMEOUT_MS),
            catchError((retryError: unknown) => {
              if (hasUnauthorizedStatus(retryError)) {
                clearAndRedirectIfNeeded();
              }

              return throwError(() => retryError);
            }),
          );
        }),
      );
    }),
  );
};
