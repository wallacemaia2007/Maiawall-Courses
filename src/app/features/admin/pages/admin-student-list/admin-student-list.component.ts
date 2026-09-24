import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';

import { toApiError } from '../../../../core/models/api-error.model';
import { AdminStudent } from '../../models/admin.model';
import { AdminService } from '../../services/admin.service';

const PROVIDER_LABELS: Record<AdminStudent['provider'], string> = {
  email: 'E-mail',
  google: 'Google',
  github: 'GitHub',
};

@Component({
  selector: 'app-admin-student-list',
  standalone: true,
  imports: [DatePipe],
  templateUrl: './admin-student-list.component.html',
  styleUrl: './admin-student-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminStudentListComponent {
  private readonly adminService = inject(AdminService);

  protected readonly students = signal<AdminStudent[]>([]);
  protected readonly loading = signal(true);
  protected readonly errorMessage = signal('');
  protected readonly search = signal('');

  protected readonly filtered = computed(() => {
    const term = this.search().trim().toLowerCase();
    if (!term) return this.students();
    return this.students().filter(
      (student) =>
        student.name.toLowerCase().includes(term) || student.email.toLowerCase().includes(term),
    );
  });

  constructor() {
    this.adminService.students().subscribe({
      next: (students) => {
        this.students.set(students);
        this.loading.set(false);
      },
      error: (error: unknown) => {
        this.errorMessage.set(toApiError(error).message);
        this.loading.set(false);
      },
    });
  }

  protected providerLabel(provider: AdminStudent['provider']): string {
    return PROVIDER_LABELS[provider] ?? provider;
  }

  protected onSearch(event: Event): void {
    this.search.set((event.target as HTMLInputElement).value);
  }
}
