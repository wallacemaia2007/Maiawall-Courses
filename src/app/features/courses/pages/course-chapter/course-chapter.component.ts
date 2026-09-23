import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { catchError, forkJoin, map, of, switchMap } from 'rxjs';
import { toSignal } from '@angular/core/rxjs-interop';

import { toApiError } from '../../../../core/models/api-error.model';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { LoadingSpinnerComponent } from '../../../../shared/components/loading-spinner/loading-spinner.component';
import { ArticleComponent } from '../../../../shared/ui/article/article.component';
import { Chapter, ChapterDetail, Lesson } from '../../models/course.model';
import { ChapterService } from '../../services/chapter.service';
import { CourseService } from '../../services/course.service';
import { AuthStateService } from '../../../../core/auth/auth-state.service';
import { LearningService } from '../../../learning/services/learning.service';

interface CourseChapterState {
  chapter: ChapterDetail | null;
  courseSlug: string;
  courseChapters: Chapter[];
  loading: boolean;
  errorMessage: string;
}

@Component({
  selector: 'app-course-chapter',
  standalone: true,
  imports: [RouterLink, EmptyStateComponent, LoadingSpinnerComponent, ArticleComponent],
  templateUrl: './course-chapter.component.html',
  styleUrl: './course-chapter.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CourseChapterComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly chapterService = inject(ChapterService);
  private readonly courseService = inject(CourseService);
  private readonly authState = inject(AuthStateService);
  private readonly learningService = inject(LearningService);
  protected readonly completionStatus = signal<'idle' | 'saving' | 'completed'>('idle');

  protected readonly state = toSignal(
    this.route.paramMap.pipe(
      switchMap((params) => {
        const courseSlug = params.get('slug') ?? '';
        const chapterSlug = params.get('chapterSlug') ?? '';

        return forkJoin({
          chapter: this.chapterService.getBySlug(courseSlug, chapterSlug),
          course: this.courseService.getBySlug(courseSlug).pipe(catchError(() => of(null))),
        }).pipe(
          map(({ chapter, course }) => ({
            chapter,
            courseSlug,
            courseChapters: course?.chapters ?? [],
            loading: false,
            errorMessage: '',
          })),
          catchError((error: unknown) =>
            of({
              chapter: null,
              courseSlug,
              courseChapters: [],
              loading: false,
              errorMessage: toApiError(error).message,
            }),
          ),
        );
      }),
    ),
    {
      initialValue: {
        chapter: null,
        courseSlug: '',
        courseChapters: [],
        loading: true,
        errorMessage: '',
      } satisfies CourseChapterState,
    },
  );

  protected readonly chapter = computed(() => this.state().chapter);

  protected readonly lessons = computed(() =>
    [...(this.state().chapter?.lessons ?? [])].sort((a, b) => a.order - b.order),
  );

  protected readonly nextChapter = computed(() => {
    const chapter = this.chapter();
    if (!chapter) return null;
    const chapters = this.state().courseChapters;
    const index = chapters.findIndex((item) => item.id === chapter.id || item.slug === chapter.slug);
    return index >= 0 ? (chapters[index + 1] ?? null) : null;
  });

  protected readonly previousChapter = computed(() => {
    const chapter = this.chapter();
    if (!chapter) return null;
    const chapters = this.state().courseChapters;
    const index = chapters.findIndex((item) => item.id === chapter.id || item.slug === chapter.slug);
    return index > 0 ? (chapters[index - 1] ?? null) : null;
  });

  protected readonly isAuthenticated = this.authState.isAuthenticated;

  constructor() {
    effect((onCleanup) => {
      const chapter = this.chapter();
      if (!chapter || !this.authState.isAuthenticated()) return;
      const subscription = this.learningService.markRead(chapter.id).subscribe({
        next: (progress) => this.completionStatus.set(progress.status === 'completed' ? 'completed' : 'idle'),
      });
      onCleanup(() => subscription.unsubscribe());
    });
  }

  protected markComplete(): void {
    const chapter = this.chapter();
    if (!chapter || this.completionStatus() !== 'idle') return;
    this.completionStatus.set('saving');
    this.learningService.markComplete(chapter.id).subscribe({
      next: () => this.completionStatus.set('completed'),
      error: () => this.completionStatus.set('idle'),
    });
  }

  protected trackLesson(_index: number, lesson: Lesson): string {
    return lesson.id;
  }
}
