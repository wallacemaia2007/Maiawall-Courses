import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { EXERCISE_ENDPOINTS } from '../../../core/constants/api.constants';
import { ApiResponse, unwrapApiData } from '../../../core/models/api-response.model';
import {
  Exercise,
  ExerciseCreatePayload,
  ExerciseUpdatePayload,
  MultipleChoiceQuestion,
} from '../models/exercise.model';

@Injectable({
  providedIn: 'root',
})
export class ExerciseService {
  private readonly http = inject(HttpClient);

  listByChapter(chapterId: string): Observable<Exercise[]> {
    return this.http
      .get<ApiResponse<Exercise[]>>(this.apiUrl(`${EXERCISE_ENDPOINTS.list}?chapterId=${chapterId}`))
      .pipe(map(unwrapApiData));
  }

  listAll(params?: { page?: number; size?: number }): Observable<Exercise[]> {
    return this.http
      .get<ApiResponse<Exercise[]>>(this.apiUrl(EXERCISE_ENDPOINTS.list), {
        params: {
          page: params?.page ?? 0,
          size: params?.size ?? 50,
        },
      })
      .pipe(map(unwrapApiData));
  }

  listMine(): Observable<Exercise[]> {
    return this.http
      .get<ApiResponse<Exercise[]>>(this.apiUrl(EXERCISE_ENDPOINTS.list))
      .pipe(map(unwrapApiData));
  }

  getById(id: string): Observable<Exercise | null> {
    return this.http
      .get<ApiResponse<Exercise>>(this.apiUrl(`${EXERCISE_ENDPOINTS.detail}/${id}`))
      .pipe(map(unwrapApiData));
  }

  getQuestions(exerciseId: string): Observable<MultipleChoiceQuestion[]> {
    return this.http
      .get<ApiResponse<MultipleChoiceQuestion[]>>(
        this.apiUrl(`${EXERCISE_ENDPOINTS.detail}/${exerciseId}/questions`),
      )
      .pipe(map(unwrapApiData));
  }

  create(payload: ExerciseCreatePayload): Observable<Exercise> {
    return this.http
      .post<ApiResponse<Exercise>>(this.apiUrl(EXERCISE_ENDPOINTS.list), payload)
      .pipe(map(unwrapApiData));
  }

  update(id: string, payload: ExerciseUpdatePayload): Observable<Exercise> {
    return this.http
      .patch<ApiResponse<Exercise>>(
        this.apiUrl(`${EXERCISE_ENDPOINTS.detail}/${id}`),
        payload,
      )
      .pipe(map(unwrapApiData));
  }

  delete(id: string): Observable<void> {
    return this.http
      .delete<ApiResponse<void>>(this.apiUrl(`${EXERCISE_ENDPOINTS.detail}/${id}`))
      .pipe(map(() => void 0));
  }

  private apiUrl(path: string): string {
    return `${environment.apiUrl}${path}`;
  }
}
