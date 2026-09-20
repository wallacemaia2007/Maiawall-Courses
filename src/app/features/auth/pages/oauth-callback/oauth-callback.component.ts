import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { AuthService } from '../../../../core/auth/auth.service';
import { AuthStateService } from '../../../../core/auth/auth-state.service';

const OAUTH_ERROR_MESSAGES: Record<string, string> = {
  OAUTH_CANCELLED: 'O login social foi cancelado.',
  OAUTH_STATE_MISMATCH: 'A sessao de login expirou. Tente novamente.',
  OAUTH_EMAIL_MISSING: 'Sua conta nao possui um e-mail verificado.',
  OAUTH_EMAIL_UNVERIFIED: 'O e-mail do provedor nao foi verificado.',
  OAUTH_NOT_CONFIGURED: 'Esse login social nao esta disponivel no momento.',
  OAUTH_EXCHANGE_FAILED: 'Nao foi possivel confirmar o login. Tente novamente.',
  OAUTH_PROFILE_FAILED: 'Nao foi possivel obter seus dados. Tente novamente.',
};

@Component({
  selector: 'app-oauth-callback',
  standalone: true,
  imports: [RouterLink],
  template: `
    <main class="oauth-callback">
      @if (errorMessage()) {
        <p role="alert">{{ errorMessage() }}</p>
        <a routerLink="/login">Voltar para o login</a>
      } @else {
        <p>Confirmando seu login...</p>
      }
    </main>
  `,
  styles: [`
    :host { display: block; min-height: 100dvh; }
    .oauth-callback { display: grid; place-content: center; gap: 1rem; min-height: 100dvh; padding: 1.5rem; text-align: center; }
    .oauth-callback p { color: #4b5563; }
    .oauth-callback [role='alert'] { color: #b91c1c; }
    .oauth-callback a { color: var(--color-primary); font-weight: 600; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OauthCallbackComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly authState = inject(AuthStateService);

  protected readonly errorMessage = signal<string | null>(null);

  ngOnInit(): void {
    const params = this.route.snapshot.queryParamMap;
    const errorCode = params.get('error');

    if (errorCode) {
      this.errorMessage.set(OAUTH_ERROR_MESSAGES[errorCode] ?? 'Nao foi possivel entrar. Tente novamente.');
      return;
    }

    const accessToken = params.get('accessToken');
    const refreshToken = params.get('refreshToken');

    if (!accessToken) {
      this.errorMessage.set('Nao foi possivel entrar. Tente novamente.');
      return;
    }

    this.authState.setTokens({ accessToken, refreshToken: refreshToken ?? undefined });
    this.authService.getSession().subscribe({
      next: () => this.router.navigateByUrl('/'),
      error: () => {
        this.authState.clearSession();
        this.errorMessage.set('Nao foi possivel confirmar sua sessao. Tente novamente.');
      },
    });
  }
}