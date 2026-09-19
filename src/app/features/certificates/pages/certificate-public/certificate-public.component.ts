import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { switchMap } from 'rxjs';

import { CertificateService } from '../../services/certificate.service';

@Component({
  selector: 'app-certificate-public',
  standalone: true,
  templateUrl: './certificate-public.component.html',
  styleUrl: './certificate-public.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CertificatePublicComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly certificateService = inject(CertificateService);

  protected readonly validation$ = this.route.paramMap.pipe(
    switchMap((params) => this.certificateService.validate(params.get('code') ?? '')),
  );
}