import { Routes } from '@angular/router';

import { authGuard } from './core/guards/auth.guard';
import { guestChildGuard, guestGuard } from './core/guards/guest.guard';

/*
 * Mapa de rotas da aplicação.
 *
 * Públicas  : /  /sobre  /cursos  /cursos/:slug  /cursos/:slug/capitulo/:chapterSlug
 * Auth      : /login  /signup  /forgot-password  /reset-password  /verify-email  /auth/callback
 * Usuário   : /perfil
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
        path: 'sobre',
        loadComponent: () =>
          import('./features/about/pages/sobre/sobre.component').then((m) => m.SobreComponent),
      },
      {
        path: 'cursos',
        loadChildren: () =>
          import('./features/courses/courses.routes').then((m) => m.COURSES_ROUTES),
      },
      {
        path: 'perfil',
        canActivate: [authGuard],
        loadComponent: () =>
          import('./features/profile/pages/profile/profile.component').then((m) => m.ProfileComponent),
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
      {
        path: 'auth/callback',
        loadComponent: () =>
          import('./features/auth/pages/oauth-callback/oauth-callback.component').then(
            (m) => m.OauthCallbackComponent,
          ),
      },
    ],
  },
  {
    path: 'not-found',
    loadComponent: () =>
      import('./features/not-found/pages/not-found/not-found.component').then(
        (m) => m.NotFoundComponent,
      ),
  },
  {
    path: 'auth/callback',
    loadComponent: () =>
      import('./features/auth/pages/oauth-callback/oauth-callback.component').then(
        (m) => m.OauthCallbackComponent,
      ),
  },
  {
    path: 'auth/callback',
    loadComponent: () =>
      import('./features/auth/pages/oauth-callback/oauth-callback.component').then(
        (m) => m.OauthCallbackComponent,
      ),
  },
  {
    path: '**',
    redirectTo: 'not-found',
  },
];
