import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, map, of, startWith, Subject, switchMap, tap } from 'rxjs';

import { apiErrorMessage } from '../../../../core/models/api-error.model';
import { NotificationService } from '../../../../core/services/notification.service';
import { UserService } from '../../../../core/services/user.service';
import { User } from '../../../../core/models/user.model';
import { LoadingSpinnerComponent } from '../../../../shared/components/loading-spinner/loading-spinner.component';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { formatDate } from '../../../../shared/utils/date.utils';
import { PasswordChangeModalComponent } from '../../components/password-change-modal/password-change-modal.component';

const ROLE_LABELS: Record<string, string> = {
  STUDENT: 'Aluno',
  INSTRUCTOR: 'Instrutor',
  ADMIN: 'Administrador',
};

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    LoadingSpinnerComponent,
    EmptyStateComponent,
    PasswordChangeModalComponent,
  ],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileComponent {
  private readonly fb = inject(FormBuilder);
  private readonly userService = inject(UserService);
  private readonly notificationService = inject(NotificationService);

  private readonly reload$ = new Subject<void>();

  protected readonly saving = signal(false);
  protected readonly passwordModalOpen = signal(false);

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    avatarUrl: [''],
  });

  private readonly formPrefilledFor = signal<string | null>(null);

  protected readonly user = toSignal(
    this.reload$.pipe(
      startWith(null),
      switchMap(() =>
        this.userService.getCurrentUser().pipe(
          tap((loaded) => this.prefill(loaded)),
          map((loaded) => ({ loading: false, errorMessage: '', user: loaded })),
          catchError((error: unknown) =>
            of({
              loading: false,
              errorMessage: apiErrorMessage(
                error,
                'Não foi possível carregar o perfil. Tente novamente.',
              ),
              user: null,
            }),
          ),
        ),
      ),
    ),
    {
      initialValue: { loading: true, errorMessage: '', user: null },
    },
  );

  protected readonly roleLabel = computed(() => {
    const role = this.user()?.user?.role;
    return role ? (ROLE_LABELS[role] ?? role) : '';
  });

  protected readonly memberSince = computed(() => formatDate(this.user()?.user?.createdAt));

  protected onSubmit(event: Event): void {
    event.preventDefault();

    if (this.saving()) {
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { name, email, avatarUrl } = this.form.getRawValue();

    this.saving.set(true);
    this.userService
      .updateCurrentUser({
        name,
        email,
        avatarUrl: avatarUrl || undefined,
      })
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.form.markAsPristine();
          this.notificationService.success('Perfil atualizado');
        },
        error: (error: unknown) => {
          this.saving.set(false);
          this.notificationService.error(
            'Não foi possível atualizar o perfil',
            apiErrorMessage(error, 'Tente novamente em instantes.'),
          );
        },
      });
  }

  protected openPasswordModal(): void {
    this.passwordModalOpen.set(true);
  }

  protected closePasswordModal(): void {
    this.passwordModalOpen.set(false);
  }

  protected onPasswordSaved(): void {
    this.passwordModalOpen.set(false);
    this.notificationService.success('Senha alterada com sucesso');
  }

  protected retry(): void {
    this.reload$.next();
  }

  protected get name() {
    return this.form.controls.name;
  }

  protected get email() {
    return this.form.controls.email;
  }

  protected get avatarUrl() {
    return this.form.controls.avatarUrl;
  }

  private prefill(user: User): void {
    if (this.formPrefilledFor() === user.id) {
      return;
    }

    this.formPrefilledFor.set(user.id);
    this.form.patchValue({
      name: user.name,
      email: user.email,
      avatarUrl: user.avatarUrl ?? '',
    });
  }
}