import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { AuthService } from '../../../../core/auth/auth.service';

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

  protected onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { token, password } = this.form.getRawValue();

    this.authService.resetPassword({ token, password }).subscribe({
      next: () => {
        this.completed = true;
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
