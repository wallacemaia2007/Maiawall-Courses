import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../../../../core/auth/auth.service';
import { apiErrorMessage } from '../../../../core/models/api-error.model';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './signup.component.html',
  styleUrl: './signup.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SignupComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly form = this.fb.nonNullable.group(
    {
      name: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      passwordConfirm: ['', [Validators.required]],
      terms: [false, [Validators.requiredTrue]],
    },
    { validators: this.passwordsMatchValidator },
  );

  protected showPassword = false;
  protected showPasswordConfirm = false;
  protected readonly submitError = signal<string | null>(null);

  protected onSubmit(): void {
    this.submitError.set(null);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { name, email, password } = this.form.getRawValue();

    this.authService.signup({ name, email, password }).subscribe({
      next: () => this.router.navigateByUrl('/'),
      error: (error: unknown) => {
        this.submitError.set(
          apiErrorMessage(error, 'Nao foi possivel criar a conta. Tente novamente.'),
        );
      },
    });
  }

  protected togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  protected togglePasswordConfirm(): void {
    this.showPasswordConfirm = !this.showPasswordConfirm;
  }

  protected loginWithProvider(provider: 'google' | 'github'): void {
    window.location.href = this.authService.socialLoginUrl(provider);
  }

  protected get name() {
    return this.form.controls.name;
  }

  protected get email() {
    return this.form.controls.email;
  }

  protected get password() {
    return this.form.controls.password;
  }

  protected get passwordConfirm() {
    return this.form.controls.passwordConfirm;
  }

  protected get terms() {
    return this.form.controls.terms;
  }

  private passwordsMatchValidator(control: AbstractControl): ValidationErrors | null {
    const password = control.get('password')?.value;
    const passwordConfirm = control.get('passwordConfirm')?.value;

    return password && passwordConfirm && password !== passwordConfirm
      ? { passwordMismatch: true }
      : null;
  }
}
