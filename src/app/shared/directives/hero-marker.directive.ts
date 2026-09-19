import { Directive, ElementRef, OnDestroy, OnInit, inject } from '@angular/core';

import { HeaderHeroService } from '../../core/services/header-hero.service';

/*
 * Marca a seção hero que fica no topo da página pública.
 *
 * Uso:
 *   <section class="hero" appHeroMarker>
 *
 * Enquanto essa seção cobrir a área do header fixo, o header permanece
 * transparente; ao passar do final dela, o header ganha fundo do tema.
 */
@Directive({
  selector: '[appHeroMarker]',
  standalone: true,
})
export class HeroMarkerDirective implements OnInit, OnDestroy {
  private readonly element = inject(ElementRef<HTMLElement>);
  private readonly heroService = inject(HeaderHeroService);

  ngOnInit(): void {
    this.heroService.registerHero(this.element.nativeElement);
  }

  ngOnDestroy(): void {
    this.heroService.clearHero();
  }
}