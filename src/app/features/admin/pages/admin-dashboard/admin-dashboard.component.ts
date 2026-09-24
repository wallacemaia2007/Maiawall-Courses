import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';

import { toApiError } from '../../../../core/models/api-error.model';
import { AdminDashboard } from '../../models/admin.model';
import { AdminService } from '../../services/admin.service';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [DatePipe, RouterLink],
  templateUrl: './admin-dashboard.component.html',
  styleUrl: './admin-dashboard.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminDashboardComponent {
  private readonly adminService = inject(AdminService);

  protected readonly data = signal<AdminDashboard | null>(null);
  protected readonly loading = signal(true);
  protected readonly errorMessage = signal('');

  constructor() {
    this.adminService.dashboard().subscribe({
      next: (data) => {
        this.data.set(data);
        this.loading.set(false);
      },
      error: (error: unknown) => {
        this.errorMessage.set(toApiError(error).message);
        this.loading.set(false);
      },
    });
  }
}
