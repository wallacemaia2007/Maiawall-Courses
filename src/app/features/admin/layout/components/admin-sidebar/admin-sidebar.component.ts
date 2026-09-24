import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';

import { AuthService } from '../../../../../core/auth/auth.service';

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
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly brandTitle = input('MAIAWALL');
  readonly brandSubtitle = input('ADMIN');

  readonly navItems = input<AdminSidebarNavItem[]>([
    { label: 'Dashboard', route: '/admin/dashboard', icon: 'dashboard' },
    { label: 'Leads', route: '/admin/leads', icon: 'leads' },
    { label: 'Cursos', route: '/admin/cursos', icon: 'courses' },
    { label: 'Acessos', route: '/admin/acessos', icon: 'access' },
    { label: 'Alunos', route: '/admin/alunos', icon: 'students' },
    { label: 'Dúvidas', route: '/admin/duvidas', icon: 'questions' },
  ]);

  protected logout(): void {
    // Mesmo se a chamada falhar (rede), o usuário sai da área admin.
    this.authService.logout().subscribe({
      next: () => void this.router.navigateByUrl('/'),
      error: () => void this.router.navigateByUrl('/'),
    });
  }
}
