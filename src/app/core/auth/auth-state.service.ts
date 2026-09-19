import { computed, Injectable, signal } from '@angular/core';

import { AuthSession } from '../models/auth.model';
import { User, UserRole } from '../models/user.model';
import { TokenStorageService } from './token-storage.service';

/*
 * Estado de autenticação reativo (Signal).
 * Única fonte de verdade sobre quem está logado no frontend.
 * AuthService alimenta o estado; guards/interceptors/layouts consomem.
 */
@Injectable({
  providedIn: 'root',
})
export class AuthStateService {
  private readonly userSignal = signal<User | null>(null);
  private readonly accessTokenSignal = signal<string | null>(null);

  readonly user = this.userSignal.asReadonly();
  readonly accessToken = this.accessTokenSignal.asReadonly();
  readonly isAuthenticated = computed(() => this.userSignal() !== null);

  constructor(private readonly tokenStorage: TokenStorageService) {
    this.accessTokenSignal.set(this.tokenStorage.getAccessToken());
  }

  setSession(session: AuthSession): void {
    this.tokenStorage.setTokens(session.tokens);
    this.accessTokenSignal.set(session.tokens.accessToken);
    this.userSignal.set(session.user);
  }

  setTokens(tokens: AuthSession['tokens']): void {
    this.tokenStorage.setTokens(tokens);
    this.accessTokenSignal.set(tokens.accessToken);
  }

  setUser(user: User): void {
    this.userSignal.set(user);
  }

  hasRole(role: UserRole): boolean {
    return this.userSignal()?.role === role;
  }

  hasAnyRole(roles: UserRole[]): boolean {
    const role = this.userSignal()?.role;
    return role !== undefined && roles.includes(role);
  }

  clearSession(): void {
    this.tokenStorage.clear();
    this.accessTokenSignal.set(null);
    this.userSignal.set(null);
  }
}