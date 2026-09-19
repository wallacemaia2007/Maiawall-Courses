import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { CourseService } from '../../../courses/services/course.service';

@Component({
  selector: 'app-admin-course-list',
  standalone: true,
  templateUrl: './admin-course-list.component.html',
  styleUrl: './admin-course-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminCourseListComponent {
  private readonly courseService = inject(CourseService);

  protected readonly courses$ = this.courseService.list();
}