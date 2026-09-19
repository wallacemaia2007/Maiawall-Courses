import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { CERTIFICATE_ENDPOINTS } from '../../../core/constants/api.constants';
import { ApiResponse, unwrapApiData } from '../../../core/models/api-response.model';
import {
  Certificate,
  CertificateIssuePayload,
  CertificateValidation,
} from '../models/certificate.model';

@Injectable({
  providedIn: 'root',
})
export class CertificateService {
  private readonly http = inject(HttpClient);

  listMine(): Observable<Certificate[]> {
    return this.http
      .get<ApiResponse<Certificate[]>>(this.apiUrl(CERTIFICATE_ENDPOINTS.mine))
      .pipe(map(unwrapApiData));
  }

  listAll(params?: { page?: number; size?: number }): Observable<Certificate[]> {
    return this.http
      .get<ApiResponse<Certificate[]>>(this.apiUrl(CERTIFICATE_ENDPOINTS.admin), {
        params: {
          page: params?.page ?? 0,
          size: params?.size ?? 50,
        },
      })
      .pipe(map(unwrapApiData));
  }

  validate(code: string): Observable<CertificateValidation> {
    return this.http
      .get<ApiResponse<CertificateValidation>>(
        this.apiUrl(`${CERTIFICATE_ENDPOINTS.publicValidation}/${code}`),
      )
      .pipe(map(unwrapApiData));
  }

  issue(payload: CertificateIssuePayload): Observable<Certificate> {
    return this.http
      .post<ApiResponse<Certificate>>(this.apiUrl(CERTIFICATE_ENDPOINTS.mine), payload)
      .pipe(map(unwrapApiData));
  }

  private apiUrl(path: string): string {
    return `${environment.apiUrl}${path}`;
  }
}