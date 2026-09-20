import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, forkJoin, map, of, startWith, Subject, switchMap } from 'rxjs';

import { apiErrorMessage } from '../../../../core/models/api-error.model';
import { NotificationService } from '../../../../core/services/notification.service';
import { CourseSummary } from '../../../courses/models/course.model';
import { CourseService } from '../../../courses/services/course.service';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { LoadingSpinnerComponent } from '../../../../shared/components/loading-spinner/loading-spinner.component';
import { ProgressBarComponent } from '../../../../shared/ui/progress-bar/progress-bar.component';
import { StudentCourseOverview } from '../../models/progress.model';
import { EnrollmentService } from '../../services/enrollment.service';

interface StudentCoursesState {
  loading: boolean;
  errorMessage: string;
  enrolled: StudentCourseOverview[];
  available: CourseSummary[];
}

@Component({
  selector: 'app-student-courses',
  standalone: true,
  imports: [RouterLink, EmptyStateComponent, LoadingSpinnerComponent, ProgressBarComponent],
  templateUrl: './student-courses.component.html',
  styleUrl: './student-courses.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudentCoursesComponent {
  private readonly enrollmentService = inject(EnrollmentService);
  private readonly courseService = inject(CourseService);
  private readonly notificationService = inject(NotificationService);

  private readonly reload$ = new Subject<void>();

  protected readonly enrollingIds = signal<string[]>([]);
  protected readonly droppingIds = signal<string[]>([]);

  protected readonly state = toSignal(
    this.reload$.pipe(
      startWith(null),
      switchMap(() =>
        forkJoin({
          enrolled: this.enrollmentService.listMyCourses(),
          available: this.courseService.list({ page: 0, size: 100 }).pipe(
            map((page) => page.content),
            catchError(() => of([])),
          ),
        }).pipe(
          map(({ enrolled, available }) => {
            const enrolledIds = new Set(enrolled.map((item) => item.course.id));

            return {
              loading: false,
              errorMessage: '',
              enrolled,
              available: available.filter((course) => !enrolledIds.has(course.id)),
            };
          }),
          catchError((error: unknown) =>
            of({
              loading: false,
              errorMessage: apiErrorMessage(
                error,
                'Não foi possível carregar seus cursos. Tente novamente.',
              ),
              enrolled: [],
              available: [],
            }),
          ),
        ),
      ),
    ),
    {
      initialValue: {
        loading: true,
        errorMessage: '',
        enrolled: [],
        available: [],
      } satisfies StudentCoursesState,
    },
  );

  protected readonly isEnrolling = (courseId: string): boolean =>
    this.enrollingIds().includes(courseId);

  protected readonly isDropping = (courseId: string): boolean =>
    this.droppingIds().includes(courseId);

  protected enroll(courseId: string): void {
    if (this.isEnrolling(courseId)) {
      return;
    }

    this.enrollingIds.update((ids) => [...ids, courseId]);

    this.enrollmentService.enroll(courseId).subscribe({
      next: () => {
        this.notificationService.success(
          'Matrícula realizada',
          'Você agora tem acesso ao conteúdo do curso.',
        );
        this.enrollingIds.update((ids) => ids.filter((id) => id !== courseId));
        this.reload$.next();
      },
      error: (error: unknown) => {
        this.enrollingIds.update((ids) => ids.filter((id) => id !== courseId));
        this.notificationService.error(
          'Não foi possível matricular',
          apiErrorMessage(error, 'Tente novamente em instantes.'),
        );
      },
    });
  }

  protected drop(courseId: string): void {
    if (this.isDropping(courseId)) {
      return;
    }

    this.droppingIds.update((ids) => [...ids, courseId]);

    this.enrollmentService.drop(courseId).subscribe({
      next: () => {
        this.notificationService.info('Matrícula cancelada', 'Você saiu deste curso.');
        this.droppingIds.update((ids) => ids.filter((id) => id !== courseId));
        this.reload$.next();
      },
      error: (error: unknown) => {
        this.droppingIds.update((ids) => ids.filter((id) => id !== courseId));
        this.notificationService.error(
          'Não foi possível cancelar',
          apiErrorMessage(error, 'Tente novamente em instantes.'),
        );
      },
    });
  }

  protected retry(): void {
    this.reload$.next();
  }

  protected trackCourse(_index: number, item: StudentCourseOverview): string {
    return item.course.id;
  }

  protected trackAvailable(_index: number, course: CourseSummary): string {
    return course.id;
  }
}