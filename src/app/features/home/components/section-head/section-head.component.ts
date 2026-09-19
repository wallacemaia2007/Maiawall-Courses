import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-section-head',
  standalone: true,
  templateUrl: './section-head.component.html',
  styleUrl: './section-head.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SectionHeadComponent {
  readonly eyebrow = input<string>();
  readonly title = input('');
  readonly subtitle = input<string>();
  readonly align = input<'left' | 'center'>('center');
}