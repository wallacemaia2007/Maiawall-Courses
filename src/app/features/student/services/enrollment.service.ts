import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { ENROLLMENT_ENDPOINTS } from '../../../core/constants/api.constants';
import { ApiResponse, unwrapApiData } from '../../../core/models/api-response.model';
import { StudentCourseOverview } from '../models/progress.model';

@Injectable({
  providedIn: 'root',
})
export class EnrollmentService {
  private readonly http = inject(HttpClient);

  listMyCourses(): Observable<StudentCourseOverview[]> {
    return this.http
      .get<ApiResponse<StudentCourseOverview[]>>(this.apiUrl(ENROLLMENT_ENDPOINTS.myCourses))
      .pipe(map(unwrapApiData));
  }

  enroll(courseId: string): Observable<StudentCourseOverview> {
    return this.http
      .post<ApiResponse<StudentCourseOverview>>(
        this.apiUrl(`${ENROLLMENT_ENDPOINTS.enroll}/${courseId}`),
        {},
      )
      .pipe(map(unwrapApiData));
  }

  drop(courseId: string): Observable<void> {
    return this.http
      .delete<ApiResponse<void>>(this.apiUrl(`${ENROLLMENT_ENDPOINTS.drop}/${courseId}`))
      .pipe(map(() => void 0));
  }

  private apiUrl(path: string): string {
    return `${environment.apiUrl}${path}`;
  }
}