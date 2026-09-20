import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, map, of, startWith, Subject, switchMap } from 'rxjs';

import { apiErrorMessage } from '../../../../core/models/api-error.model';
import { NotificationService } from '../../../../core/services/notification.service';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { LoadingSpinnerComponent } from '../../../../shared/components/loading-spinner/loading-spinner.component';
import { Certificate } from '../../models/certificate.model';
import { CertificateService } from '../../services/certificate.service';
import { formatDate } from '../../../../shared/utils/date.utils';

interface CertificateListState {
  loading: boolean;
  errorMessage: string;
  certificates: Certificate[];
}

@Component({
  selector: 'app-certificate-list',
  standalone: true,
  imports: [RouterLink, EmptyStateComponent, LoadingSpinnerComponent],
  templateUrl: './certificate-list.component.html',
  styleUrl: './certificate-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CertificateListComponent {
  private readonly certificateService = inject(CertificateService);
  private readonly notificationService = inject(NotificationService);

  private readonly reload$ = new Subject<void>();

  protected readonly copiedCode = signal<string | null>(null);

  protected readonly state = toSignal(
    this.reload$.pipe(
      startWith(null),
      switchMap(() =>
        this.certificateService.listMine().pipe(
          map((certificates) => ({
            loading: false,
            errorMessage: '',
            certificates,
          })),
          catchError((error: unknown) =>
            of({
              loading: false,
              errorMessage: apiErrorMessage(
                error,
                'Não foi possível carregar os certificados. Tente novamente.',
              ),
              certificates: [],
            }),
          ),
        ),
      ),
    ),
    {
      initialValue: {
        loading: true,
        errorMessage: '',
        certificates: [],
      } satisfies CertificateListState,
    },
  );

  protected readonly certificates = computed(() => this.state().certificates);

  protected formatIssuedAt(certificate: Certificate): string {
    return formatDate(certificate.issuedAt);
  }

  protected studentName(certificate: Certificate): string {
    return certificate.studentName ?? certificate.userName ?? '';
  }

  protected statusKind(certificate: Certificate): 'success' | 'warning' | 'danger' {
    const status = certificate.status;

    if (status === 'expired' || status === 'revoked' || status === 'invalid') {
      return status === 'revoked' ? 'danger' : 'warning';
    }

    return 'success';
  }

  protected statusLabel(certificate: Certificate): string {
    const status = certificate.status;

    switch (status) {
      case 'expired':
        return 'Expirado';
      case 'revoked':
        return 'Revogado';
      case 'invalid':
        return 'Inválido';
      default:
        return 'Válido';
    }
  }

  protected publicUrl(certificate: Certificate): string {
    return `${window.location.origin}/certificados/${certificate.code}`;
  }

  protected copyLink(certificate: Certificate): void {
    const url = this.publicUrl(certificate);

    if (navigator.clipboard?.writeText) {
      void navigator.clipboard
        .writeText(url)
        .then(() => {
          this.copiedCode.set(certificate.code);
          this.notificationService.success('Link copiado', url);
        })
        .catch(() => {
          this.notificationService.error('Não foi possível copiar o link');
        });
    } else {
      this.notificationService.error('Seu navegador não suporta copiar automaticamente');
    }
  }

  protected retry(): void {
    this.reload$.next();
  }

  protected trackCertificate(_index: number, certificate: Certificate): string {
    return certificate.id;
  }
}