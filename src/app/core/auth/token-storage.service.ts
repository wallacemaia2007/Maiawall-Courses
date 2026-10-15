import { Injectable } from '@angular/core';

import { LEGACY_AUTH_STORAGE_KEYS, AuthTokens } from '../models/auth.model';

/*
 * O access token existe apenas enquanto o app esta aberto. O refresh token
 * permanece no cookie httpOnly e nao pode ser lido pelo JavaScript.
 */
@Injectable({
  providedIn: 'root',
})
export class TokenStorageService {
  private accessToken: string | null = null;

  constructor() {
    this.clearLegacyStorage();
  }

  getAccessToken(): string | null {
    return this.accessToken;
  }

  setTokens(tokens: AuthTokens): void {
    this.accessToken = tokens.accessToken;
    this.clearLegacyStorage();
  }

  clear(): void {
    this.accessToken = null;
    this.clearLegacyStorage();
  }

  private clearLegacyStorage(): void {
    if (typeof localStorage === 'undefined') {
      return;
    }

    localStorage.removeItem(LEGACY_AUTH_STORAGE_KEYS.accessToken);
    localStorage.removeItem(LEGACY_AUTH_STORAGE_KEYS.refreshToken);
  }
}
