import { Routes } from '@angular/router';

/*
 * Rotas públicas do catálogo de cursos (dentro do PublicLayoutComponent).
 *
 *   /cursos
 *   /cursos/:slug
 *   /cursos/:slug/capitulo/:chapterSlug
 *   /cursos/:slug/duvidas
 */
export const COURSES_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/course-list/course-list.component').then((m) => m.CourseListComponent),
  },
  {
    path: 'duvidas',
    redirectTo: '/cursos',
    pathMatch: 'full',
  },
  {
    path: ':slug',
    loadComponent: () =>
      import('./pages/course-details/course-details.component').then(
        (m) => m.CourseDetailsComponent,
      ),
  },
  {
    path: ':slug/duvidas',
    loadComponent: () =>
      import('./pages/course-questions/course-questions.component').then(
        (m) => m.CourseQuestionsComponent,
      ),
  },
  {
    path: ':slug/capitulo/:chapterSlug',
    loadComponent: () =>
      import('./pages/course-chapter/course-chapter.component').then(
        (m) => m.CourseChapterComponent,
      ),
  },
];