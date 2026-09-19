import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { switchMap } from 'rxjs';

import { CourseService } from '../../../courses/services/course.service';

@Component({
  selector: 'app-admin-course-detail',
  standalone: true,
  templateUrl: './admin-course-detail.component.html',
  styleUrl: './admin-course-detail.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminCourseDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly courseService = inject(CourseService);

  protected readonly course$ = this.route.paramMap.pipe(
    switchMap((params) => this.courseService.getById(params.get('id') ?? '')),
  );
}