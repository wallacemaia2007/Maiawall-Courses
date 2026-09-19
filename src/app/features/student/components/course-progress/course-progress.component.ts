import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { CourseProgress } from '../../models/progress.model';
import { ProgressBarComponent } from '../../../../shared/ui/progress-bar/progress-bar.component';

@Component({
  selector: 'app-course-progress',
  standalone: true,
  imports: [ProgressBarComponent],
  templateUrl: './course-progress.component.html',
  styleUrl: './course-progress.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CourseProgressComponent {
  readonly progress = input.required<CourseProgress>();
}