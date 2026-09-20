import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { AuthService } from '../../../../core/auth/auth.service';

@Component({
  selector: 'app-oauth-callback',
  standalone: true,
  imports: [RouterLink],
  template: `
    <main class="oauth-callback">
      @if (loading()) {
        <p>Confirmando seu login...</p>
      } @else {
        <p role="alert">{{ errorMessage() }}</p>
        <a routerLink="/login">Voltar para o login</a>
      }
    </main>
  `,
  styles: [`
    :host { display: block; min-height: 100dvh; }
    .oauth-callback { display: grid; place-content: center; gap: 1rem; min-height: 100dvh; padding: 1.5rem; text-align: center; }
    .oauth-callback p { color: #4b5563; }
    .oauth-callback [role='alert'] { color: #b91c1c; }
    .oauth-callback a { color: var(--color-primary); font-weight: 600; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OauthCallbackComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);

  protected readonly loading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);

  ngOnInit(): void {
    const ticket = this.route.snapshot.queryParamMap.get('ticket');

    if (!ticket) {
      void this.router.navigate(['/login'], { queryParams: { oauthError: 'missing_ticket' } });
      return;
    }

    this.authService.exchangeOAuthTicket(ticket).subscribe({
      next: () => void this.router.navigateByUrl('/perfil'),
      error: () => {
        this.loading.set(false);
        this.errorMessage.set('Nao foi possivel confirmar seu login. Tente novamente.');
      },
    });
  }
}