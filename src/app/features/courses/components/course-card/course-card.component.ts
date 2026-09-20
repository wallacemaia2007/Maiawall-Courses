import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { DurationPipe } from '../../../../shared/pipes/duration.pipe';
import {
  CourseSummary,
  getCourseCategoryLabel,
  getCourseLevelLabel,
} from '../../models/course.model';

@Component({
  selector: 'app-course-card',
  standalone: true,
  imports: [RouterLink, DurationPipe],
  templateUrl: './course-card.component.html',
  styleUrl: './course-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CourseCardComponent {
  readonly course = input.required<CourseSummary>();

  /** Número do curso na listagem é opcional; vira o "índice" da capa. */
  readonly index = input(1);

  protected readonly levelLabel = computed(() => getCourseLevelLabel(this.course().level));
  protected readonly categoryLabel = computed(() =>
    getCourseCategoryLabel(this.course().category),
  );
  protected readonly tone = computed(() => this.course().category ?? 'desenvolvimento');
  protected readonly coverIndex = computed(() =>
    String(Math.max(1, Math.trunc(this.index()))).padStart(2, '0'),
  );
}
