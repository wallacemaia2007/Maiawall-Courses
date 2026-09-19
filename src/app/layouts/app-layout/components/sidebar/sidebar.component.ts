import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

export interface AppSidebarNavItem {
  label: string;
  route: string;
  icon: string;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SidebarComponent {
  readonly brandTitle = input('MAIAWALL');
  readonly brandSubtitle = input('CURSOS');
  readonly brandRoute = input('/app/dashboard');

  readonly navItems = input<AppSidebarNavItem[]>([
    { label: 'Dashboard', route: '/app/dashboard', icon: 'dashboard' },
    { label: 'Meus cursos', route: '/app/cursos', icon: 'courses' },
    { label: 'Exercícios', route: '/app/exercicios', icon: 'exercises' },
    { label: 'Submissões', route: '/app/submissoes', icon: 'submissions' },
    { label: 'Certificados', route: '/app/certificados', icon: 'certificates' },
    { label: 'Meu perfil', route: '/app/perfil', icon: 'profile' },
  ]);
}