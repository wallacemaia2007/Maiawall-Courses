import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { COURSE_ENDPOINTS } from '../../../core/constants/api.constants';
import { ApiResponse, unwrapApiData } from '../../../core/models/api-response.model';
import { Page } from '../../../core/models/pagination.model';
import {
  Course,
  CourseCreatePayload,
  CourseDetail,
  CourseSummary,
  CourseUpdatePayload,
} from '../models/course.model';

@Injectable({
  providedIn: 'root',
})
export class CourseService {
  private readonly http = inject(HttpClient);

  list(params?: { page?: number; size?: number; keyword?: string }): Observable<Page<CourseSummary>> {
    const httpParams = new HttpParams()
      .set('page', params?.page ?? 0)
      .set('size', params?.size ?? 12);

    const query =
      params?.keyword !== undefined && params.keyword !== ''
        ? httpParams.set('search', params.keyword)
        : httpParams;

    return this.http
      .get<ApiResponse<Page<CourseSummary>>>(this.apiUrl(COURSE_ENDPOINTS.list), { params: query })
      .pipe(map(unwrapApiData));
  }

  getBySlug(slug: string): Observable<CourseDetail | null> {
    return this.http
      .get<ApiResponse<CourseDetail>>(this.apiUrl(`${COURSE_ENDPOINTS.detail}/slug/${slug}`))
      .pipe(map(unwrapApiData));
  }

  getFeatured(limit = 3): Observable<CourseSummary[]> {
    return this.list({ size: limit }).pipe(map((page) => page.content));
  }

  getById(id: string): Observable<CourseDetail | null> {
    return this.http
      .get<ApiResponse<CourseDetail>>(this.apiUrl(`${COURSE_ENDPOINTS.detail}/${id}`))
      .pipe(map(unwrapApiData));
  }

  create(payload: CourseCreatePayload): Observable<Course> {
    return this.http
      .post<ApiResponse<Course>>(this.apiUrl(COURSE_ENDPOINTS.list), payload)
      .pipe(map(unwrapApiData));
  }

  update(id: string, payload: CourseUpdatePayload): Observable<Course> {
    return this.http
      .patch<ApiResponse<Course>>(this.apiUrl(`${COURSE_ENDPOINTS.detail}/${id}`), payload)
      .pipe(map(unwrapApiData));
  }

  delete(id: string): Observable<void> {
    return this.http
      .delete<ApiResponse<void>>(this.apiUrl(`${COURSE_ENDPOINTS.detail}/${id}`))
      .pipe(map(() => void 0));
  }

  private apiUrl(path: string): string {
    return `${environment.apiUrl}${path}`;
  }
}
