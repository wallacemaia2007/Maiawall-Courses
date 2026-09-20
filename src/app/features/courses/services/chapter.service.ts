import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { CHAPTER_ENDPOINTS, LESSON_ENDPOINTS } from '../../../core/constants/api.constants';
import { ApiResponse, unwrapApiData } from '../../../core/models/api-response.model';
import {
  ChapterCreatePayload,
  ChapterDetail,
  ChapterUpdatePayload,
  Lesson,
  LessonCreatePayload,
  LessonUpdatePayload,
} from '../models/course.model';

@Injectable({
  providedIn: 'root',
})
export class ChapterService {
  private readonly http = inject(HttpClient);

  getById(id: string): Observable<ChapterDetail | null> {
    return this.http
      .get<ApiResponse<ChapterDetail>>(this.apiUrl(`${CHAPTER_ENDPOINTS.detail}/${id}`))
      .pipe(map(unwrapApiData));
  }

  getBySlug(courseSlug: string, slug: string): Observable<ChapterDetail | null> {
    return this.http
      .get<ApiResponse<ChapterDetail>>(this.apiUrl(`/courses/${courseSlug}/capitulos/${slug}`))
      .pipe(map(unwrapApiData));
  }

  listAll(params?: { page?: number; size?: number }): Observable<ChapterDetail[]> {
    return this.http
      .get<ApiResponse<ChapterDetail[]>>(this.apiUrl(CHAPTER_ENDPOINTS.detail), {
        params: {
          page: params?.page ?? 0,
          size: params?.size ?? 50,
        },
      })
      .pipe(map(unwrapApiData));
  }

  getLesson(lessonId: string): Observable<Lesson | null> {
    return this.http
      .get<ApiResponse<Lesson>>(this.apiUrl(`${LESSON_ENDPOINTS.detail}/${lessonId}`))
      .pipe(map(unwrapApiData));
  }

  create(payload: ChapterCreatePayload): Observable<ChapterDetail> {
    return this.http
      .post<ApiResponse<ChapterDetail>>(this.apiUrl(CHAPTER_ENDPOINTS.detail), payload)
      .pipe(map(unwrapApiData));
  }

  update(id: string, payload: ChapterUpdatePayload): Observable<ChapterDetail> {
    return this.http
      .patch<ApiResponse<ChapterDetail>>(
        this.apiUrl(`${CHAPTER_ENDPOINTS.detail}/${id}`),
        payload,
      )
      .pipe(map(unwrapApiData));
  }

  delete(id: string): Observable<void> {
    return this.http
      .delete<ApiResponse<void>>(this.apiUrl(`${CHAPTER_ENDPOINTS.detail}/${id}`))
      .pipe(map(() => void 0));
  }

  addLesson(payload: LessonCreatePayload): Observable<Lesson> {
    return this.http
      .post<ApiResponse<Lesson>>(this.apiUrl(LESSON_ENDPOINTS.detail), payload)
      .pipe(map(unwrapApiData));
  }

  updateLesson(id: string, payload: LessonUpdatePayload): Observable<Lesson> {
    return this.http
      .patch<ApiResponse<Lesson>>(this.apiUrl(`${LESSON_ENDPOINTS.detail}/${id}`), payload)
      .pipe(map(unwrapApiData));
  }

  deleteLesson(id: string): Observable<void> {
    return this.http
      .delete<ApiResponse<void>>(this.apiUrl(`${LESSON_ENDPOINTS.detail}/${id}`))
      .pipe(map(() => void 0));
  }

  private apiUrl(path: string): string {
    return `${environment.apiUrl}${path}`;
  }
}
