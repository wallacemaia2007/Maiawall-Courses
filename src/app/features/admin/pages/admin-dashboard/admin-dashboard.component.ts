import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { CourseService } from '../../../courses/services/course.service';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  templateUrl: './admin-dashboard.component.html',
  styleUrl: './admin-dashboard.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminDashboardComponent {
  private readonly courseService = inject(CourseService);

  protected readonly courses$ = this.courseService.list({ page: 0, size: 5 });
}