import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, forkJoin, map, of, startWith, Subject, switchMap } from 'rxjs';

import { apiErrorMessage } from '../../../../core/models/api-error.model';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { LoadingSpinnerComponent } from '../../../../shared/components/loading-spinner/loading-spinner.component';
import {
  Exercise,
  getExerciseTypeLabel,
  SUBMISSION_STATUS_LABELS,
} from '../../models/exercise.model';
import { ExerciseService } from '../../services/exercise.service';
import {
  ExerciseProgress,
  ExerciseProgressStatus,
} from '../../../student/models/progress.model';
import { ProgressService } from '../../../student/services/progress.service';

interface ExerciseListItem {
  exercise: Exercise;
  status: ExerciseProgressStatus;
  score?: number;
}

interface ExerciseListState {
  loading: boolean;
  errorMessage: string;
  exercises: Exercise[];
  progress: ExerciseProgress[];
}

@Component({
  selector: 'app-exercise-list',
  standalone: true,
  imports: [RouterLink, EmptyStateComponent, LoadingSpinnerComponent],
  templateUrl: './exercise-list.component.html',
  styleUrl: './exercise-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExerciseListComponent {
  private readonly exerciseService = inject(ExerciseService);
  private readonly progressService = inject(ProgressService);

  private readonly reload$ = new Subject<void>();

  protected readonly state = toSignal(
    this.reload$.pipe(
      startWith(null),
      switchMap(() =>
        forkJoin({
          exercises: this.exerciseService.listMine(),
          progress: this.progressService.listExerciseProgress().pipe(catchError(() => of([]))),
        }).pipe(
          map(({ exercises, progress }) => ({
            loading: false,
            errorMessage: '',
            exercises,
            progress,
          })),
          catchError((error: unknown) =>
            of({
              loading: false,
              errorMessage: apiErrorMessage(
                error,
                'Não foi possível carregar os exercícios. Tente novamente.',
              ),
              exercises: [],
              progress: [],
            }),
          ),
        ),
      ),
    ),
    {
      initialValue: {
        loading: true,
        errorMessage: '',
        exercises: [],
        progress: [],
      } satisfies ExerciseListState,
    },
  );

  protected readonly items = computed<ExerciseListItem[]>(() => {
    const progressByExercise = new Map(
      this.state().progress.map((item) => [item.exerciseId, item]),
    );

    return [...this.state().exercises]
      .sort((a, b) => a.order - b.order)
      .map((exercise) => {
        const progress = progressByExercise.get(exercise.id);
        return {
          exercise,
          status: progress?.status ?? 'not-answered',
          score: progress?.score,
        };
      });
  });

  protected readonly pending = computed(() =>
    this.items().filter((item) => item.status === 'not-answered'),
  );

  protected readonly awaitingReview = computed(() =>
    this.items().filter((item) => item.status === 'submitted'),
  );

  protected readonly graded = computed(() =>
    this.items().filter((item) => item.status === 'graded'),
  );

  protected getTypeLabel(type: Exercise['type']): string {
    return getExerciseTypeLabel(type);
  }

  protected getStatusLabel(status: ExerciseProgressStatus): string {
    return SUBMISSION_STATUS_LABELS[status as keyof typeof SUBMISSION_STATUS_LABELS] ?? status;
  }

  protected retry(): void {
    this.reload$.next();
  }

  protected trackExercise(_index: number, item: ExerciseListItem): string {
    return item.exercise.id;
  }
}