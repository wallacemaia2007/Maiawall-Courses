import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, forkJoin, map, of, startWith, Subject, switchMap } from 'rxjs';

import { Chapter, CourseDetail, getCourseLevelLabel } from '../../../courses/models/course.model';
import { CourseService } from '../../../courses/services/course.service';
import { apiErrorMessage } from '../../../../core/models/api-error.model';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { LoadingSpinnerComponent } from '../../../../shared/components/loading-spinner/loading-spinner.component';
import { ProgressBarComponent } from '../../../../shared/ui/progress-bar/progress-bar.component';
import { CourseProgress } from '../../models/progress.model';
import { ProgressService } from '../../services/progress.service';

type ChapterListItemStatus = 'completed' | 'current' | 'locked' | 'available';

interface ChapterListItem {
  chapter: Chapter;
  status: ChapterListItemStatus;
  lessonCount: number;
}

interface StudentCourseDetailState {
  loading: boolean;
  errorMessage: string;
  course: CourseDetail | null;
  progress: CourseProgress | null;
}

@Component({
  selector: 'app-student-course-detail',
  standalone: true,
  imports: [RouterLink, EmptyStateComponent, LoadingSpinnerComponent, ProgressBarComponent],
  templateUrl: './student-course-detail.component.html',
  styleUrl: './student-course-detail.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudentCourseDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly courseService = inject(CourseService);
  private readonly progressService = inject(ProgressService);

  private readonly reload$ = new Subject<void>();

  protected readonly state = toSignal(
    this.reload$.pipe(
      startWith(null),
      switchMap(() =>
        this.route.paramMap.pipe(
          switchMap((params) => {
            const courseId = params.get('id') ?? '';

            return forkJoin({
              course: this.courseService.getById(courseId),
              progress: this.progressService.getCourseProgress(courseId),
            }).pipe(
              map(({ course, progress }) => ({
                loading: false,
                errorMessage: '',
                course,
                progress,
              })),
              catchError((error: unknown) =>
                of({
                  loading: false,
                  errorMessage: apiErrorMessage(
                    error,
                    'Não foi possível carregar o curso. Tente novamente.',
                  ),
                  course: null,
                  progress: null,
                }),
              ),
            );
          }),
        ),
      ),
    ),
    {
      initialValue: {
        loading: true,
        errorMessage: '',
        course: null,
        progress: null,
      } satisfies StudentCourseDetailState,
    },
  );

  protected readonly course = computed(() => this.state().course);

  protected readonly progress = computed(() => this.state().progress);

  protected readonly sortedChapters = computed(() =>
    [...(this.state().course?.chapters ?? [])].sort((a, b) => a.order - b.order),
  );

  protected readonly completedChapters = computed(
    () => this.state().progress?.completedChapters ?? 0,
  );

  protected readonly percent = computed(() => this.state().progress?.percent ?? 0);

  protected readonly isCompleted = computed(
    () => this.state().progress?.status === 'completed' || this.percent() >= 100,
  );

  protected readonly totalLessons = computed(() =>
    this.sortedChapters().reduce((sum, chapter) => sum + (chapter.lessons?.length ?? 0), 0),
  );

  protected readonly chapterItems = computed<ChapterListItem[]>(() =>
    this.sortedChapters().map((chapter, index) => ({
      chapter,
      status: this.chapterStatus(index, chapter.isPublic),
      lessonCount: chapter.lessons?.length ?? 0,
    })),
  );

  protected readonly nextStep = computed(() =>
    this.chapterItems().find((item) => item.status === 'current' || item.status === 'available'),
  );

  protected readonly levelLabel = computed(() => {
    const level = this.state().course?.level;
    return level ? getCourseLevelLabel(level) : '';
  });

  protected retry(): void {
    this.reload$.next();
  }

  protected trackChapter(_index: number, item: ChapterListItem): string {
    return item.chapter.id;
  }

  private chapterStatus(index: number, isPublic: boolean | undefined): ChapterListItemStatus {
    if (isPublic) {
      return 'available';
    }

    const completed = this.completedChapters();

    if (index < completed) {
      return 'completed';
    }

    if (index === completed) {
      return 'current';
    }

    return 'locked';
  }
}