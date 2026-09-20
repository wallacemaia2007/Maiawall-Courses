import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { catchError, map, of, switchMap } from 'rxjs';
import { toSignal } from '@angular/core/rxjs-interop';

import { toApiError } from '../../../../core/models/api-error.model';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { LoadingSpinnerComponent } from '../../../../shared/components/loading-spinner/loading-spinner.component';
import { ArticleComponent } from '../../../../shared/ui/article/article.component';
import { ChapterDetail, Lesson } from '../../models/course.model';
import { ChapterService } from '../../services/chapter.service';
import { AuthStateService } from '../../../../core/auth/auth-state.service';
import { LearningService } from '../../../learning/services/learning.service';

interface CourseChapterState {
  chapter: ChapterDetail | null;
  courseSlug: string;
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
  private readonly authState = inject(AuthStateService);
  private readonly learningService = inject(LearningService);
  protected readonly completionStatus = signal<'idle' | 'saving' | 'completed'>('idle');

  protected readonly state = toSignal(
    this.route.paramMap.pipe(
      switchMap((params) => {
        const courseSlug = params.get('slug') ?? '';
        const chapterSlug = params.get('chapterSlug') ?? '';

        return this.chapterService.getBySlug(courseSlug, chapterSlug).pipe(
          map((chapter) => ({
            chapter,
            courseSlug,
            loading: false,
            errorMessage: '',
          })),
          catchError((error: unknown) =>
            of({
              chapter: null,
              courseSlug,
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
        loading: true,
        errorMessage: '',
      } satisfies CourseChapterState,
    },
  );

  protected readonly chapter = computed(() => this.state().chapter);

  protected readonly lessons = computed(() =>
    [...(this.state().chapter?.lessons ?? [])].sort((a, b) => a.order - b.order),
  );

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
