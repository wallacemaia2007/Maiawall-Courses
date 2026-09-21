import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  OnDestroy,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { gsap } from 'gsap';
import { catchError, combineLatest, interval, map, of, switchMap } from 'rxjs';

import { AuthStateService } from '../../../../core/auth/auth-state.service';
import { AuthService } from '../../../../core/auth/auth.service';
import { HeroMarkerDirective } from '../../../../shared/directives/hero-marker.directive';
import { LessonCardComponent } from '../lesson-card/lesson-card.component';
import {
  Chapter,
  CourseDetail,
  CourseSummary,
  getCourseCategoryLabel,
  getCourseLevelLabel,
} from '../../../courses/models/course.model';
import {
  COURSE_CATALOG_SERVICE,
  CourseCatalogService,
} from '../../../courses/services/course-catalog.service';
import { CourseService } from '../../../courses/services/course.service';
import {
  ChapterLearningProgress,
  ChapterLearningStatus,
  LearningOverview,
  LearningService,
  StartedCourse,
} from '../../../learning/services/learning.service';

/*
 * Estados do card da direita + texto da esquerda:
 *   visitor — não logado (carrossel de descoberta)
 *   start   — logado, ainda sem nenhum curso iniciado (carrossel de descoberta)
 *   resume  — logado, com progresso em pelo menos 1 curso (card real de retomada)
 *   loading — logado e aguardando a resposta de overview()
 */
export type HeroCardState = 'loading' | 'visitor' | 'start' | 'resume';

const EMPTY_OVERVIEW: LearningOverview = { startedCourses: [], recentCompletedChapters: [] };
const CAROUSEL_INTERVAL_MS = 6500;
const CAROUSEL_SLIDE_LIMIT = 3;

interface HeroResumeData {
  course: StartedCourse['course'];
  chapters: Chapter[];
  completedCount: number;
  progressPercentage: number;
  status: (chapterId: string) => ChapterLearningStatus;
  current: Chapter | null;
}

interface CodeLine {
  indent: string;
  key: string;
  rest: string;
}

