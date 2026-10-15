import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  HostListener,
  inject,
  OnDestroy,
  signal,
  untracked,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { catchError, forkJoin, map, merge, of, Subject, switchMap } from 'rxjs';
import { toSignal } from '@angular/core/rxjs-interop';

import { toApiError } from '../../../../core/models/api-error.model';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { LoadingSpinnerComponent } from '../../../../shared/components/loading-spinner/loading-spinner.component';
import { ArticleComponent } from '../../../../shared/ui/article/article.component';
import { Chapter, Lesson } from '../../models/course.model';
import { CourseContentService } from '../../services/course-content.service';
import { AuthStateService } from '../../../../core/auth/auth-state.service';
import { GuestProgressService } from '../../../../core/services/guest-progress.service';
import { LearningService } from '../../../learning/services/learning.service';
import { CourseSummaryComponent } from '../../../../shared/ui/course-summary/course-summary.component';

/*
 * Estado do corpo das aulas, para a tela distinguir três situações que antes
 * colapsavam todas em "capítulo vazio":
 *   - `ok`          -> o asset tem o capítulo (pode ter 0 aulas: em preparação);
 *   - `unavailable` -> o asset baixou, mas não tem este capítulo (catálogo de
 *                      seed e build do asset fora de sincronia, ou despublicado);
 *   - `error`       -> o asset não baixou (rede/5xx): aí repetir pode resolver.
 */
type ContentStatus = 'ok' | 'unavailable' | 'error';

interface CourseChapterState {
  chapter: Chapter | null;
  lessons: Lesson[];
  courseSlug: string;
  courseTitle: string;
  courseChapters: Chapter[];
  loading: boolean;
  errorMessage: string;
  contentStatus: ContentStatus;
  courseMissing: boolean;
}

const COMPLETION_BOTTOM_OFFSET = 24;
const COMPLETION_DELAY_MS = 10_000;
const COMPLETION_RETRY_DELAY_MS = 3_000;
const COMPLETION_MAX_RETRIES = 3;

/*
 * 404 no asset = o minicurso não está publicado (ou não existe). O build apaga
 * o JSON de um curso despublicado, então ausência do arquivo é a resposta
 * correta para "não existe" — e é o que permite dispensar a API do caminho
 * crítico. Qualquer outro erro (rede, 5xx) é transitório e vale repetir.
 */
