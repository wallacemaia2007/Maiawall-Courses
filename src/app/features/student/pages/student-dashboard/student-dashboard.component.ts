import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { EnrollmentService } from '../../services/enrollment.service';
import { ProgressService } from '../../services/progress.service';

@Component({
  selector: 'app-student-dashboard',
  standalone: true,
  templateUrl: './student-dashboard.component.html',
  styleUrl: './student-dashboard.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudentDashboardComponent {
  private readonly enrollmentService = inject(EnrollmentService);
  private readonly progressService = inject(ProgressService);

  protected readonly overview$ = this.enrollmentService.listMyCourses();
  protected readonly progress$ = this.progressService.listMyCoursesProgress();
}