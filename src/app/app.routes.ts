import { Routes } from '@angular/router';

import { authChildGuard, authGuard } from './core/guards/auth.guard';
import { guestChildGuard, guestGuard } from './core/guards/guest.guard';
import { roleChildGuard, roleGuard } from './core/guards/role.guard';

/*
 * Mapa de rotas da aplicação.
 *
 * Públicas  : /  /cursos  /cursos/:slug  /cursos/:slug/capitulo/:chapterSlug  /certificados/:code
 * Auth      : /login  /signup  /forgot-password  /reset-password  /verify-email
 * Usuário   : /app/dashboard  /app/cursos  /app/capitulo/:id  /app/exercicios  /app/submissoes  /app/certificados  /app/perfil
 * Admin     : /admin/...
 */
export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./layouts/public-layout/public-layout.component').then(
        (m) => m.PublicLayoutComponent,
      ),
    children: [
      {
        path: '',
        pathMatch: 'full',
        loadComponent: () =>
          import('./features/home/pages/home/home.component').then((m) => m.HomeComponent),
      },
      {
        path: 'cursos',
        loadChildren: () =>
          import('./features/courses/courses.routes').then((m) => m.COURSES_ROUTES),
      },
      {
        path: 'certificados/:code',
        loadComponent: () =>
          import('./features/certificates/pages/certificate-public/certificate-public.component').then(
            (m) => m.CertificatePublicComponent,
          ),
      },
    ],
  },
  {
    path: '',
    canActivate: [guestGuard],
    canActivateChild: [guestChildGuard],
    loadComponent: () =>
      import('./layouts/auth-layout/auth-layout.component').then(
        (m) => m.AuthLayoutComponent,
      ),
    children: [
      {
        path: 'login',
        loadComponent: () =>
          import('./features/auth/pages/login/login.component').then((m) => m.LoginComponent),
      },
      {
        path: 'signup',
        loadComponent: () =>
          import('./features/auth/pages/signup/signup.component').then((m) => m.SignupComponent),
      },
      {
        path: 'forgot-password',
        loadComponent: () =>
          import('./features/auth/pages/forgot-password/forgot-password.component').then(
            (m) => m.ForgotPasswordComponent,
          ),
      },
      {
        path: 'reset-password',
        loadComponent: () =>
          import('./features/auth/pages/reset-password/reset-password.component').then(
            (m) => m.ResetPasswordComponent,
          ),
      },
      {
        path: 'verify-email',
        loadComponent: () =>
          import('./features/auth/pages/verify-email/verify-email.component').then(
            (m) => m.VerifyEmailComponent,
          ),
      },
    ],
  },
  {
    path: 'app',
    canActivate: [authGuard],
    canActivateChild: [authChildGuard],
    loadChildren: () =>
      import('./features/student/student.routes').then((m) => m.STUDENT_ROUTES),
  },
  {
    path: 'admin',
    canActivate: [authGuard, roleGuard(['ADMIN', 'INSTRUCTOR'])],
    canActivateChild: [authChildGuard, roleChildGuard(['ADMIN', 'INSTRUCTOR'])],
    loadChildren: () =>
      import('./features/admin/admin.routes').then((m) => m.ADMIN_ROUTES),
  },
  {
    path: 'not-found',
    loadComponent: () =>
      import('./features/not-found/pages/not-found/not-found.component').then(
        (m) => m.NotFoundComponent,
      ),
  },
  {
    path: '**',
    redirectTo: 'not-found',
  },
];