@Component({
  selector: 'app-hero',
  standalone: true,
  imports: [RouterLink, HeroMarkerDirective, LessonCardComponent],
  templateUrl: './hero.component.html',
  styleUrl: './hero.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeroComponent implements AfterViewInit, OnDestroy {
  private readonly auth = inject(AuthStateService);
  private readonly authService = inject(AuthService);
  private readonly catalog: CourseCatalogService = inject(COURSE_CATALOG_SERVICE);
  private readonly learning = inject(LearningService);
  private readonly courseService = inject(CourseService);
  private readonly hostRef = inject(ElementRef<HTMLElement>);
  private readonly destroyRef = inject(DestroyRef);

  private readonly reducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  protected readonly user = this.auth.user;
  protected readonly isAuthenticated = this.auth.isAuthenticated;
  protected readonly userName = computed(() => this.user()?.name ?? '');

  protected readonly overview = toSignal(
    toObservable(this.isAuthenticated).pipe(
      switchMap((authed) =>
        authed
          ? this.learning.overview().pipe(catchError(() => of(EMPTY_OVERVIEW)))
          : of<LearningOverview | null>(null),
      ),
    ),
    { initialValue: null },
  );

  protected readonly state = computed<HeroCardState>(() => {
    if (!this.isAuthenticated()) return 'visitor';
    const overview = this.overview();
    if (overview === null) return 'loading';
    return overview.startedCourses.length > 0 ? 'resume' : 'start';
  });

  protected readonly resumeCourse = computed<StartedCourse | null>(() => {
    const overview = this.overview();
    if (!overview || overview.startedCourses.length === 0) return null;
    return overview.startedCourses.reduce((best, course) =>
      course.progressPercentage > best.progressPercentage ? course : best,
    );
  });

  protected readonly featured = toSignal(
    toObservable(this.state).pipe(
      switchMap((currentState) =>
        currentState === 'visitor' || currentState === 'start'
          ? this.catalog.getFeatured(CAROUSEL_SLIDE_LIMIT).pipe(catchError(() => of<CourseSummary[]>([])))
          : of<CourseSummary[]>([]),
      ),
    ),
    { initialValue: null },
  );

  protected readonly resumeData = toSignal(
    toObservable(this.resumeCourse).pipe(
      switchMap((started) => {
        if (!started) return of<HeroResumeData | null>(null);
        return combineLatest([
          this.learning.courseProgress(started.course.id).pipe(catchError(() => of<ChapterLearningProgress[]>([]))),
          this.courseService.getBySlug(started.course.slug).pipe(catchError(() => of(null))),
        ]).pipe(
          map(([progress, detail]) => this.buildResume(started, progress, detail)),
        );
      }),
    ),
    { initialValue: null },
  );

  protected readonly resumeLink = computed(() => {
    const resume = this.resumeData();
    const course = (resume ? resume.course : this.resumeCourse()?.course) ?? null;
    if (!course) return '/cursos';
    const base = `/cursos/${course.slug}`;
    return resume?.current ? `${base}/capitulo/${resume.current.slug}` : base;
  });

  protected readonly activeIndex = signal(0);
  protected readonly paused = signal(false);
  protected readonly slideCount = computed(() => this.featured()?.length ?? 0);

  private ctx?: gsap.Context;
  private pointerCleanup?: () => void;

  constructor() {
    if (this.auth.accessToken() && !this.auth.isAuthenticated()) {
      this.authService
        .getSession()
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe();
    }

    effect(() => {
      const count = this.slideCount();
      const index = this.activeIndex();
      if (count > 0 && index >= count) {
        this.activeIndex.set(0);
      }
    });

    interval(CAROUSEL_INTERVAL_MS)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        if (this.reducedMotion || this.paused()) return;
        this.next();
      });
  }

  ngAfterViewInit(): void {
    const host: HTMLElement = this.hostRef.nativeElement;
    this.ctx = gsap.context(() => {
      const blobs = host.querySelectorAll<HTMLElement>('[data-hero-blob]');

      if (this.reducedMotion) {
        gsap.set(blobs, { opacity: 1, x: 0, y: 0 });
        return;
      }

      gsap.fromTo(
        blobs,
        { opacity: 0 },
        { opacity: 1, duration: 1.6, ease: 'power2.out', stagger: 0.25 },
      );

      gsap.to(blobs, {
        x: () => gsap.utils.random(-34, 34),
        y: () => gsap.utils.random(-28, 28),
        duration: gsap.utils.random(11, 16),
        ease: 'sine.inOut',
        repeat: -1,
        yoyo: true,
        stagger: { each: 1.8, from: 'random' },
      });

      if (window.matchMedia('(pointer: fine)').matches) {
        this.bindParallax(host);
      }
    }, host);
  }

  ngOnDestroy(): void {
    this.ctx?.revert();
    this.pointerCleanup?.();
  }

  protected next(): void {
    const count = this.slideCount();
    if (count < 2) return;
    this.activeIndex.set((this.activeIndex() + 1) % count);
  }

  protected prev(): void {
    const count = this.slideCount();
    if (count < 2) return;
    this.activeIndex.set((this.activeIndex() - 1 + count) % count);
  }

  protected goTo(index: number): void {
    const count = this.slideCount();
    if (count === 0) return;
    this.activeIndex.set(((index % count) + count) % count);
  }

  protected setPaused(paused: boolean): void {
    this.paused.set(paused);
  }

  protected onFocusOut(event: FocusEvent, carousel: HTMLElement): void {
    const next = event.relatedTarget as Node | null;
    if (next && carousel.contains(next)) return;
    this.paused.set(false);
  }

  protected firstChapterTitle(course: CourseSummary): string {
    return course.previewChapters?.[0]?.title ?? 'Primeiro capítulo';
  }

  protected chapterNumber(index: number): string {
    return String(index + 1).padStart(2, '0');
  }

  protected levelLabel(level: string | undefined): string {
    return level ? getCourseLevelLabel(level) : '';
  }

  protected categoryLabel(category: string | undefined): string {
    return category ? getCourseCategoryLabel(category) : '';
  }

  protected formatDuration(minutes: number | undefined): string {
    return minutes ? `${minutes} min` : '';
  }

  protected codeLines(code: string | undefined): CodeLine[] {
    if (!code) return [];
    return code.split('\n').map((line) => {
      const match = /^([ \t]*)([\w@$-]+):(.*)$/.exec(line);
      if (match) {
        return { indent: match[1], key: match[2], rest: match[3] };
      }
      const indentMatch = /^[ \t]*/.exec(line);
      const indent = indentMatch?.[0] ?? '';
      return { indent, key: '', rest: line.slice(indent.length) };
    });
  }

  private buildResume(
    started: StartedCourse,
    progress: ChapterLearningProgress[],
    detail: CourseDetail | null,
  ): HeroResumeData {
    const statusByChapter = new Map(progress.map((entry) => [entry.chapterId, entry.status]));
    const chapters = (detail?.chapters ?? []).slice().sort((a, b) => a.order - b.order);
    const status = (chapterId: string): ChapterLearningStatus =>
      statusByChapter.get(chapterId) ?? 'not-started';

    let current = chapters.find((chapter) => status(chapter.id) === 'in-progress') ?? null;
    if (!current && chapters.length > 0) {
      let lastCompletedIndex = -1;
      for (let index = chapters.length - 1; index >= 0; index -= 1) {
        if (status(chapters[index].id) === 'completed') {
          lastCompletedIndex = index;
          break;
        }
      }
      current = chapters.find(
        (chapter, index) => index > lastCompletedIndex && status(chapter.id) === 'not-started',
      ) ?? null;
    }
    current ??= chapters[0] ?? null;

    const completedCount = chapters.filter((chapter) => status(chapter.id) === 'completed').length;

    const course = detail
      ? {
          ...started.course,
          title: detail.title,
          shortDescription: detail.shortDescription ?? started.course.shortDescription,
          bannerUrl: detail.bannerUrl ?? started.course.bannerUrl,
          thumbnailUrl: detail.thumbnailUrl ?? started.course.thumbnailUrl,
          category: detail.category ?? started.course.category,
          level: detail.level ?? started.course.level,
          durationMinutes: detail.durationMinutes ?? started.course.durationMinutes,
        }
      : started.course;

    return {
      course,
      chapters,
      completedCount,
      progressPercentage: started.progressPercentage,
      status,
      current,
    };
  }

  private bindParallax(host: HTMLElement): void {
    const background = host.querySelector<HTMLElement>('[data-hero-bg]');
    if (!background) return;

    const RANGE = 12;
    const fromX = gsap.quickTo(background, 'x', { duration: 1.4, ease: 'power3.out' });
    const fromY = gsap.quickTo(background, 'y', { duration: 1.4, ease: 'power3.out' });

    const onMove = (event: PointerEvent): void => {
      const nx = event.clientX / window.innerWidth - 0.5;
      const ny = event.clientY / window.innerHeight - 0.5;
      fromX(nx * RANGE);
      fromY(ny * RANGE * 0.55);
    };

    host.addEventListener('pointermove', onMove, { passive: true });
    this.pointerCleanup = () => host.removeEventListener('pointermove', onMove);
  }
}