import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  ViewEncapsulation,
  inject,
  signal,
} from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';

import { ThemeService } from '../../../core/services/theme.service';
import {
  AdminSidebarComponent,
  AdminSidebarNavItem,
} from './components/admin-sidebar/admin-sidebar.component';

/*
 * ViewEncapsulation.None de propósito: as classes `.adm-*` deste layout são o
 * kit visual compartilhado das páginas do admin (cards, tabelas, badges,
 * formulários), evitando repetir o mesmo CSS em cada página.
 */
@Component({
  selector: 'app-admin-layout',
  imports: [RouterOutlet, AdminSidebarComponent],
  templateUrl: './admin-layout.component.html',
  styleUrl: './admin-layout.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class AdminLayoutComponent {
  private readonly router = inject(Router);
  private readonly themeService = inject(ThemeService);

  protected readonly drawerOpen = signal(false);
  protected readonly sidebarCollapsed = signal(true);
  protected readonly darkTheme = this.themeService.darkTheme;
  protected readonly mode = this.themeService.mode;

  protected readonly navItems: AdminSidebarNavItem[] = [
    { label: 'Dashboard', route: '/admin/dashboard', icon: 'dashboard' },
    { label: 'Leads', route: '/admin/leads', icon: 'leads' },
    { label: 'Cursos', route: '/admin/cursos', icon: 'courses' },
    { label: 'Acessos', route: '/admin/acessos', icon: 'access' },
    { label: 'Alunos', route: '/admin/alunos', icon: 'students' },
    { label: 'Dúvidas', route: '/admin/duvidas', icon: 'questions' },
  ];

  constructor() {
    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe(() => this.drawerOpen.set(false));
  }

  @HostListener('document:keydown.escape')
  protected closeDrawerOnEscape(): void {
    this.drawerOpen.set(false);
  }

  protected openDrawer(): void {
    this.drawerOpen.set(true);
  }

  protected closeDrawer(): void {
    this.drawerOpen.set(false);
  }

  protected toggleSidebar(): void {
    this.sidebarCollapsed.update((collapsed) => !collapsed);
  }

  protected toggleTheme(): void {
    this.themeService.toggleMode();
  }

  protected getPageTitle(): string {
    const url = this.router.url;

    if (url.startsWith('/admin/leads')) {
      return 'Leads';
    }

    if (url.startsWith('/admin/cursos')) {
      return 'Cursos';
    }

    if (url.startsWith('/admin/acessos')) {
      return 'Acessos';
    }

    if (url.startsWith('/admin/alunos')) {
      return 'Alunos';
    }

    if (url.startsWith('/admin/duvidas')) {
      return 'Dúvidas';
    }

    return 'Dashboard';
  }
}