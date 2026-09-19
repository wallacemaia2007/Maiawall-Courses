import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  OnDestroy,
  effect,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';

import {
  PUBLIC_NAV_LINKS,
  PublicNavLink,
} from '../../../../core/constants/navigation.constants';
import { HeaderHeroService } from '../../../../core/services/header-hero.service';

/* Sensibilidade de direção do scroll (px). */
const DIRECTION_THRESHOLD = 10;

/* Faixa do topo onde o header fica sempre visível (px). */
const HEADER_TOP_OFFSET = 88;

/* Só esconde o header após rolar além deste ponto (px). */
const HIDE_AFTER_Y = 280;

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NavbarComponent implements AfterViewInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly changeDetector = inject(ChangeDetectorRef);
  private readonly heroService = inject(HeaderHeroService);
  private readonly host = inject(ElementRef<HTMLElement>);

  readonly links = input<PublicNavLink[]>(PUBLIC_NAV_LINKS);

  protected readonly menuOpen = signal(false);
  protected readonly overHero = signal(false);
  protected readonly headerState = signal<'visible' | 'hidden'>('visible');

  private readonly toggleButton =
    viewChild<ElementRef<HTMLButtonElement>>('toggleButton');
  private readonly mobileMenu = viewChild<ElementRef<HTMLElement>>('mobileMenu');

  private scrollFrame = 0;
  private lastScrollY = 0;

  constructor() {
    this.router.events
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.closeMenu());

    effect(() => {
      this.heroService.element();
      this.scheduleCheck(true);
    });
  }

  ngAfterViewInit(): void {
    this.lastScrollY = window.scrollY;
    this.handleScroll();
  }

  ngOnDestroy(): void {
    if (this.scrollFrame) {
      cancelAnimationFrame(this.scrollFrame);
    }
  }

  @HostListener('window:scroll')
  private onWindowScroll(): void {
    this.scheduleCheck();
  }

  @HostListener('window:resize')
  private onWindowResize(): void {
    this.scheduleCheck(true);
  }

  @HostListener('document:keydown', ['$event'])
  protected onDocumentKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.closeMenu();
      return;
    }

    if (event.key !== 'Tab' || !this.menuOpen()) {
      return;
    }

    this.trapFocus(event);
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

  protected toggleMenu(): void {
    if (this.menuOpen()) {
      this.closeMenu();
    } else {
      this.openMenu();
    }
  }

  protected openMenu(): void {
    this.menuOpen.set(true);
    this.headerState.set('visible');
    this.lockBodyScroll();
    this.changeDetector.detectChanges();
    this.focusFirstMenuItem();
  }

  protected closeMenu(): void {
    if (!this.menuOpen()) {
      return;
    }

    this.menuOpen.set(false);
    this.unlockBodyScroll();
    this.toggleButton()?.nativeElement.focus();
  }

  private scheduleCheck(immediate = false): void {
    if (immediate) {
      if (this.scrollFrame) {
        cancelAnimationFrame(this.scrollFrame);
        this.scrollFrame = 0;
      }
      this.handleScroll();
      return;
    }

    if (this.scrollFrame) {
      return;
    }
    this.scrollFrame = requestAnimationFrame(() => {
      this.scrollFrame = 0;
      this.handleScroll();
    });
  }

  private handleScroll(): void {
    const scrollY = window.scrollY;

    const hero = this.heroService.element();
    this.overHero.set(hero ? this.isOverHero(hero) : false);

    const delta = scrollY - this.lastScrollY;
    if (this.menuOpen() || scrollY <= HEADER_TOP_OFFSET) {
      this.headerState.set('visible');
    } else if (delta < -DIRECTION_THRESHOLD) {
      this.headerState.set('visible');
    } else if (delta > DIRECTION_THRESHOLD && scrollY > HIDE_AFTER_Y) {
      this.headerState.set('hidden');
    }
    this.lastScrollY = scrollY;
  }

  private isOverHero(hero: HTMLElement): boolean {
    const headerHeight = this.host.nativeElement.getBoundingClientRect().height || 64;
    const rect = hero.getBoundingClientRect();
    return rect.top <= headerHeight && rect.bottom > headerHeight;
  }

  private focusFirstMenuItem(): void {
    const drawer = this.mobileMenu()?.nativeElement;
    const first = drawer?.querySelector<HTMLElement>('a[href], button:not([disabled])');
    first?.focus();
  }

  private trapFocus(event: KeyboardEvent): void {
    const drawer = this.mobileMenu()?.nativeElement;
    if (!drawer) {
      return;
    }

    const focusable = Array.from(
      drawer.querySelectorAll<HTMLElement>('a[href], button:not([disabled])'),
    );
    if (focusable.length === 0) {
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  private lockBodyScroll(): void {
    document.body.style.overflow = 'hidden';
  }

  private unlockBodyScroll(): void {
    document.body.style.overflow = '';
  }
}