import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { SUBMISSION_ENDPOINTS } from '../../../core/constants/api.constants';
import { ApiResponse, unwrapApiData } from '../../../core/models/api-response.model';
import {
  Submission,
  SubmissionCreatePayload,
  SubmissionFeedback,
  SubmissionReviewPayload,
} from '../models/exercise.model';

@Injectable({
  providedIn: 'root',
})
export class SubmissionService {
  private readonly http = inject(HttpClient);

  listMine(): Observable<Submission[]> {
    return this.http
      .get<ApiResponse<Submission[]>>(this.apiUrl(`${SUBMISSION_ENDPOINTS.list}/mine`))
      .pipe(map(unwrapApiData));
  }

  listAll(params?: { page?: number; size?: number; status?: string }): Observable<Submission[]> {
    return this.http
      .get<ApiResponse<Submission[]>>(this.apiUrl(SUBMISSION_ENDPOINTS.list), {
        params: {
          page: params?.page ?? 0,
          size: params?.size ?? 50,
          ...(params?.status ? { status: params.status } : {}),
        },
      })
      .pipe(map(unwrapApiData));
  }

  listByExercise(exerciseId: string): Observable<Submission[]> {
    return this.http
      .get<ApiResponse<Submission[]>>(
        this.apiUrl(`${SUBMISSION_ENDPOINTS.list}?exerciseId=${exerciseId}`),
      )
      .pipe(map(unwrapApiData));
  }

  getById(id: string): Observable<Submission | null> {
    return this.http
      .get<ApiResponse<Submission>>(this.apiUrl(`${SUBMISSION_ENDPOINTS.detail}/${id}`))
      .pipe(map(unwrapApiData));
  }

  submit(payload: SubmissionCreatePayload): Observable<Submission> {
    return this.http
      .post<ApiResponse<Submission>>(this.apiUrl(SUBMISSION_ENDPOINTS.list), payload)
      .pipe(map(unwrapApiData));
  }

  updateDraft(id: string, payload: SubmissionCreatePayload): Observable<Submission> {
    return this.http
      .patch<ApiResponse<Submission>>(this.apiUrl(`${SUBMISSION_ENDPOINTS.detail}/${id}`), payload)
      .pipe(map(unwrapApiData));
  }

  review(id: string, payload: SubmissionReviewPayload): Observable<Submission> {
    return this.http
      .post<ApiResponse<Submission>>(
        this.apiUrl(`${SUBMISSION_ENDPOINTS.detail}/${id}/review`),
        payload,
      )
      .pipe(map(unwrapApiData));
  }

  getFeedback(submissionId: string): Observable<SubmissionFeedback | null> {
    return this.http
      .get<ApiResponse<SubmissionFeedback>>(
        this.apiUrl(`${SUBMISSION_ENDPOINTS.detail}/${submissionId}/feedback`),
      )
      .pipe(map(unwrapApiData));
  }

  private apiUrl(path: string): string {
    return `${environment.apiUrl}${path}`;
  }
}