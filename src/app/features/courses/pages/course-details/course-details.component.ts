import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { catchError, map, of, switchMap } from 'rxjs';
import { toSignal } from '@angular/core/rxjs-interop';

import { toApiError } from '../../../../core/models/api-error.model';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { LoadingSpinnerComponent } from '../../../../shared/components/loading-spinner/loading-spinner.component';
import { HeroMarkerDirective } from '../../../../shared/directives/hero-marker.directive';
import { RevealDirective } from '../../../../shared/directives/reveal.directive';
import { DurationPipe } from '../../../../shared/pipes/duration.pipe';
import {
  Chapter,
  CourseDetail,
  getCourseCategoryLabel,
  getCourseLevelLabel,
} from '../../models/course.model';
import { CourseService } from '../../services/course.service';
import { AuthStateService } from '../../../../core/auth/auth-state.service';
import { LearningService } from '../../../learning/services/learning.service';

interface CourseDetailsState {
  course: CourseDetail | null;
  loading: boolean;
  errorMessage: string;
}

@Component({
  selector: 'app-course-details',
  standalone: true,
  imports: [
    RouterLink,
    DurationPipe,
    EmptyStateComponent,
    LoadingSpinnerComponent,
    HeroMarkerDirective,
    RevealDirective,
  ],
  templateUrl: './course-details.component.html',
  styleUrl: './course-details.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CourseDetailsComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly courseService = inject(CourseService);
  private readonly authState = inject(AuthStateService);
  private readonly learningService = inject(LearningService);
  private readonly completedChapterIds = signal<Set<string>>(new Set());

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

  protected readonly completedChapterCount = computed(() =>
    this.chapters().filter((chapter) => this.completedChapterIds().has(chapter.id)).length,
  );

  protected readonly completionPercentage = computed(() => {
    const chapterCount = this.chapters().length;
    return chapterCount > 0
      ? Math.round((this.completedChapterCount() / chapterCount) * 100)
      : 0;
  });

  protected readonly nextChapter = computed(() => {
    const chapters = this.chapters();
    return (
      chapters.find((chapter) => !this.completedChapterIds().has(chapter.id)) ??
      chapters[0] ??
      null
    );
  });

  protected readonly learningOutcomes = computed(() => {
    const course = this.course();
    return course?.outcomes?.length ? course.outcomes : (course?.objectives ?? []);
  });

  protected readonly categoryLabel = computed(() =>
    getCourseCategoryLabel(this.state().course?.category),
  );

  protected readonly levelLabel = computed(() => {
    const level = this.state().course?.level;
    return level ? getCourseLevelLabel(level) : '';
  });

  protected readonly isAuthenticated = this.authState.isAuthenticated;

  constructor() {
    effect((onCleanup) => {
      const course = this.course();
      if (!course || !this.authState.isAuthenticated()) {
        this.completedChapterIds.set(new Set());
        return;
      }

      const subscription = this.learningService.courseProgress(course.id).subscribe({
        next: (progress) =>
          this.completedChapterIds.set(
            new Set(
              progress
                .filter((item) => item.status === 'completed')
                .map((item) => item.chapterId),
            ),
          ),
        error: () => this.completedChapterIds.set(new Set()),
      });

      onCleanup(() => subscription.unsubscribe());
    });
  }

  protected isCompleted(chapter: Chapter): boolean {
    return this.completedChapterIds().has(chapter.id);
  }

  protected chapterDuration(chapter: Chapter): number {
    return chapter.lessons.reduce(
      (total, lesson) => total + (lesson.durationMinutes ?? 0),
      0,
    );
  }

  protected trackChapter(_index: number, chapter: Chapter): string {
    return chapter.id;
  }
}
