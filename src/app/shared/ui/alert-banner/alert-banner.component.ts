import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type AlertBannerTone = 'danger' | 'warning' | 'info' | 'success';

@Component({
  selector: 'app-alert-banner',
  standalone: true,
  templateUrl: './alert-banner.component.html',
  styleUrl: './alert-banner.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AlertBannerComponent {
  readonly tone = input<AlertBannerTone>('info');
  readonly title = input.required<string>();
  readonly message = input<string>('');
  readonly dismissible = input(false);
  protected dismissed = false;

  protected dismiss(): void {
    this.dismissed = true;
  }
}