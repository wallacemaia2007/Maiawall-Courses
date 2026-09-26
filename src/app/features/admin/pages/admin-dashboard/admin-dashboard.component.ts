import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';

import { toApiError } from '../../../../core/models/api-error.model';
import { AdminAnalyticsPanelComponent } from '../../components/admin-analytics-panel/admin-analytics-panel.component';
import { AdminAnalytics, AdminDashboard } from '../../models/admin.model';
import { AdminService } from '../../services/admin.service';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [DatePipe, RouterLink, AdminAnalyticsPanelComponent],
  templateUrl: './admin-dashboard.component.html',
  styleUrl: './admin-dashboard.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminDashboardComponent {
  private readonly adminService = inject(AdminService);

  protected readonly data = signal<AdminDashboard | null>(null);
  protected readonly loading = signal(true);
  protected readonly errorMessage = signal('');

  protected readonly analytics = signal<AdminAnalytics | null>(null);
  protected readonly analyticsLoading = signal(true);

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

    this.adminService.analytics().subscribe({
      next: (analytics) => {
        this.analytics.set(analytics);
        this.analyticsLoading.set(false);
      },
      error: () => {
        // Analytics é complementar: uma falha aqui não deve travar o dashboard.
        this.analyticsLoading.set(false);
      },
    });
  }

  protected leadsConversionRate(leads: AdminDashboard['leads']): number {
    return leads.total === 0 ? 0 : Math.round((leads.converted / leads.total) * 100);
  }
}
