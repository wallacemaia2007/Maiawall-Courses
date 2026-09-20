import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { AuthService } from '../../../../core/auth/auth.service';
import { apiErrorMessage } from '../../../../core/models/api-error.model';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    remember: [false],
  });

  protected showPassword = false;
  protected readonly submitError = signal<string | null>(null);

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

  protected loginWithProvider(provider: 'google' | 'github'): void {
    window.location.href = this.authService.socialLoginUrl(provider);
  }

  protected get email() {
    return this.form.controls.email;
  }

  protected get password() {
    return this.form.controls.password;
  }

  private redirectUrl(): string {
    const redirect = this.route.snapshot.queryParamMap.get('redirect');

    if (redirect?.startsWith('/cursos') || redirect === '/perfil') {
      return redirect;
    }

    return '/';
  }
}
