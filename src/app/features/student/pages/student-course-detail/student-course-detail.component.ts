import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { switchMap } from 'rxjs';

import { CourseService } from '../../../courses/services/course.service';
import { ProgressService } from '../../services/progress.service';

@Component({
  selector: 'app-student-course-detail',
  standalone: true,
  templateUrl: './student-course-detail.component.html',
  styleUrl: './student-course-detail.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudentCourseDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly courseService = inject(CourseService);
  private readonly progressService = inject(ProgressService);

  protected readonly course$ = this.route.paramMap.pipe(
    switchMap((params) => this.courseService.getById(params.get('id') ?? '')),
  );

  protected readonly progress$ = this.route.paramMap.pipe(
    switchMap((params) => this.progressService.getCourseProgress(params.get('id') ?? '')),
  );
}