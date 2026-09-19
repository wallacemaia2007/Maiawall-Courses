import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { EnrollmentService } from '../../services/enrollment.service';

@Component({
  selector: 'app-student-courses',
  standalone: true,
  templateUrl: './student-courses.component.html',
  styleUrl: './student-courses.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudentCoursesComponent {
  private readonly enrollmentService = inject(EnrollmentService);

  protected readonly courses$ = this.enrollmentService.listMyCourses();
}