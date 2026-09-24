import { Routes } from '@angular/router';

/*
 * Rotas da área administrativa (protegidas por authGuard + roleGuard ADMIN/INSTRUCTOR).
 *
 *   /admin/dashboard
 *   /admin/cursos  /admin/cursos/:id
 *   /admin/capitulos
 *   /admin/exercicios
 *   /admin/alunos
 *   /admin/submissoes
 *   /admin/certificados
 *   /admin/duvidas
 */
export const ADMIN_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./layout/admin-layout.component').then((m) => m.AdminLayoutComponent),
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'dashboard',
      },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./pages/admin-dashboard/admin-dashboard.component').then(
            (m) => m.AdminDashboardComponent,
          ),
      },
      {
        path: 'cursos',
        loadComponent: () =>
          import('./pages/admin-course-list/admin-course-list.component').then(
            (m) => m.AdminCourseListComponent,
          ),
      },
      {
        path: 'cursos/:id',
        loadComponent: () =>
          import('./pages/admin-course-detail/admin-course-detail.component').then(
            (m) => m.AdminCourseDetailComponent,
          ),
      },
      {
        path: 'capitulos',
        loadComponent: () =>
          import('./pages/admin-chapter-list/admin-chapter-list.component').then(
            (m) => m.AdminChapterListComponent,
          ),
      },
      {
        path: 'exercicios',
        loadComponent: () =>
          import('./pages/admin-exercise-list/admin-exercise-list.component').then(
            (m) => m.AdminExerciseListComponent,
          ),
      },
      {
        path: 'alunos',
        loadComponent: () =>
          import('./pages/admin-student-list/admin-student-list.component').then(
            (m) => m.AdminStudentListComponent,
          ),
      },
      {
        path: 'submissoes',
        loadComponent: () =>
          import('./pages/admin-submission-list/admin-submission-list.component').then(
            (m) => m.AdminSubmissionListComponent,
          ),
      },
      {
        path: 'certificados',
        loadComponent: () =>
          import('./pages/admin-certificate-list/admin-certificate-list.component').then(
            (m) => m.AdminCertificateListComponent,
          ),
      },
      {
        path: 'duvidas',
        loadComponent: () =>
          import('./pages/admin-question-list/admin-question-list.component').then(
            (m) => m.AdminQuestionListComponent,
          ),
      },
    ],
  },
];