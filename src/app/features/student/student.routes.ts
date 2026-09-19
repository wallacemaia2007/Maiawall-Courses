import { Routes } from '@angular/router';

/*
 * Rotas da área do aluno (dentro do AppLayoutComponent, protegidas por authGuard).
 *
 *   /app/dashboard
 *   /app/cursos
 *   /app/cursos/:id
 *   /app/capitulo/:id
 *   /app/exercicios
 *   /app/exercicios/:id
 *   /app/submissoes
 *   /app/submissoes/:id
 *   /app/certificados
 *   /app/perfil
 */
export const STUDENT_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('../../layouts/app-layout/app-layout.component').then(
        (m) => m.AppLayoutComponent,
      ),
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'dashboard',
      },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./pages/student-dashboard/student-dashboard.component').then(
            (m) => m.StudentDashboardComponent,
          ),
      },
      {
        path: 'cursos',
        loadComponent: () =>
          import('./pages/student-courses/student-courses.component').then(
            (m) => m.StudentCoursesComponent,
          ),
      },
      {
        path: 'cursos/:id',
        loadComponent: () =>
          import('./pages/student-course-detail/student-course-detail.component').then(
            (m) => m.StudentCourseDetailComponent,
          ),
      },
      {
        path: 'capitulo/:id',
        loadComponent: () =>
          import('./pages/student-chapter/student-chapter.component').then(
            (m) => m.StudentChapterComponent,
          ),
      },
      {
        path: 'exercicios',
        loadComponent: () =>
          import('../exercises/pages/exercise-list/exercise-list.component').then(
            (m) => m.ExerciseListComponent,
          ),
      },
      {
        path: 'exercicios/:id',
        loadComponent: () =>
          import('../exercises/pages/exercise-answer/exercise-answer.component').then(
            (m) => m.ExerciseAnswerComponent,
          ),
      },
      {
        path: 'submissoes',
        loadComponent: () =>
          import('../exercises/pages/submission-list/submission-list.component').then(
            (m) => m.SubmissionListComponent,
          ),
      },
      {
        path: 'submissoes/:id',
        loadComponent: () =>
          import('../exercises/pages/submission-detail/submission-detail.component').then(
            (m) => m.SubmissionDetailComponent,
          ),
      },
      {
        path: 'certificados',
        loadComponent: () =>
          import('../certificates/pages/certificate-list/certificate-list.component').then(
            (m) => m.CertificateListComponent,
          ),
      },
      {
        path: 'perfil',
        loadComponent: () =>
          import('../profile/pages/profile/profile.component').then((m) => m.ProfileComponent),
      },
    ],
  },
];