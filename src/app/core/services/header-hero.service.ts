import { Injectable, signal } from '@angular/core';

/*
 * Estado compartilhado sobre a seção hero no topo da página pública.
 *
 * A seção hero se registra ao montar (via marcador `[data-hero]`) e o header
 * fixo consome essa referência para decidir se está "sobre o hero" — ou seja,
 * se deve ficar transparente ou ganhar fundo translúcido do tema.
 */
@Injectable({ providedIn: 'root' })
export class HeaderHeroService {
  private readonly hero = signal<HTMLElement | null>(null);

  readonly element = this.hero.asReadonly();

  registerHero(element: HTMLElement): void {
    this.hero.set(element);
  }

  clearHero(): void {
    this.hero.set(null);
  }
}