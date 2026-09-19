import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { CertificateService } from '../../../certificates/services/certificate.service';

@Component({
  selector: 'app-admin-certificate-list',
  standalone: true,
  templateUrl: './admin-certificate-list.component.html',
  styleUrl: './admin-certificate-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminCertificateListComponent {
  private readonly certificateService = inject(CertificateService);

  protected readonly certificates$ = this.certificateService.listAll();
}