import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  HostListener,
  input,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';

export interface PublicNavLink {
  label: string;
  route: string;
  fragment?: string;
}

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NavbarComponent {
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly links = input<PublicNavLink[]>([
    { label: 'Cursos', route: '/cursos' },
    { label: 'Sobre', route: '/', fragment: 'sobre' },
  ]);

  protected readonly menuOpen = signal(false);

  protected toggleMenu(): void {
    this.menuOpen.update((open) => !open);
  }

  protected closeMenu(): void {
    this.menuOpen.set(false);
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    this.closeMenu();
  }

  @HostListener('document:click', ['$event'])
  protected onDocumentClick(event: Event): void {
    if (!this.menuOpen()) {
      return;
    }

    const target = event.target as HTMLElement | null;
    if (target && target.closest('app-navbar')) {
      return;
    }

    this.closeMenu();
  }

  constructor() {
    this.router.events
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.closeMenu());
  }
}