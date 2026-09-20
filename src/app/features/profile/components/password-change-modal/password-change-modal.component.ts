import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';

import { UserService } from '../../../../core/services/user.service';
import { apiErrorMessage } from '../../../../core/models/api-error.model';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';

@Component({
  selector: 'app-password-change-modal',
  standalone: true,
  imports: [ModalComponent, ReactiveFormsModule],
  templateUrl: './password-change-modal.component.html',
  styleUrl: './password-change-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PasswordChangeModalComponent {
  readonly isOpen = input(true);

  readonly closed = output<void>();
  readonly saved = output<void>();

  private readonly fb = inject(FormBuilder);
  private readonly userService = inject(UserService);

  readonly submitting = signal(false);
  readonly submitError = signal<string | null>(null);

  protected readonly form = this.fb.nonNullable.group(
    {
      currentPassword: ['', [Validators.required, Validators.minLength(6)]],
      newPassword: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required]],
    },
    { validators: [this.mustMatch, this.cannotRepeat] },
  );

  protected onSubmit(event: Event): void {
    event.preventDefault();
    this.submitError.set(null);

    if (this.submitting()) {
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { currentPassword, newPassword } = this.form.getRawValue();

    this.submitting.set(true);
    this.userService.changePassword(currentPassword, newPassword).subscribe({
      next: () => {
        this.submitting.set(false);
        this.saved.emit();
      },
      error: (error: unknown) => {
        this.submitting.set(false);
        this.submitError.set(
          apiErrorMessage(error, 'Não foi possível alterar a senha. Verifique a senha atual.'),
        );
      },
    });
  }

  protected close(): void {
    if (!this.submitting()) {
      this.closed.emit();
    }
  }

  protected get currentPassword() {
    return this.form.controls.currentPassword;
  }

  protected get newPassword() {
    return this.form.controls.newPassword;
  }

  protected get confirmPassword() {
    return this.form.controls.confirmPassword;
  }

  private mustMatch(control: AbstractControl): ValidationErrors | null {
    const group = control as { get: (key: string) => AbstractControl | null };
    const newPassword = group.get('newPassword')?.value as string | undefined;
    const confirmPassword = group.get('confirmPassword')?.value as string | undefined;

    if (newPassword !== undefined && confirmPassword !== undefined && newPassword !== confirmPassword) {
      return { mustMatch: true };
    }

    return null;
  }

  private cannotRepeat(control: AbstractControl): ValidationErrors | null {
    const group = control as { get: (key: string) => AbstractControl | null };
    const currentPassword = group.get('currentPassword')?.value as string | undefined;
    const newPassword = group.get('newPassword')?.value as string | undefined;

    if (
      currentPassword &&
      newPassword &&
      currentPassword === newPassword
    ) {
      return { cannotRepeat: true };
    }

    return null;
  }
}