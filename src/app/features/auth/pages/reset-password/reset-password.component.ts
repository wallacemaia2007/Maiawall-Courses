import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { AuthService } from '../../../../core/auth/auth.service';
import { apiErrorMessage } from '../../../../core/models/api-error.model';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './reset-password.component.html',
  styleUrl: './reset-password.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResetPasswordComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);

  protected readonly form = this.fb.nonNullable.group({
    token: ['', Validators.required],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  protected completed = false;
  protected showPassword = false;
  protected readonly submitError = signal<string | null>(null);

  protected onSubmit(): void {
    this.submitError.set(null);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { token, password } = this.form.getRawValue();

    this.authService.resetPassword({ token, password }).subscribe({
      next: () => {
        this.completed = true;
      },
      error: (error: unknown) => {
        this.submitError.set(
          apiErrorMessage(error, 'Nao foi possivel redefinir a senha.'),
        );
      },
    });
  }

  protected togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  protected get token() {
    return this.form.controls.token;
  }

  protected get password() {
    return this.form.controls.password;
  }
}
