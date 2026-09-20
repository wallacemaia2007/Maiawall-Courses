import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { catchError, map, of, startWith, Subject, switchMap } from 'rxjs';
import { toSignal } from '@angular/core/rxjs-interop';

import { AuthStateService } from '../../../../core/auth/auth-state.service';
import { AuthService } from '../../../../core/auth/auth.service';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { LoadingSpinnerComponent } from '../../../../shared/components/loading-spinner/loading-spinner.component';
import { LearningOverview, LearningService } from '../../../learning/services/learning.service';

@Component({ selector: 'app-profile', standalone: true, imports: [RouterLink, EmptyStateComponent, LoadingSpinnerComponent], templateUrl: './profile.component.html', styleUrl: './profile.component.scss', changeDetection: ChangeDetectionStrategy.OnPush })
export class ProfileComponent {
  private readonly authState = inject(AuthStateService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly learningService = inject(LearningService);
  private readonly reload$ = new Subject<void>();
  protected readonly user = this.authState.user;
  protected readonly overview = toSignal(this.reload$.pipe(startWith(undefined), switchMap(() => this.learningService.overview().pipe(map((data) => ({ loading: false, error: '', data })), catchError(() => of({ loading: false, error: 'Nao foi possivel carregar seu historico agora.', data: null }))))), { initialValue: { loading: true, error: '', data: null as LearningOverview | null } });
  protected retry(): void { this.reload$.next(); }
  protected logout(): void {
    this.authService.logout().subscribe({
      next: () => this.router.navigateByUrl('/'),
      error: () => {
        this.authState.clearSession();
        void this.router.navigateByUrl('/');
      },
    });
  }
}
