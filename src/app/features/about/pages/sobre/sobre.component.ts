import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  inject,
} from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { gsap } from 'gsap';

import { COURSE_INSTRUCTOR } from '../../../../core/constants/instructor.data';

const PAGE_TITLE = 'Sobre o Wallace — Maiawall Cursos';
const PAGE_DESCRIPTION =
  'Conheça o Wallace, full-stack developer por trás da Maiawall Cursos. Angular, Spring Boot, Node.js/Express, AWS e Firebase na prática de projetos reais.';

@Component({
  selector: 'app-sobre',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './sobre.component.html',
  styleUrls: ['./sobre.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SobreComponent implements OnInit, AfterViewInit, OnDestroy {
  protected readonly instructor = COURSE_INSTRUCTOR;

  private readonly hostRef = inject(ElementRef<HTMLElement>);
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);

  private ctx?: gsap.Context;
  private pointerCleanup?: () => void;

  ngOnInit(): void {
    this.title.setTitle(PAGE_TITLE);
    this.meta.updateTag({ name: 'description', content: PAGE_DESCRIPTION });
    this.meta.updateTag({ property: 'og:title', content: PAGE_TITLE });
    this.meta.updateTag({ property: 'og:description', content: PAGE_DESCRIPTION });
  }

  ngAfterViewInit(): void {
    const host: HTMLElement = this.hostRef.nativeElement;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    this.ctx = gsap.context(() => {
      const animEls = host.querySelectorAll<HTMLElement>('[data-sobre-anim]');

      if (reduced) {
        gsap.set(animEls, { clearProps: 'all' });
        return;
      }

      gsap.fromTo(
        animEls,
        { y: 28, filter: 'blur(4px)' },
        {
          y: 0,
          filter: 'blur(0px)',
          duration: 0.7,
          ease: 'power2.out',
          stagger: 0.09,
          clearProps: 'transform,filter',
        },
      );

      const photo = host.querySelector<HTMLElement>('[data-sobre-bg-photo]');
      if (photo) {
        gsap.fromTo(photo, { scale: 1.18 }, { scale: 1.02, duration: 1.4, ease: 'power2.out' });
      }

      if (window.matchMedia('(pointer: fine)').matches) {
        this.bindParallax(host, photo);
      }
    }, host);
  }

  ngOnDestroy(): void {
    this.ctx?.revert();
    this.pointerCleanup?.();
  }

  private bindParallax(host: HTMLElement, photo: HTMLElement | null): void {
    if (!photo) return;

    const RANGE = 16;
    const fromX = gsap.quickTo(photo, 'x', { duration: 1.1, ease: 'power3.out' });
    const fromY = gsap.quickTo(photo, 'y', { duration: 1.1, ease: 'power3.out' });

    const onMove = (event: PointerEvent): void => {
      const nx = event.clientX / window.innerWidth - 0.5;
      const ny = event.clientY / window.innerHeight - 0.5;
      fromX(nx * RANGE);
      fromY(ny * RANGE * 0.5);
    };

    host.addEventListener('pointermove', onMove, { passive: true });
    this.pointerCleanup = () => host.removeEventListener('pointermove', onMove);
  }
}
