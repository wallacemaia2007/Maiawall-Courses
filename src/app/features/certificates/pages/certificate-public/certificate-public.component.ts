import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { catchError, map, of, switchMap } from 'rxjs';
import { toSignal } from '@angular/core/rxjs-interop';

import { toApiError } from '../../../../core/models/api-error.model';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { LoadingSpinnerComponent } from '../../../../shared/components/loading-spinner/loading-spinner.component';
import { CertificateValidation } from '../../models/certificate.model';
import { CertificateService } from '../../services/certificate.service';

interface CertificatePublicState {
  validation: CertificateValidation | null;
  code: string;
  loading: boolean;
  errorMessage: string;
}

@Component({
  selector: 'app-certificate-public',
  standalone: true,
  imports: [DatePipe, RouterLink, EmptyStateComponent, LoadingSpinnerComponent],
  templateUrl: './certificate-public.component.html',
  styleUrl: './certificate-public.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CertificatePublicComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly certificateService = inject(CertificateService);

  protected readonly state = toSignal(
    this.route.paramMap.pipe(
      switchMap((params) => {
        const code = params.get('code') ?? '';

        return this.certificateService.validate(code).pipe(
          map((validation) => ({
            validation,
            code,
            loading: false,
            errorMessage: '',
          })),
          catchError((error: unknown) =>
            of({
              validation: null,
              code,
              loading: false,
              errorMessage: toApiError(error).message,
            }),
          ),
        );
      }),
    ),
    {
      initialValue: {
        validation: null,
        code: '',
        loading: true,
        errorMessage: '',
      } satisfies CertificatePublicState,
    },
  );

  protected readonly validation = computed(() => this.state().validation);

  protected readonly status = computed(() => {
    const validation = this.state().validation;
    const certificate = validation?.certificate;

    if (!validation?.valid) {
      return validation?.status ?? certificate?.status ?? 'invalid';
    }

    return certificate?.status ?? validation.status ?? 'valid';
  });

  protected readonly isValid = computed(() => this.state().validation?.valid === true);

  protected readonly statusLabel = computed(() => {
    const status = this.status();

    if (status === 'expired') {
      return 'Certificado expirado';
    }

    if (status === 'revoked') {
      return 'Certificado revogado';
    }

    if (status === 'invalid') {
      return 'Certificado invalido';
    }

    return this.isValid() ? 'Certificado valido' : 'Validacao pendente';
  });

  protected readonly studentName = computed(() => {
    const certificate = this.state().validation?.certificate;
    return certificate?.studentName ?? certificate?.userName ?? '';
  });
}
