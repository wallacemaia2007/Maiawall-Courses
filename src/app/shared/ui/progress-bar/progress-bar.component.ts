import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  selector: 'app-progress-bar',
  standalone: true,
  templateUrl: './progress-bar.component.html',
  styleUrl: './progress-bar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProgressBarComponent {
  /** 0..100 */
  readonly percent = input.required<number>();
  readonly label = input<string>('');
  readonly showValue = input(true);
  readonly tone = input<'primary' | 'success' | 'neutral'>('primary');

  readonly clicked = output<void>();
}