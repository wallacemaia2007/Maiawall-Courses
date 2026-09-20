import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, forkJoin, map, of, startWith, Subject, switchMap } from 'rxjs';

import { ChapterDetail, CourseDetail, Lesson } from '../../../courses/models/course.model';
import { CourseService } from '../../../courses/services/course.service';
import { ChapterService } from '../../../courses/services/chapter.service';
import { apiErrorMessage } from '../../../../core/models/api-error.model';
import { NotificationService } from '../../../../core/services/notification.service';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { LoadingSpinnerComponent } from '../../../../shared/components/loading-spinner/loading-spinner.component';
import { ArticleComponent } from '../../../../shared/ui/article/article.component';
import { ChapterProgress, CourseProgress } from '../../models/progress.model';
import { ProgressService } from '../../services/progress.service';

interface StudentChapterState {
  loading: boolean;
  errorMessage: string;
  chapter: ChapterDetail | null;
  course: CourseDetail | null;
  chapterProgress: ChapterProgress | null;
  courseProgress: CourseProgress | null;
}

@Component({
  selector: 'app-student-chapter',
  standalone: true,
  imports: [RouterLink, EmptyStateComponent, LoadingSpinnerComponent, ArticleComponent],
  templateUrl: './student-chapter.component.html',
  styleUrl: './student-chapter.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudentChapterComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly chapterService = inject(ChapterService);
  private readonly courseService = inject(CourseService);
  private readonly progressService = inject(ProgressService);
  private readonly notificationService = inject(NotificationService);

  private readonly reload$ = new Subject<void>();

  protected readonly completing = signal(false);
  protected readonly markedLessonIds = signal<Set<string>>(new Set());

  protected readonly state = toSignal(
    this.reload$.pipe(
      startWith(null),
      switchMap(() =>
        this.route.paramMap.pipe(
          switchMap((params) =>
            this.chapterService.getById(params.get('id') ?? '').pipe(
              switchMap((chapter) => {
                if (!chapter) {
                  return of({
                    loading: false,
                    errorMessage: '',
                    chapter: null,
                    course: null,
                    chapterProgress: null,
                    courseProgress: null,
                  });
                }

                return forkJoin({
                  chapter: of(chapter),
                  course: this.courseService.getById(chapter.courseId),
                  chapterProgress: this.progressService.getChapterProgress(chapter.id),
                  courseProgress: this.progressService.getCourseProgress(chapter.courseId),
                }).pipe(
                  map(({ chapter, course, chapterProgress, courseProgress }) => ({
                    loading: false,
                    errorMessage: '',
                    chapter,
                    course,
                    chapterProgress,
                    courseProgress,
                  })),
                  catchError((error: unknown) =>
                    of({
                      loading: false,
                      errorMessage: apiErrorMessage(
                        error,
                        'Não foi possível carregar o capítulo. Tente novamente.',
                      ),
                      chapter: null,
                      course: null,
                      chapterProgress: null,
                      courseProgress: null,
                    }),
                  ),
                );
              }),
              catchError((error: unknown) =>
                of({
                  loading: false,
                  errorMessage: apiErrorMessage(
                    error,
                    'Não foi possível carregar o capítulo. Tente novamente.',
                  ),
                  chapter: null,
                  course: null,
                  chapterProgress: null,
                  courseProgress: null,
                }),
              ),
            ),
          ),
        ),
      ),
    ),
    {
      initialValue: {
        loading: true,
        errorMessage: '',
        chapter: null,
        course: null,
        chapterProgress: null,
        courseProgress: null,
      } satisfies StudentChapterState,
    },
  );

  protected readonly chapter = computed(() => this.state().chapter);

  protected readonly lessons = computed(() =>
    [...(this.state().chapter?.lessons ?? [])].sort((a, b) => a.order - b.order),
  );

  protected readonly exercises = computed(() => this.state().chapter?.exercises ?? []);

  protected readonly materials = computed(() => this.state().chapter?.materials ?? []);

  protected readonly isCompleted = computed(
    () => this.state().chapterProgress?.status === 'completed',
  );

  protected readonly isLocked = computed(() => {
    const chapter = this.state().chapter;
    if (!chapter || chapter.isPublic) {
      return false;
    }

    const index = this.currentChapterIndex();
    if (index < 0) {
      return false;
    }

    const completed = this.state().courseProgress?.completedChapters ?? 0;
    return index > completed;
  });

  protected readonly allChapters = computed(() =>
    [...(this.state().course?.chapters ?? [])].sort((a, b) => a.order - b.order),
  );

  protected readonly currentChapterIndex = computed(() => {
    const chapter = this.state().chapter;
    if (!chapter) {
      return -1;
    }
    return this.allChapters().findIndex((item) => item.id === chapter.id);
  });

  protected readonly prevChapter = computed(() => {
    const index = this.currentChapterIndex();
    return index > 0 ? this.allChapters()[index - 1] : null;
  });

  protected readonly nextChapter = computed(() => {
    const index = this.currentChapterIndex();
    return index >= 0 && index < this.allChapters().length - 1
      ? this.allChapters()[index + 1]
      : null;
  });

  protected readonly allLessonsMarked = computed(() => {
    const lessons = this.lessons();
    if (lessons.length === 0) {
      return true;
    }
    const marked = this.markedLessonIds();
    return lessons.every((lesson) => marked.has(lesson.id));
  });

  protected toggleLesson(lesson: Lesson): void {
    if (this.isCompleted()) {
      return;
    }

    this.markedLessonIds.update((ids) => {
      const next = new Set(ids);
      if (next.has(lesson.id)) {
        next.delete(lesson.id);
      } else {
        next.add(lesson.id);
      }
      return next;
    });
  }

  protected completeChapter(): void {
    const chapter = this.state().chapter;
    if (!chapter || this.completing() || !this.allLessonsMarked()) {
      return;
    }

    this.completing.set(true);

    this.progressService.markChapterComplete(chapter.id).subscribe({
      next: () => {
        this.completing.set(false);
        this.notificationService.success(
          'Capítulo concluído 🎉',
          'Bom trabalho! Continue para o próximo passo.',
        );
        this.reload$.next();
      },
      error: (error: unknown) => {
        this.completing.set(false);
        this.notificationService.error(
          'Não foi possível salvar seu progresso',
          apiErrorMessage(error, 'Tente novamente em instantes.'),
        );
      },
    });
  }

  protected retry(): void {
    this.reload$.next();
  }

  protected trackLesson(_index: number, lesson: Lesson): string {
    return lesson.id;
  }
}