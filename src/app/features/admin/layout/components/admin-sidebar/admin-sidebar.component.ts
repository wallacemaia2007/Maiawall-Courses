import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  NgZone,
  ViewChild,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';

import { AuthService } from '../../../../../core/auth/auth.service';

export interface AdminSidebarNavItem {
  label: string;
  route: string;
  icon: 'dashboard' | 'leads' | 'courses' | 'access' | 'students' | 'questions';
}

@Component({
  selector: 'app-admin-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './admin-sidebar.component.html',
  styleUrl: './admin-sidebar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminSidebarComponent implements AfterViewInit {
  @ViewChild('sidebarScroll')
  private readonly sidebarScroll?: ElementRef<HTMLElement>;

  private readonly destroyRef = inject(DestroyRef);
  private readonly ngZone = inject(NgZone);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly resizeObserver?: ResizeObserver;

  readonly collapsed = input(false);
  readonly drawerOpen = input(false);
  readonly darkTheme = input(true);
  readonly navItems = input.required<AdminSidebarNavItem[]>();
  readonly brandRoute = input('/admin/dashboard');
  readonly brandTitle = input('MAIAWALL');
  readonly brandSubtitle = input('ADMIN');
  readonly siteRoute = input('/');

  readonly toggleCollapsed = output<void>();
  readonly toggleTheme = output<void>();

  protected readonly hasScrollBelow = signal(false);

  ngAfterViewInit(): void {
    const element = this.sidebarScroll?.nativeElement;

    if (!element) {
      return;
    }

    this.updateScrollHint();

    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(() => {
        this.ngZone.run(() => this.updateScrollHint());
      });
      observer.observe(element);

      this.destroyRef.onDestroy(() => {
        observer.disconnect();
      });
    }
  }

  protected updateScrollHint(): void {
    const element = this.sidebarScroll?.nativeElement;

    if (!element) {
      return;
    }

    this.hasScrollBelow.set(element.scrollTop + element.clientHeight < element.scrollHeight - 1);
  }

  protected logout(): void {
    // Mesmo se a chamada falhar (rede), o usuário sai da área admin.
    this.authService.logout().subscribe({
      next: () => void this.router.navigateByUrl(this.siteRoute()),
      error: () => void this.router.navigateByUrl(this.siteRoute()),
    });
  }
}