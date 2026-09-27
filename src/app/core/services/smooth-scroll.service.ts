import { isPlatformBrowser } from '@angular/common';
import {
  Injectable,
  Injector,
  NgZone,
  OnDestroy,
  PLATFORM_ID,
  afterNextRender,
  inject,
} from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import Lenis, { ScrollToOptions } from 'lenis';
import { Subscription, filter } from 'rxjs';

/** Ease-out expo — mesmo feel do projeto Next.js (Meus-Servicos-Website). */
export const lenisEaseOutExpo = (t: number): number => Math.min(1, 1.001 - Math.pow(2, -10 * t));

export const LENIS_SCROLL_CONFIG = {
  duration: 1.2,
  easing: lenisEaseOutExpo,
  smoothWheel: true,
  syncTouch: false,
  wheelMultiplier: 1,
  autoRaf: false,
  allowNestedScroll: true,
  respectReducedMotion: true,
  stopInertiaOnNavigate: true,
} as const;

type ScrollTarget = Parameters<Lenis['scrollTo']>[0];

@Injectable({
  providedIn: 'root',
})
export class SmoothScrollService implements OnDestroy {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly ngZone = inject(NgZone);
  private readonly injector = inject(Injector);
  private readonly router = inject(Router);

  private lenis: Lenis | null = null;
  private rafId: number | null = null;
  private routerSubscription?: Subscription;

  initialize(): void {
    if (!isPlatformBrowser(this.platformId) || this.lenis) {
      return;
    }

    this.lenis = new Lenis(LENIS_SCROLL_CONFIG);
    this.startRafLoop();
    this.bindRouterScrollSync();
  }

  scrollTo(target: ScrollTarget, options?: ScrollToOptions): void {
    this.lenis?.scrollTo(target, options);
  }

  stop(): void {
    this.lenis?.stop();
  }

  start(): void {
    this.lenis?.start();
  }

  destroy(): void {
    this.routerSubscription?.unsubscribe();
    this.routerSubscription = undefined;

    this.stopRafLoop();

    this.lenis?.destroy();
    this.lenis = null;
  }

  ngOnDestroy(): void {
    this.destroy();
  }

  private startRafLoop(): void {
    this.ngZone.runOutsideAngular(() => {
      const loop = (time: number): void => {
        this.lenis?.raf(time);
        this.rafId = requestAnimationFrame(loop);
      };

      this.rafId = requestAnimationFrame(loop);
    });
  }

  private stopRafLoop(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  private bindRouterScrollSync(): void {
    this.routerSubscription = this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe(() => {
        afterNextRender(
          () => {
            this.syncScrollAfterNavigation();
            this.lenis?.resize();
          },
          { injector: this.injector },
        );
      });
  }

  private syncScrollAfterNavigation(): void {
    const fragment = this.router.parseUrl(this.router.url).fragment;

    if (fragment) {
      const target = document.getElementById(fragment);
      if (target) {
        this.scrollTo(target);
        return;
      }
    }

    this.scrollTo(0, { immediate: true });
  }
}
