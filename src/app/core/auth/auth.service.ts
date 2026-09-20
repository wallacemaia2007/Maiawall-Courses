import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, finalize, map, of, shareReplay, tap } from 'rxjs';

import { environment } from '../../../environments/environment';
import { AUTH_ENDPOINTS } from '../constants/api.constants';
import { ApiResponse, unwrapApiData } from '../models/api-response.model';
import {
  AuthSession,
  LoginCredentials,
  OAuthProvider,
  OAuthTicketExchange,
  PasswordRecoveryRequest,
  ResetPasswordPayload,
  SignupCredentials,
  VerifyEmailPayload,
} from '../models/auth.model';
import { AuthStateService } from './auth-state.service';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private sessionRequest$: Observable<AuthSession | null> | null = null;

  constructor(
    private readonly http: HttpClient,
    private readonly authState: AuthStateService,
  ) {}

  login(credentials: LoginCredentials): Observable<AuthSession> {
    return this.http
      .post<ApiResponse<AuthSession>>(this.authUrl(AUTH_ENDPOINTS.login), credentials)
      .pipe(
        map(unwrapApiData),
        tap((session) => this.authState.setSession(session)),
      );
  }

  signup(credentials: SignupCredentials): Observable<AuthSession> {
    return this.http
      .post<ApiResponse<AuthSession>>(this.authUrl(AUTH_ENDPOINTS.signup), credentials)
      .pipe(
        map(unwrapApiData),
        tap((session) => this.authState.setSession(session)),
      );
  }

  logout(): Observable<void> {
    const refreshToken = this.authState.refreshToken();

    return this.http
      .post<void>(this.authUrl(AUTH_ENDPOINTS.logout), { refreshToken })
      .pipe(
        map(() => void 0),
        tap(() => this.authState.clearSession()),
      );
  }

  refreshSession(): Observable<AuthSession | null> {
    const refreshToken = this.authState.refreshToken();

    if (!refreshToken) {
      return of(null);
    }

    return this.http
      .post<ApiResponse<AuthSession>>(this.authUrl(AUTH_ENDPOINTS.refreshToken), {
        refreshToken,
      })
      .pipe(
        map(unwrapApiData),
        tap((session) => this.authState.setSession(session)),
      );
  }

  requestPasswordRecovery(email: string): Observable<void> {
    const request: PasswordRecoveryRequest = { email };

    return this.http
      .post<ApiResponse<{ accepted: boolean }>>(
        this.authUrl(AUTH_ENDPOINTS.forgotPassword),
        request,
      )
      .pipe(map(() => void 0));
  }

  resetPassword(payload: ResetPasswordPayload): Observable<void> {
    return this.http
      .post<ApiResponse<void>>(this.authUrl(AUTH_ENDPOINTS.resetPassword), payload)
      .pipe(map(() => void 0));
  }

  verifyEmail(payload: VerifyEmailPayload): Observable<void> {
    return this.http
      .post<ApiResponse<void>>(this.authUrl(AUTH_ENDPOINTS.verifyEmail), payload)
      .pipe(map(() => void 0));
  }

  startOAuthLogin(provider: OAuthProvider): void {
    const endpoint =
      provider === 'google' ? AUTH_ENDPOINTS.oauthGoogle : AUTH_ENDPOINTS.oauthGithub;
    window.location.href = this.authUrl(endpoint);
  }

  exchangeOAuthTicket(ticket: string): Observable<AuthSession> {
    const payload: OAuthTicketExchange = { ticket };

    return this.http
      .post<ApiResponse<AuthSession>>(this.authUrl(AUTH_ENDPOINTS.oauthExchange), payload)
      .pipe(
        map(unwrapApiData),
        tap((session) => this.authState.setSession(session)),
      );
  }

  getSession(): Observable<AuthSession | null> {
    if (this.authState.isAuthenticated()) {
      return of({
        user: this.authState.user()!,
        tokens: {
          accessToken: this.authState.accessToken()!,
          refreshToken: this.authState.refreshToken() ?? undefined,
        },
      });
    }

    const token = this.authState.accessToken();

    if (!token) {
      return of(null);
    }

    if (!this.sessionRequest$) {
      this.sessionRequest$ = this.http
        .get<ApiResponse<AuthSession>>(this.authUrl(AUTH_ENDPOINTS.me))
        .pipe(
          map(unwrapApiData),
          tap((session) => this.authState.setSession(session)),
          shareReplay({ bufferSize: 1, refCount: false }),
          finalize(() => {
            this.sessionRequest$ = null;
          }),
        );
    }

    return this.sessionRequest$;
  }

  private authUrl(endpoint: string): string {
    return `${environment.apiUrl}${endpoint}`;
  }
}
