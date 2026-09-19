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

  protected readonly levelLabel = computed(() => getCourseLevelLabel(this.course().level));
  protected readonly categoryLabel = computed(() =>
    getCourseCategoryLabel(this.course().category),
  );
  protected readonly tone = computed(() => this.course().category ?? 'desenvolvimento');

  protected readonly coverLine = computed(() => COVER_LINES[this.tone()] ?? 'const aprender = true');
}

const COVER_LINES: Record<string, string> = {
  devops: 'docker compose up -d',
  backend: 'GET /api/courses → 200',
  desenvolvimento: "git commit -m 'feat: evoluindo'",
  'banco-de-dados': 'SELECT * FROM cursos;',
  frontend: "console.log('Olá, mundo!')",
};