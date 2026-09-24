import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { AuthService } from '../../../../core/auth/auth.service';
import { AuthStateService } from '../../../../core/auth/auth-state.service';
import { apiErrorMessage } from '../../../../core/models/api-error.model';
import { OAuthProvider } from '../../../../core/models/auth.model';

const OAUTH_ERROR_MESSAGES: Record<string, string> = {
  OAUTH_CANCELLED: 'O login social foi cancelado.',
  OAUTH_STATE_MISMATCH: 'A sessao de login expirou. Tente novamente.',
  OAUTH_EMAIL_MISSING: 'Sua conta nao possui um e-mail verificado.',
  OAUTH_EMAIL_UNVERIFIED: 'Nao foi possivel vincular sua conta. Entre com e-mail e senha.',
  OAUTH_NOT_CONFIGURED: 'Esse login social nao esta disponivel no momento.',
  OAUTH_EXCHANGE_FAILED: 'Nao foi possivel confirmar o login. Tente novamente.',
  OAUTH_PROFILE_FAILED: 'Nao foi possivel obter seus dados. Tente novamente.',
  OAUTH_INVALID_PROVIDER: 'Login social indisponivel.',
  missing_ticket: 'A sessao de login expirou. Tente novamente.',
};

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly authState = inject(AuthStateService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    remember: [false],
  });

  protected showPassword = false;
  protected readonly submitError = signal<string | null>(null);

  ngOnInit(): void {
    const errorCode = this.route.snapshot.queryParamMap.get('oauthError');

    if (errorCode) {
      this.submitError.set(
        OAUTH_ERROR_MESSAGES[errorCode] ?? 'Nao foi possivel entrar. Tente novamente.',
      );
    }
  }

  protected onSubmit(): void {
    this.submitError.set(null);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { email, password } = this.form.getRawValue();

    this.authService.login({ email, password }).subscribe({
      next: () => this.router.navigateByUrl(this.redirectUrl()),
      error: (error: unknown) => {
        this.submitError.set(
          apiErrorMessage(error, 'Nao foi possivel entrar. Confira seus dados.'),
        );
      },
    });
  }

  protected togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  protected loginWithProvider(provider: OAuthProvider): void {
    this.authService.startOAuthLogin(provider);
  }

  protected get email() {
    return this.form.controls.email;
  }

  protected get password() {
    return this.form.controls.password;
  }

  private redirectUrl(): string {
    const redirect = this.route.snapshot.queryParamMap.get('redirect');

    if (
      redirect?.startsWith('/cursos') ||
      redirect?.startsWith('/admin') ||
      redirect === '/perfil'
    ) {
      return redirect;
    }

    return this.authState.hasRole('ADMIN') ? '/admin/dashboard' : '/';
  }
}
