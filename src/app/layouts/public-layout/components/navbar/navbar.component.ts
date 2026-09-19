import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

export interface PublicNavLink {
  label: string;
  route: string;
}

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NavbarComponent {
  readonly brandTitle = input('MAIAWALL');
  readonly brandLink = input('/');

  readonly links = input<PublicNavLink[]>([
    { label: 'Cursos', route: '/cursos' },
  ]);
}