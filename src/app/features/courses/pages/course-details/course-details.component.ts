import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { catchError, map, of, switchMap } from 'rxjs';
import { toSignal } from '@angular/core/rxjs-interop';

import { toApiError } from '../../../../core/models/api-error.model';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { LoadingSpinnerComponent } from '../../../../shared/components/loading-spinner/loading-spinner.component';
import { DurationPipe } from '../../../../shared/pipes/duration.pipe';
import {
  Chapter,
  CourseDetail,
  getCourseCategoryLabel,
  getCourseLevelLabel,
} from '../../models/course.model';
import { CourseService } from '../../services/course.service';

interface CourseDetailsState {
  course: CourseDetail | null;
  loading: boolean;
  errorMessage: string;
}

@Component({
  selector: 'app-course-details',
  standalone: true,
  imports: [RouterLink, DurationPipe, EmptyStateComponent, LoadingSpinnerComponent],
  templateUrl: './course-details.component.html',
  styleUrl: './course-details.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CourseDetailsComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly courseService = inject(CourseService);

  protected readonly state = toSignal(
    this.route.paramMap.pipe(
      switchMap((params) =>
        this.courseService.getBySlug(params.get('slug') ?? '').pipe(
          map((course) => ({
            course,
            loading: false,
            errorMessage: '',
          })),
          catchError((error: unknown) =>
            of({
              course: null,
              loading: false,
              errorMessage: toApiError(error).message,
            }),
          ),
        ),
      ),
    ),
    {
      initialValue: {
        course: null,
        loading: true,
        errorMessage: '',
      } satisfies CourseDetailsState,
    },
  );

  protected readonly course = computed(() => this.state().course);

  protected readonly chapters = computed(() =>
    [...(this.state().course?.chapters ?? [])].sort((a, b) => a.order - b.order),
  );

  protected readonly lessonCount = computed(() =>
    this.chapters().reduce((total, chapter) => total + (chapter.lessons?.length ?? 0), 0),
  );

  protected readonly categoryLabel = computed(() =>
    getCourseCategoryLabel(this.state().course?.category),
  );

  protected readonly levelLabel = computed(() => {
    const level = this.state().course?.level;
    return level ? getCourseLevelLabel(level) : '';
  });

  protected readonly isFree = computed(() => {
    const course = this.state().course;
    return course?.isFree === true || course?.priceCents === 0;
  });

  protected trackChapter(_index: number, chapter: Chapter): string {
    return chapter.id;
  }
}
