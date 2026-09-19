import { Directive, ElementRef, OnInit, OnDestroy, input, inject } from '@angular/core';

/*
 * Revela o elemento ao entrar no viewport (scroll reveal).
 *
 * Uso:
 *   <div appReveal>
 *   <div appReveal appRevealDelay="120">
 *
 * Respeita `prefers-reduced-motion` (elemento já nasce visível).
 */
@Directive({
  selector: '[appReveal]',
  standalone: true,
})
export class RevealDirective implements OnInit, OnDestroy {
  readonly delay = input(0, { alias: 'appRevealDelay' });

  private readonly element = inject(ElementRef<HTMLElement>);
  private observer?: IntersectionObserver;

  ngOnInit(): void {
    const host = this.element.nativeElement;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      host.classList.add('is-revealed');
      return;
    }

    const delay = Number(this.delay());
    if (delay > 0) {
      host.style.transitionDelay = `${delay}ms`;
    }

    this.observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          host.classList.add('is-revealed');
          this.observer?.unobserve(host);
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -48px 0px' },
    );

    this.observer.observe(host);
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }
}