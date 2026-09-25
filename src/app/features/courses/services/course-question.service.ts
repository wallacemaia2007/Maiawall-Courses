import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { QUESTION_ENDPOINTS } from '../../../core/constants/api.constants';
import { ApiResponse, unwrapApiData } from '../../../core/models/api-response.model';
import {
  CourseQuestion,
  CourseQuestionAnswerPayload,
  CourseQuestionCreatePayload,
  CourseQuestionGroup,
} from '../models/course-question.model';

@Injectable({ providedIn: 'root' })
export class CourseQuestionService {
  private readonly http = inject(HttpClient);

  listPublished(courseId: string): Observable<CourseQuestion[]> {
    return this.http
      .get<ApiResponse<CourseQuestion[]>>(this.apiUrl(QUESTION_ENDPOINTS.byCourse(courseId)))
      .pipe(map(unwrapApiData));
  }

  send(courseId: string, payload: CourseQuestionCreatePayload): Observable<CourseQuestion> {
    return this.http
      .post<ApiResponse<CourseQuestion>>(this.apiUrl(QUESTION_ENDPOINTS.byCourse(courseId)), payload)
      .pipe(map(unwrapApiData));
  }

  listForAdmin(): Observable<CourseQuestion[]> {
    return this.http
      .get<ApiResponse<CourseQuestion[]>>(this.apiUrl(QUESTION_ENDPOINTS.admin))
      .pipe(map(unwrapApiData));
  }

  listFeatured(courseId: string): Observable<CourseQuestion[]> {
    return this.listPublished(courseId).pipe(
      map((questions) => questions.filter((question) => question.featured)),
    );
  }

  listFeaturedGroups(): Observable<CourseQuestionGroup[]> {
    return this.http
      .get<ApiResponse<CourseQuestionGroup[]>>(this.apiUrl(QUESTION_ENDPOINTS.featured))
      .pipe(map(unwrapApiData));
  }

  answer(questionId: string, payload: CourseQuestionAnswerPayload): Observable<CourseQuestion> {
    return this.http
      .patch<ApiResponse<CourseQuestion>>(
        this.apiUrl(`${QUESTION_ENDPOINTS.admin}/${questionId}`),
        payload,
      )
      .pipe(map(unwrapApiData));
  }

  toggleFeatured(questionId: string, featured: boolean): Observable<CourseQuestion> {
    return this.http
      .patch<ApiResponse<CourseQuestion>>(
        this.apiUrl(QUESTION_ENDPOINTS.adminFeatured(questionId)),
        { featured },
      )
      .pipe(map(unwrapApiData));
  }

  private apiUrl(path: string): string {
    return `${environment.apiUrl}${path}`;
  }
}
