import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { CourseSummary } from '../../models/course.model';

@Component({
  selector: 'app-course-card',
  standalone: true,
  templateUrl: './course-card.component.html',
  styleUrl: './course-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CourseCardComponent {
  readonly course = input.required<CourseSummary>();
  readonly progressPercent = input<number | null>(null);
}