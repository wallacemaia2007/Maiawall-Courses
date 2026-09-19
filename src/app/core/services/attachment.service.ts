import { HttpClient, HttpEvent, HttpRequest } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { environment } from '../../../environments/environment';
import { ATTACHMENT_ENDPOINTS } from '../constants/api.constants';
import { ApiResponse, unwrapApiData } from '../models/api-response.model';
import {
  Attachment,
  AttachmentDownloadInfo,
  AttachmentUploadPayload,
} from '../models/attachment.model';

/*
 * Upload/download de anexos (PDF, ZIP, código, imagens, arquivos auxiliares).
 * Transversal: usado por aulas, submissões de exercícios e certificados.
 * Prepara o consumo de um storage externo (ex.: S3) — o contrato final será
 * definido pelo backend; aqui fica apenas a estrutura.
 */
@Injectable({
  providedIn: 'root',
})
export class AttachmentService {
  private readonly http = inject(HttpClient);

  createAttachment(payload: AttachmentUploadPayload): Observable<Attachment> {
    return this.http
      .post<ApiResponse<Attachment>>(this.apiUrl(ATTACHMENT_ENDPOINTS.create), payload)
      .pipe(map(unwrapApiData));
  }

  uploadFile(file: File): Observable<Attachment> {
    const formData = new FormData();
    formData.append('file', file);

    return this.http
      .post<ApiResponse<Attachment>>(this.apiUrl(ATTACHMENT_ENDPOINTS.create), formData)
      .pipe(map(unwrapApiData));
  }

  downloadAttachment(id: string): Observable<Blob> {
    return this.http.get(this.apiUrl(`${ATTACHMENT_ENDPOINTS.download}/${id}`), {
      responseType: 'blob',
    });
  }

  requestDownloadUrl(id: string): Observable<AttachmentDownloadInfo> {
    return this.http
      .get<ApiResponse<AttachmentDownloadInfo>>(
        this.apiUrl(`${ATTACHMENT_ENDPOINTS.download}/${id}`),
      )
      .pipe(map(unwrapApiData));
  }

  uploadWithProgress(
    file: File,
  ): Observable<HttpEvent<ApiResponse<Attachment>>> {
    const formData = new FormData();
    formData.append('file', file);

    const request = new HttpRequest<FormData>(
      'POST',
      this.apiUrl(ATTACHMENT_ENDPOINTS.create),
      formData,
      {
        reportProgress: true,
      },
    );

    return this.http.request(request);
  }

  private apiUrl(path: string): string {
    return `${environment.apiUrl}${path}`;
  }
}