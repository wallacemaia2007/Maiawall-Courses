import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { Chapter } from '../../../features/courses/models/course.model';
import { ProgressBarComponent } from '../progress-bar/progress-bar.component';

@Component({
  selector: 'app-course-summary',
  standalone: true,
  imports: [RouterLink, ProgressBarComponent],
  templateUrl: './course-summary.component.html',
  styleUrl: './course-summary.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CourseSummaryComponent {
  readonly chapters = input.required<Chapter[]>();
  readonly activeChapterId = input.required<string>();
  readonly completedChapterIds = input.required<ReadonlySet<string>>();
  readonly linkFor = input<(chapter: Chapter) => unknown[]>(() => []);
  readonly courseTitle = input<string>('');

  protected readonly sortedChapters = computed(() =>
    [...(this.chapters() ?? [])].sort((a, b) => a.order - b.order),
  );

  protected readonly completedCount = computed(
    () =>
      this.sortedChapters().filter((chapter) => this.completedChapterIds().has(chapter.id))
        .length,
  );

  protected readonly totalCount = computed(() => this.sortedChapters().length);

  protected readonly percent = computed(() =>
    this.totalCount() > 0 ? Math.round((this.completedCount() / this.totalCount()) * 100) : 0,
  );

  protected isCompleted(chapter: Chapter): boolean {
    return this.completedChapterIds().has(chapter.id);
  }

  protected isActive(chapter: Chapter): boolean {
    return chapter.id === this.activeChapterId();
  }

  protected chapterLink(chapter: Chapter): unknown[] {
    return this.linkFor()(chapter);
  }

  protected trackChapter(_index: number, chapter: Chapter): string {
    return chapter.id;
  }
}