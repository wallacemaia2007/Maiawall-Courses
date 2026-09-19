import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

export interface AdminSidebarNavItem {
  label: string;
  route: string;
  icon: string;
}

@Component({
  selector: 'app-admin-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './admin-sidebar.component.html',
  styleUrl: './admin-sidebar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminSidebarComponent {
  readonly brandTitle = input('MAIAWALL');
  readonly brandSubtitle = input('ADMIN');

  readonly navItems = input<AdminSidebarNavItem[]>([
    { label: 'Dashboard', route: '/admin/dashboard', icon: 'dashboard' },
    { label: 'Cursos', route: '/admin/cursos', icon: 'courses' },
    { label: 'Capítulos', route: '/admin/capitulos', icon: 'chapters' },
    { label: 'Exercícios', route: '/admin/exercicios', icon: 'exercises' },
    { label: 'Alunos', route: '/admin/alunos', icon: 'students' },
    { label: 'Submissões', route: '/admin/submissoes', icon: 'submissions' },
    { label: 'Certificados', route: '/admin/certificados', icon: 'certificates' },
  ]);
}