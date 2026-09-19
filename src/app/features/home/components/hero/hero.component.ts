import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { HeroMarkerDirective } from '../../../../shared/directives/hero-marker.directive';

@Component({
  selector: 'app-hero',
  standalone: true,
  imports: [RouterLink, HeroMarkerDirective],
  templateUrl: './hero.component.html',
  styleUrl: './hero.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeroComponent {}