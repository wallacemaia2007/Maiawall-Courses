import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
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

  readonly dismissed = output<void>();

  readonly navItems = input<AppSidebarNavItem[]>([
    { label: 'Dashboard', route: '/app/dashboard', icon: 'dashboard' },
    { label: 'Meus cursos', route: '/app/cursos', icon: 'courses' },
    { label: 'Exercícios', route: '/app/exercicios', icon: 'exercises' },
    { label: 'Submissões', route: '/app/submissoes', icon: 'submissions' },
    { label: 'Certificados', route: '/app/certificados', icon: 'certificates' },
    { label: 'Meu perfil', route: '/app/perfil', icon: 'profile' },
  ]);

  protected readonly navIcons: Record<string, string> = {
    dashboard: 'M3 3h7v7H3zM14 3h7v4h-7zM14 10h7v11h-7zM3 13h7v8H3z',
    courses: 'M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 19.5A2.5 2.5 0 0 0 6.5 22H20V2H6.5A2.5 2.5 0 0 0 4 4.5v15Z',
    exercises: 'M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11',
    submissions: 'M12 3v12m0 0 4-4m-4 4-4-4M4 21h16',
    certificates: 'M6 9V3h12v6m-8 0h4a2 2 0 0 1 0 4m-4-4v9m4-5a2 2 0 0 1 0 4M7 21h10',
    profile: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z',
  };

  protected iconPath(icon: string): string {
    return this.navIcons[icon] ?? this.navIcons['courses'];
  }
}