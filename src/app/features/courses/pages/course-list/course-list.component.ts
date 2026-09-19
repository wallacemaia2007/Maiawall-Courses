import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { CourseService } from '../../services/course.service';

@Component({
  selector: 'app-course-list',
  standalone: true,
  templateUrl: './course-list.component.html',
  styleUrl: './course-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CourseListComponent {
  private readonly courseService = inject(CourseService);

  protected readonly courses$ = this.courseService.list();
}