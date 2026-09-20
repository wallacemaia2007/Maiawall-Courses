import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, forkJoin, map, of, startWith, Subject, switchMap } from 'rxjs';

import { apiErrorMessage } from '../../../../core/models/api-error.model';
import { UserService } from '../../../../core/services/user.service';
import { Certificate } from '../../../certificates/models/certificate.model';
import { CertificateService } from '../../../certificates/services/certificate.service';
import { Exercise } from '../../../exercises/models/exercise.model';
import { ExerciseService } from '../../../exercises/services/exercise.service';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { LoadingSpinnerComponent } from '../../../../shared/components/loading-spinner/loading-spinner.component';
import { ProgressBarComponent } from '../../../../shared/ui/progress-bar/progress-bar.component';
import {
  CourseProgress,
  ExerciseProgress,
  ExerciseProgressStatus,
  StudentCourseOverview,
} from '../../models/progress.model';
import { EnrollmentService } from '../../services/enrollment.service';
import { ProgressService } from '../../services/progress.service';

interface StudentDashboardState {
  loading: boolean;
  errorMessage: string;
  overview: StudentCourseOverview[];
  progress: CourseProgress[];
  exerciseProgress: ExerciseProgress[];
  exercises: Exercise[];
  certificates: Certificate[];
}

interface PendingExerciseItem {
  id: string;
  title: string;
}

const EXERCISE_STATUS_LABELS: Record<ExerciseProgressStatus, string> = {
  'not-answered': 'Pendente',
  submitted: 'Aguardando correção',
  graded: 'Corrigido',
};

@Component({
  selector: 'app-student-dashboard',
  standalone: true,
  imports: [DatePipe, RouterLink, EmptyStateComponent, LoadingSpinnerComponent, ProgressBarComponent],
  templateUrl: './student-dashboard.component.html',
  styleUrl: './student-dashboard.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudentDashboardComponent {
  private readonly enrollmentService = inject(EnrollmentService);
  private readonly progressService = inject(ProgressService);
  private readonly exerciseService = inject(ExerciseService);
  private readonly certificateService = inject(CertificateService);
  private readonly userService = inject(UserService);

  private readonly reload$ = new Subject<void>();

  protected readonly currentUser = this.userService.currentUser;

  protected readonly state = toSignal(
    this.reload$.pipe(
      startWith(null),
      switchMap(() =>
        forkJoin({
          overview: this.enrollmentService.listMyCourses(),
          progress: this.progressService.listMyCoursesProgress().pipe(catchError(() => of([]))),
          exerciseProgress: this.progressService
            .listExerciseProgress()
            .pipe(catchError(() => of([]))),
          exercises: this.exerciseService.listMine().pipe(catchError(() => of([]))),
          certificates: this.certificateService.listMine().pipe(catchError(() => of([]))),
        }).pipe(
          map(({ overview, progress, exerciseProgress, exercises, certificates }) => ({
            loading: false,
            errorMessage: '',
            overview,
            progress,
            exerciseProgress,
            exercises,
            certificates,
          })),
          catchError((error: unknown) =>
            of({
              loading: false,
              errorMessage: apiErrorMessage(
                error,
                'Não foi possível carregar seu painel. Tente novamente.',
              ),
              overview: [],
              progress: [],
              exerciseProgress: [],
              exercises: [],
              certificates: [],
            }),
          ),
        ),
      ),
    ),
    {
      initialValue: {
        loading: true,
        errorMessage: '',
        overview: [],
        progress: [],
        exerciseProgress: [],
        exercises: [],
        certificates: [],
      } satisfies StudentDashboardState,
    },
  );

  protected readonly firstName = computed(() => this.currentUser()?.name?.split(' ')[0] ?? '');

  protected readonly inProgressCourses = computed(() =>
    this.state()
      .overview.filter(
        (item) =>
          item.progress.status === 'in-progress' ||
          (item.progress.percent > 0 && item.progress.percent < 100),
      )
      .sort((a, b) => b.progress.percent - a.progress.percent),
  );

  protected readonly completedCourses = computed(() =>
    this.state().progress.filter((progress) => progress.status === 'completed').length,
  );

  protected readonly activeCourseCount = computed(() => this.inProgressCourses().length);

  protected readonly totalProgress = computed(() => {
    const progress = this.state().progress;
    if (progress.length === 0) {
      return 0;
    }
    const average = progress.reduce((sum, item) => sum + item.percent, 0) / progress.length;
    return Math.round(average);
  });

  protected readonly pendingExercises = computed<PendingExerciseItem[]>(() => {
    const titleById = new Map(this.state().exercises.map((exercise) => [exercise.id, exercise.title]));

    return this.state()
      .exerciseProgress.filter((item) => item.status === 'not-answered')
      .map((item) => ({
        id: item.exerciseId,
        title: titleById.get(item.exerciseId) ?? `Exercício ${item.exerciseId}`,
      }));
  });

  protected readonly gradedExercises = computed<PendingExerciseItem[]>(() => {
    const titleById = new Map(this.state().exercises.map((exercise) => [exercise.id, exercise.title]));

    return this.state()
      .exerciseProgress.filter((item) => item.status === 'graded' || item.status === 'submitted')
      .map((item) => ({
        id: item.exerciseId,
        title: titleById.get(item.exerciseId) ?? `Exercício ${item.exerciseId}`,
      }));
  });

  protected readonly recentCourses = computed(() =>
    [...this.state().overview]
      .sort((a, b) => {
        const aTime = a.progress.updatedAt ? Date.parse(a.progress.updatedAt) : 0;
        const bTime = b.progress.updatedAt ? Date.parse(b.progress.updatedAt) : 0;
        return bTime - aTime;
      })
      .slice(0, 4),
  );

  protected readonly recentCertificates = computed(() =>
    [...this.state().certificates]
      .sort((a, b) => Date.parse(b.issuedAt ?? '') - Date.parse(a.issuedAt ?? ''))
      .slice(0, 3),
  );

  protected getExerciseStatusLabel(status: ExerciseProgressStatus): string {
    return EXERCISE_STATUS_LABELS[status] ?? status;
  }

  protected retry(): void {
    this.reload$.next();
  }

  protected trackCourse(_index: number, item: StudentCourseOverview): string {
    return item.course.id;
  }
}