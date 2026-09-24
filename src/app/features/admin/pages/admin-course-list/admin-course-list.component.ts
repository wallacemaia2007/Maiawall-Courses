import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';

import { toApiError } from '../../../../core/models/api-error.model';
import { AdminCourse } from '../../models/admin.model';
import { AdminService } from '../../services/admin.service';

@Component({
  selector: 'app-admin-course-list',
  standalone: true,
  imports: [DatePipe, RouterLink],
  templateUrl: './admin-course-list.component.html',
  styleUrl: './admin-course-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminCourseListComponent {
  private readonly adminService = inject(AdminService);

  protected readonly courses = signal<AdminCourse[]>([]);
  protected readonly loading = signal(true);
  protected readonly errorMessage = signal('');

  constructor() {
    this.adminService.courses().subscribe({
      next: (courses) => {
        this.courses.set(courses);
        this.loading.set(false);
      },
      error: (error: unknown) => {
        this.errorMessage.set(toApiError(error).message);
        this.loading.set(false);
      },
    });
  }
}
