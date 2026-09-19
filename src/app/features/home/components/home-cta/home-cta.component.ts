import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { RevealDirective } from '../../../../shared/directives/reveal.directive';

@Component({
  selector: 'app-home-cta',
  standalone: true,
  imports: [RouterLink, RevealDirective],
  templateUrl: './home-cta.component.html',
  styleUrl: './home-cta.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeCtaComponent {}