import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  HostListener,
  inject,
  OnDestroy,
  signal,
} from '@angular/core';
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
import { GuestProgressService } from '../../../../core/services/guest-progress.service';
import { LearningService } from '../../../learning/services/learning.service';
import { CourseSummaryComponent } from '../../../../shared/ui/course-summary/course-summary.component';

interface CourseChapterState {
  chapter: ChapterDetail | null;
  courseSlug: string;
  courseTitle: string;
  courseChapters: Chapter[];
  loading: boolean;
  errorMessage: string;
}

const COMPLETION_BOTTOM_OFFSET = 24;
const COMPLETION_DELAY_MS = 10_000;

@Component({
  selector: 'app-course-chapter',
  standalone: true,
  imports: [RouterLink, EmptyStateComponent, LoadingSpinnerComponent, ArticleComponent, CourseSummaryComponent],
  templateUrl: './course-chapter.component.html',
  styleUrl: './course-chapter.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CourseChapterComponent implements OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly chapterService = inject(ChapterService);
  private readonly courseService = inject(CourseService);
  private readonly authState = inject(AuthStateService);
  private readonly learningService = inject(LearningService);
  private readonly guestProgressService = inject(GuestProgressService);
  protected readonly completionStatus = signal<'idle' | 'saving' | 'completed'>('idle');
  private readonly serverCompletedChapterIds = signal<Set<string>>(new Set());
  private completionTimer = 0;

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
            courseTitle: course?.title ?? '',
            courseChapters: course?.chapters ?? [],
            loading: false,
            errorMessage: '',
          })),
          catchError((error: unknown) =>
            of({
              chapter: null,
              courseSlug,
              courseTitle: '',
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
        courseTitle: '',
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

  protected readonly completedChapterIds = computed(() => {
    const chapter = this.chapter();
    const ids = new Set(this.serverCompletedChapterIds());
    if (chapter) {
      if (!this.isAuthenticated()) {
        const guest = this.guestProgressService.value()[chapter.courseId] ?? {};
        Object.keys(guest).forEach((id) => ids.add(id));
      }
      if (this.completionStatus() === 'completed') {
        ids.add(chapter.id);
      }
    }
    return ids;
  });

  protected readonly chapterLink = (chapter: Chapter): unknown[] => [
    '/cursos',
    this.state().courseSlug,
    'capitulo',
    chapter.slug,
  ];

  constructor() {
    effect((onCleanup) => {
      const chapter = this.chapter();
      if (!chapter) {
        this.serverCompletedChapterIds.set(new Set());
        return;
      }

      if (!this.isAuthenticated()) {
        this.completionStatus.set(
          this.guestProgressService.isChapterComplete(chapter.courseId, chapter.id)
            ? 'completed'
            : 'idle',
        );
        this.serverCompletedChapterIds.set(new Set());
        return;
      }

      const readSubscription = this.learningService.markRead(chapter.id).subscribe({
        next: (progress) =>
          this.completionStatus.set(progress.status === 'completed' ? 'completed' : 'idle'),
      });

      const courseProgressSubscription = this.learningService.courseProgress(chapter.courseId).subscribe(
        {
          next: (progress) =>
            this.serverCompletedChapterIds.set(
              new Set(
                progress
                  .filter((item) => item.status === 'completed')
                  .map((item) => item.chapterId),
              ),
            ),
          error: () => this.serverCompletedChapterIds.set(new Set()),
        },
      );

      onCleanup(() => {
        readSubscription.unsubscribe();
        courseProgressSubscription.unsubscribe();
      });
    });
  }

  @HostListener('window:scroll')
  private onWindowScroll(): void {
    const chapter = this.chapter();
    if (!chapter || this.completionStatus() === 'completed') {
      this.clearCompletionTimer();
      return;
    }

    const reachedBottom =
      window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - COMPLETION_BOTTOM_OFFSET;

    if (reachedBottom) {
      if (!this.completionTimer) {
        this.completionTimer = window.setTimeout(() => this.completeIfIdle(), COMPLETION_DELAY_MS);
      }
    } else {
      this.clearCompletionTimer();
    }
  }

  ngOnDestroy(): void {
    this.clearCompletionTimer();
  }

  private clearCompletionTimer(): void {
    if (this.completionTimer) {
      window.clearTimeout(this.completionTimer);
      this.completionTimer = 0;
    }
  }

  private completeIfIdle(): void {
    this.completionTimer = 0;
    const chapter = this.chapter();
    if (!chapter || this.completionStatus() !== 'idle') return;
    this.completionStatus.set('saving');

    if (!this.isAuthenticated()) {
      this.guestProgressService.markChapterComplete(chapter.courseId, chapter.id);
      this.completionStatus.set('completed');
      return;
    }

    this.learningService.markComplete(chapter.id).subscribe({
      next: () => this.completionStatus.set('completed'),
      error: () => this.completionStatus.set('idle'),
    });
  }

  protected trackLesson(_index: number, lesson: Lesson): string {
    return lesson.id;
  }
}
