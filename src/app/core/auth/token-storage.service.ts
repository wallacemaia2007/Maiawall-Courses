import { Injectable } from '@angular/core';

import { AUTH_STORAGE_KEYS, AuthTokens } from '../models/auth.model';

/*
 * Isolamento do armazenamento dos tokens de sessão.
 * Permite trocar o meio (localStorage, sessionStorage, cookie, in-memory)
 * sem impactar AuthService/AuthStateService.
 */
@Injectable({
  providedIn: 'root',
})
export class TokenStorageService {
  getAccessToken(): string | null {
    return localStorage.getItem(AUTH_STORAGE_KEYS.accessToken);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(AUTH_STORAGE_KEYS.refreshToken);
  }

  setTokens(tokens: AuthTokens): void {
    localStorage.setItem(AUTH_STORAGE_KEYS.accessToken, tokens.accessToken);

    if (tokens.refreshToken) {
      localStorage.setItem(AUTH_STORAGE_KEYS.refreshToken, tokens.refreshToken);
    }
  }

  clear(): void {
    localStorage.removeItem(AUTH_STORAGE_KEYS.accessToken);
    localStorage.removeItem(AUTH_STORAGE_KEYS.refreshToken);
  }
}