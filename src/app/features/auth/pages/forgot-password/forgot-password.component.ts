import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { AuthService } from '../../../../core/auth/auth.service';
import { apiErrorMessage } from '../../../../core/models/api-error.model';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './forgot-password.component.html',
  styleUrl: './forgot-password.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ForgotPasswordComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);

  protected readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });

  protected emailSent = false;
  protected readonly submitError = signal<string | null>(null);

  protected onSubmit(): void {
    this.submitError.set(null);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.authService.requestPasswordRecovery(this.form.getRawValue().email).subscribe({
      next: () => {
        this.emailSent = true;
      },
      error: (error: unknown) => {
        this.submitError.set(
          apiErrorMessage(error, 'Nao foi possivel solicitar a recuperacao.'),
        );
      },
    });
  }

  protected get email() {
    return this.form.controls.email;
  }
}
