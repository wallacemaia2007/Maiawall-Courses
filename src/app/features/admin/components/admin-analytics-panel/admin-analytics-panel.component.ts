import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { AdminAnalytics } from '../../models/admin.model';

@Component({
  selector: 'app-admin-analytics-panel',
  standalone: true,
  imports: [],
  templateUrl: './admin-analytics-panel.component.html',
  styleUrl: './admin-analytics-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminAnalyticsPanelComponent {
  readonly data = input<AdminAnalytics | null>(null);
  readonly loading = input(false);

  protected readonly maxTrendSessions = computed(() => {
    const trend = this.data()?.sessionsTrend ?? [];
    return trend.reduce((max, point) => Math.max(max, point.sessions), 0) || 1;
  });

  /* Altura relativa da barra (mínimo 4% para o dia ficar visível mesmo com 0 sessões). */
  protected barHeight(sessions: number): number {
    return Math.max(4, Math.round((sessions / this.maxTrendSessions()) * 100));
  }

  protected shortDate(isoDate: string): string {
    const [, month, day] = isoDate.split('-');
    return day && month ? `${day}/${month}` : isoDate;
  }
}