function isAssetMissing(error: unknown): boolean {
  return error instanceof HttpErrorResponse && error.status === 404;
}

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
  private readonly courseContentService = inject(CourseContentService);
  private readonly authState = inject(AuthStateService);
  private readonly learningService = inject(LearningService);
  private readonly guestProgressService = inject(GuestProgressService);
  protected readonly completionStatus = signal<'idle' | 'saving' | 'completed'>('idle');
  private readonly serverCompletedChapterIds = signal<Set<string>>(new Set());
  /*
   * O capítulo conta como visto quando as DUAS condições valem, em qualquer
   * ordem: o leitor ficou >= COMPLETION_DELAY_MS na página E chegou ao fim
   * dela pelo menos uma vez. (Antes exigia 10s parados no fim da página, e
   * qualquer rolagem para cima cancelava a contagem.)
   */
  private dwellTimer = 0;
  private retryTimer = 0;
  private dwellElapsed = false;
  private reachedEnd = false;
  private completionAttempts = 0;

  /*
   * A tela inteira (título do curso, hero do capítulo, sumário, texto e anexos)
   * sai do asset estático do curso, cacheado em memória. Não há nenhuma
   * chamada à API no caminho da leitura — o que chegar do backend (progresso
   * do aluno) entra por cima depois, num effect, sem segurar a renderização.
   * Trocar de capítulo dentro do mesmo curso é leitura local do cache.
   *
   * `outline` e `lessons` saem do MESMO asset já em cache: o forkJoin abaixo
   * espera o mesmo download, não duas requests.
   *
   * `retry$` existe para o botão "Tentar de novo": quando o asset do curso
   * falha, o CourseContentService descarta a entrada do cache, então só falta
   * re-disparar a leitura com os mesmos parâmetros da rota. É um Subject (e não
   * BehaviorSubject) para não somar uma carga extra na inicialização — a
   * primeira vem do paramMap.
   */
  private readonly retry$ = new Subject<void>();

  protected readonly state = toSignal(
    merge(
      this.route.paramMap,
      this.retry$.pipe(map(() => this.route.snapshot.paramMap)),
    ).pipe(
      switchMap((params) => {
        const courseSlug = params.get('slug') ?? '';
        const chapterSlug = params.get('chapterSlug') ?? '';

        return forkJoin({
          outline: this.courseContentService.getCourseOutline(courseSlug),
          lessons: this.courseContentService.getChapterLessons(courseSlug, chapterSlug),
        }).pipe(
          map(({ outline, lessons }) => ({
            chapter: outline.chapters.find((item) => item.slug === chapterSlug) ?? null,
            lessons: lessons ?? [],
            courseSlug,
            courseTitle: outline.title,
            courseChapters: outline.chapters,
            loading: false,
            errorMessage: '',
            contentStatus: (lessons === null ? 'unavailable' : 'ok') as ContentStatus,
            courseMissing: false,
          })),
          catchError((error: unknown) => {
            const missing = isAssetMissing(error);
            return of({
              chapter: null,
              lessons: [] as Lesson[],
              courseSlug,
              courseTitle: '',
              courseChapters: [],
              loading: false,
              errorMessage: missing ? '' : toApiError(error).message,
              contentStatus: 'error' as ContentStatus,
              courseMissing: missing,
            });
          }),
        );
      }),
    ),
    {
      initialValue: {
        chapter: null,
        lessons: [],
        courseSlug: '',
        courseTitle: '',
        courseChapters: [],
        loading: true,
        errorMessage: '',
        contentStatus: 'ok',
        courseMissing: false,
      } satisfies CourseChapterState,
    },
  );

  protected readonly chapter = computed(() => this.state().chapter);

  protected readonly lessons = computed(() => [...this.state().lessons].sort((a, b) => a.order - b.order));

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

  /*
   * Relê o capítulo com os mesmos parâmetros da rota. Só é oferecido no estado
   * `error` (o asset não baixou) e só funciona porque o CourseContentService
   * tira do cache a entrada que falhou — se ele devolvesse `null` em cache, o
   * botão repetiria a tela vazia. No estado `unavailable` repetir não adianta:
   * o capítulo não existe no asset, e a correção é rodar `npm run content:build`.
   */
  protected retryContent(): void {
    this.retry$.next();
  }

  constructor() {
    effect((onCleanup) => {
      const chapter = this.chapter();
      const authenticated = this.isAuthenticated();

      // Novo capítulo (o componente é reaproveitado entre rotas): zera tudo,
      // inclusive o status 'completed' herdado do capítulo anterior.
      untracked(() => this.resetReadingProgress());

      if (!chapter) {
        this.serverCompletedChapterIds.set(new Set());
        return;
      }

      if (!authenticated) {
        const alreadyCompleted = untracked(() =>
          this.guestProgressService.isChapterComplete(chapter.courseId, chapter.id),
        );
        this.completionStatus.set(alreadyCompleted ? 'completed' : 'idle');
        this.serverCompletedChapterIds.set(new Set());
        if (!alreadyCompleted) {
          this.startDwellTimer();
        }
        return;
      }

      const readSubscription = this.learningService.markRead(chapter.id).subscribe({
        next: (progress) => {
          if (progress.status === 'completed') {
            this.completionStatus.set('completed');
            this.clearTimers();
          }
        },
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

      this.startDwellTimer();

      onCleanup(() => {
        readSubscription.unsubscribe();
        courseProgressSubscription.unsubscribe();
      });
    });
  }

  @HostListener('window:scroll')
  @HostListener('window:resize')
  private onViewportChange(): void {
    if (!this.chapter() || this.completionStatus() !== 'idle') return;
    this.updateReachedEnd();
    this.tryComplete();
  }

  ngOnDestroy(): void {
    this.clearTimers();
  }

  private resetReadingProgress(): void {
    this.clearTimers();
    this.dwellElapsed = false;
    this.reachedEnd = false;
    this.completionAttempts = 0;
    this.completionStatus.set('idle');
  }

  private clearTimers(): void {
    if (this.dwellTimer) {
      window.clearTimeout(this.dwellTimer);
      this.dwellTimer = 0;
    }
    if (this.retryTimer) {
      window.clearTimeout(this.retryTimer);
      this.retryTimer = 0;
    }
  }

  private startDwellTimer(): void {
    this.dwellTimer = window.setTimeout(() => {
      this.dwellTimer = 0;
      this.dwellElapsed = true;
      // Cobre página curta (sem scroll) e reload já no fim da página: nesses
      // casos nenhum evento de scroll chega a disparar.
      this.updateReachedEnd();
      this.tryComplete();
    }, COMPLETION_DELAY_MS);
  }

  private updateReachedEnd(): void {
    if (this.reachedEnd) return;
    const root = document.documentElement;
    const distanceToEnd = root.scrollHeight - (window.scrollY + window.innerHeight);
    if (distanceToEnd <= COMPLETION_BOTTOM_OFFSET) {
      this.reachedEnd = true;
    }
  }

  private tryComplete(): void {
    if (this.reachedEnd && this.dwellElapsed) {
      this.completeIfIdle();
    }
  }

  private completeIfIdle(): void {
    const chapter = this.chapter();
    if (!chapter || this.completionStatus() !== 'idle') return;
    this.completionStatus.set('saving');

    if (!this.isAuthenticated()) {
      this.guestProgressService.markChapterComplete(chapter.courseId, chapter.id);
      this.completionStatus.set('completed');
      return;
    }

    this.learningService.markComplete(chapter.id).subscribe({
      next: () => {
        // Resposta atrasada de um capítulo anterior não pode marcar o atual.
        if (this.chapter()?.id === chapter.id) this.completionStatus.set('completed');
      },
      error: () => {
        if (this.chapter()?.id !== chapter.id) return;
        this.completionStatus.set('idle');
        this.scheduleRetry();
      },
    });
  }

  /*
   * Falha de rede/cold start no PATCH não deve perder a conclusão: sem isso o
   * leitor ficava parado no fim da página (sem novos eventos de scroll) e o
   * capítulo nunca era salvo.
   */
  private scheduleRetry(): void {
    if (this.retryTimer || this.completionAttempts >= COMPLETION_MAX_RETRIES) return;
    this.completionAttempts += 1;
    this.retryTimer = window.setTimeout(() => {
      this.retryTimer = 0;
      this.tryComplete();
    }, COMPLETION_RETRY_DELAY_MS * this.completionAttempts);
  }

  protected trackLesson(_index: number, lesson: Lesson): string {
    return lesson.id;
  }
}
