import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { Chapter, CourseSummary, getCourseCategoryLabel, getCourseLevelLabel } from '../../../courses/models/course.model';
import { ChapterLearningStatus, StartedCourse } from '../../../learning/services/learning.service';

export type LessonCardCourse = CourseSummary | StartedCourse['course'];

interface CodeLine {
  indent: string;
  key: string;
  rest: string;
}

const MAX_OUTLINE_CHAPTERS = 3;

@Component({
  selector: 'app-lesson-card',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './lesson-card.component.html',
  styleUrl: './lesson-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LessonCardComponent {
  readonly course = input.required<LessonCardCourse>();
  readonly chapters = input<Chapter[]>([]);
  readonly current = input<Chapter | null>(null);
  readonly completedCount = input(0);
  readonly progressPercentage = input<number | null>(null);
  readonly resumeLink = input('/cursos');
  readonly status = input<(chapterId: string) => ChapterLearningStatus>(() => 'not-started');

  protected readonly isResume = computed(() => this.progressPercentage() !== null);
  protected readonly isSummary = computed(() => this.progressPercentage() === null);
  protected readonly bannerUrl = computed(
    () => this.course().bannerUrl || '/assets/banners/ufu.brand.png',
  );
  protected readonly chapterCount = computed(() => {
    const course = this.course();
    return 'chapterCount' in course ? course.chapterCount : course.totalChapters;
  });
  protected readonly expanded = signal(false);
  protected readonly canExpand = computed(() => this.chapters().length > MAX_OUTLINE_CHAPTERS);
  protected readonly outlineTotal = computed(() => this.chapters().length);
  protected readonly outlineChapters = computed(() => {
    const chapters = this.chapters();
    const count = MAX_OUTLINE_CHAPTERS;
    if (this.expanded()) return chapters;
    if (chapters.length <= count) return chapters;

    const currentIndex = this.current()
      ? chapters.findIndex((chapter) => chapter.id === this.current()?.id)
      : -1;
    if (currentIndex < 0) return chapters.slice(0, count);

    const start = Math.min(Math.max(currentIndex - Math.floor(count / 2), 0), chapters.length - count);
    return chapters.slice(start, start + count);
  });
  protected readonly previewChapters = computed(() => {
    const course = this.course();
    const chapters = 'previewChapters' in course ? course.previewChapters ?? [] : [];
    return chapters.slice(0, MAX_OUTLINE_CHAPTERS);
  });
  protected readonly previewCode = computed(() => {
    const course = this.course();
    return 'previewSnippet' in course ? course.previewSnippet?.code : undefined;
  });

  protected levelLabel(level: string | undefined): string {
    return level ? getCourseLevelLabel(level) : '';
  }

  protected categoryLabel(category: string | undefined): string {
    return category ? getCourseCategoryLabel(category) : '';
  }

  protected chapterNumber(index: number): string {
    return String(index + 1).padStart(2, '0');
  }

  protected formatDuration(minutes: number | undefined): string {
    return minutes ? `${minutes} min` : '';
  }

  protected toggleOutline(): void {
    this.expanded.update((value) => !value);
  }

  protected useFallbackBanner(event: Event): void {
    const image = event.target as HTMLImageElement;
    const fallback = '/assets/banners/ufu.brand.png';

    if (image.src.endsWith(fallback)) return;
    image.src = fallback;
  }

  protected codeLines(code: string | undefined): CodeLine[] {
    if (!code) return [];
    return code.split('\n').map((line) => {
      const match = /^([ \t]*)([\w@$-]+):(.*)$/.exec(line);
      if (match) return { indent: match[1], key: match[2], rest: match[3] };
      const indent = /^[ \t]*/.exec(line)?.[0] ?? '';
      return { indent, key: '', rest: line.slice(indent.length) };
    });
  }
}
