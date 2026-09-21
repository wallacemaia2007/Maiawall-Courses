import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { catchError, map, of, startWith, Subject, switchMap } from 'rxjs';
import { toSignal } from '@angular/core/rxjs-interop';

import { AuthStateService } from '../../../../core/auth/auth-state.service';
import { AuthService } from '../../../../core/auth/auth.service';
import { apiErrorMessage } from '../../../../core/models/api-error.model';
import { NotificationService } from '../../../../core/services/notification.service';
import { UserService } from '../../../../core/services/user.service';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { LoadingSpinnerComponent } from '../../../../shared/components/loading-spinner/loading-spinner.component';
import { PasswordChangeModalComponent } from '../../components/password-change-modal/password-change-modal.component';
import {
  LearningOverview,
  LearningService,
  StartedCourse,
} from '../../../learning/services/learning.service';
import {
  CourseCategory,
  CourseLevel,
  getCourseCategoryLabel,
  getCourseLevelLabel,
} from '../../../courses/models/course.model';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    RouterLink,
    ReactiveFormsModule,
    EmptyStateComponent,
    LoadingSpinnerComponent,
    PasswordChangeModalComponent,
  ],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileComponent {
  private readonly authState = inject(AuthStateService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly learningService = inject(LearningService);
  private readonly userService = inject(UserService);
  private readonly notifications = inject(NotificationService);
  private readonly fb = inject(FormBuilder);
  private readonly reload$ = new Subject<void>();

  protected readonly user = this.authState.user;
  protected readonly overview = toSignal(
    this.reload$.pipe(
      startWith(undefined),
      switchMap(() =>
        this.learningService.overview().pipe(
          map((data) => ({ loading: false, error: '', data })),
          catchError(() =>
            of({
              loading: false,
              error: 'Nao foi possivel carregar seu historico agora.',
              data: null,
            }),
          ),
        ),
      ),
    ),
    { initialValue: { loading: true, error: '', data: null as LearningOverview | null } },
  );

  protected readonly accountForm = this.fb.nonNullable.group({
    name: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
  });

  protected readonly passwordModalOpen = signal(false);
  protected readonly editingAccount = signal(false);
  protected readonly saving = signal(false);
  protected readonly saveError = signal<string | null>(null);
  protected readonly emailVerificationNotice = signal<string | null>(null);

  protected readonly roleLabel = computed(() => {
    const role = this.user()?.role;
    if (role === 'INSTRUCTOR') return 'Instrutor';
    if (role === 'ADMIN') return 'Admin';
    return null;
  });

  protected readonly courses = computed(() => this.overview().data?.startedCourses ?? []);
  protected readonly featuredCourse = computed(() => this.courses()[0] ?? null);
  protected readonly otherCourses = computed(() => this.courses().slice(1));
  protected readonly recentActivity = computed(
    () => this.overview().data?.recentCompletedChapters ?? [],
  );
  protected readonly learningStats = computed(() => {
    const courses = this.courses();
    const totalChapters = courses.reduce((total, item) => total + item.course.totalChapters, 0);
    const completedChapters = courses.reduce((total, item) => total + item.completedChapters, 0);
    const completedCourses = courses.filter(
      (item) =>
        item.course.totalChapters > 0 && item.completedChapters >= item.course.totalChapters,
    ).length;

    return {
      startedCourses: courses.length,
      completedChapters,
      completedCourses,
      overallProgress:
        totalChapters > 0
          ? Math.min(100, Math.round((completedChapters / totalChapters) * 100))
          : 0,
    };
  });

  protected readonly memberSince = computed(() => {
    const createdAt = this.user()?.createdAt;
    return createdAt ? this.formatDate(createdAt, { month: 'long', year: 'numeric' }) : null;
  });

  protected readonly accessMethod = computed(() => {
    const provider = this.user()?.provider;
    if (provider === 'google') return 'Google';
    if (provider === 'github') return 'GitHub';
    return 'E-mail e senha';
  });

  constructor() {
    effect(() => {
      const current = this.user();
      if (!current) return;
      if (this.accountForm.pristine) {
        this.accountForm.patchValue({
          name: current.name ?? '',
          email: current.email ?? '',
        });
      }
    });
  }

  protected get nameControl() {
    return this.accountForm.controls.name;
  }

  protected get emailControl() {
    return this.accountForm.controls.email;
  }

  protected retry(): void {
    this.reload$.next();
  }

  protected logout(): void {
    this.authService.logout().subscribe({
      next: () => this.router.navigateByUrl('/'),
      error: () => {
        this.authState.clearSession();
        void this.router.navigateByUrl('/');
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
    this.closePasswordModal();
    this.notifications.success(
      'Senha alterada',
      'Sua senha foi atualizada. Os outros dispositivos precisarão entrar novamente.',
    );
  }

  protected startEditingAccount(): void {
    const current = this.user();
    if (!current) return;
    this.accountForm.reset({ name: current.name ?? '', email: current.email ?? '' });
    this.saveError.set(null);
    this.editingAccount.set(true);
  }

  protected cancelEditingAccount(): void {
    const current = this.user();
    this.accountForm.reset({ name: current?.name ?? '', email: current?.email ?? '' });
    this.saveError.set(null);
    this.editingAccount.set(false);
  }

  protected saveProfile(): void {
    if (this.saving()) {
      return;
    }

    this.saveError.set(null);
    this.emailVerificationNotice.set(null);

    if (this.accountForm.invalid) {
      this.accountForm.markAllAsTouched();
      return;
    }

    const { name, email } = this.accountForm.getRawValue();
    const previousEmail = this.user()?.email?.toLowerCase();

    this.saving.set(true);
    this.userService
      .updateCurrentUser({ name: name.trim(), email: email.trim().toLowerCase() })
      .subscribe({
        next: (updated) => {
          this.saving.set(false);
          this.accountForm.reset({ name: updated.name ?? '', email: updated.email ?? '' });
          this.editingAccount.set(false);
          this.notifications.success('Dados atualizados', 'Seu perfil foi salvo com sucesso.');
          if (
            previousEmail &&
            updated.email &&
            updated.email.toLowerCase() !== previousEmail &&
            updated.emailVerified === false
          ) {
            this.emailVerificationNotice.set(
              'Confirme o novo e-mail para ativar seu endereço de acesso.',
            );
          }
        },
        error: (error: unknown) => {
          this.saving.set(false);
          this.saveError.set(apiErrorMessage(error, 'Nao foi possivel salvar seus dados.'));
        },
      });
  }

  protected progressOf(item: StartedCourse): number {
    return item.progressPercentage ?? 0;
  }

  protected courseImage(item: StartedCourse): string {
    return item.course.thumbnailUrl || item.course.bannerUrl || '/assets/banners/ufu.brand.png';
  }

  protected replaceBrokenImage(event: Event): void {
    const image = event.target as HTMLImageElement;
    if (!image.src.endsWith('/assets/banners/ufu.brand.png')) {
      image.src = '/assets/banners/ufu.brand.png';
    }
  }

  protected categoryLabel(category?: string): string {
    return getCourseCategoryLabel(category as CourseCategory | undefined) || 'Tecnologia';
  }

  protected levelLabel(level?: string): string {
    return level ? getCourseLevelLabel(level as CourseLevel) : '';
  }

  protected formatDate(
    value: string,
    options: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short' },
  ): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return new Intl.DateTimeFormat('pt-BR', options).format(date);
  }
}
