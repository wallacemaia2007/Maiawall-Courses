import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { AuthService } from '../../../../core/auth/auth.service';
import { apiErrorMessage } from '../../../../core/models/api-error.model';

@Component({
  selector: 'app-verify-email',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './verify-email.component.html',
  styleUrl: './verify-email.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VerifyEmailComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);

  protected readonly form = this.fb.nonNullable.group({
    token: ['', Validators.required],
  });

  protected completed = false;
  protected readonly submitError = signal<string | null>(null);

  protected onSubmit(): void {
    this.submitError.set(null);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.authService.verifyEmail({ token: this.form.getRawValue().token }).subscribe({
      next: () => {
        this.completed = true;
      },
      error: (error: unknown) => {
        this.submitError.set(
          apiErrorMessage(error, 'Nao foi possivel confirmar o e-mail.'),
        );
      },
    });
  }

  protected get token() {
    return this.form.controls.token;
  }
}
