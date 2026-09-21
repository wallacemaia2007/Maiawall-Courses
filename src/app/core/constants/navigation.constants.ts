/*
 * Fonte de verdade da navegação pública do Maiawall Cursos.
 *
 * Compartilhada entre o header (navbar) e o footer para evitar links hardcoded
 * em vários lugares. As rotas abaixo existem em `src/app/app.routes.ts`.
 */
export interface PublicNavLink {
  label: string;
  route: string;
  fragment?: string;
}

export const PUBLIC_NAV_LINKS: PublicNavLink[] = [{ label: 'Cursos', route: '/cursos' }];
