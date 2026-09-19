import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { CertificateService } from '../../services/certificate.service';

@Component({
  selector: 'app-certificate-list',
  standalone: true,
  templateUrl: './certificate-list.component.html',
  styleUrl: './certificate-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CertificateListComponent {
  private readonly certificateService = inject(CertificateService);

  protected readonly certificates$ = this.certificateService.listMine();
}