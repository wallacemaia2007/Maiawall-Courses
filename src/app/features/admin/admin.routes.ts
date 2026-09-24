import { Routes } from '@angular/router';

/*
 * Rotas da área administrativa (protegidas por authGuard + roleGuard ADMIN).
 *
 *   /admin/dashboard
 *   /admin/leads
 *   /admin/cursos
 *   /admin/acessos
 *   /admin/alunos
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
        path: 'leads',
        loadComponent: () =>
          import('./pages/admin-lead-list/admin-lead-list.component').then(
            (m) => m.AdminLeadListComponent,
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
        path: 'acessos',
        loadComponent: () =>
          import('./pages/admin-access-list/admin-access-list.component').then(
            (m) => m.AdminAccessListComponent,
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
        path: 'duvidas',
        loadComponent: () =>
          import('./pages/admin-question-list/admin-question-list.component').then(
            (m) => m.AdminQuestionListComponent,
          ),
      },
    ],
  },
];
