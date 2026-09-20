import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { PROGRESS_ENDPOINTS } from '../../../core/constants/api.constants';
import { ApiResponse, unwrapApiData } from '../../../core/models/api-response.model';
import {
  ChapterProgress,
  CourseProgress,
  ExerciseProgress,
} from '../models/progress.model';

@Injectable({
  providedIn: 'root',
})
export class ProgressService {
  private readonly http = inject(HttpClient);

  getCourseProgress(courseId: string): Observable<CourseProgress | null> {
    return this.http
      .get<ApiResponse<CourseProgress>>(
        this.apiUrl(`${PROGRESS_ENDPOINTS.course}/${courseId}`),
      )
      .pipe(map(unwrapApiData));
  }

  listMyCoursesProgress(): Observable<CourseProgress[]> {
    return this.http
      .get<ApiResponse<CourseProgress[]>>(this.apiUrl(PROGRESS_ENDPOINTS.course))
      .pipe(map(unwrapApiData));
  }

  getChapterProgress(chapterId: string): Observable<ChapterProgress | null> {
    return this.http
      .get<ApiResponse<ChapterProgress>>(
        this.apiUrl(`${PROGRESS_ENDPOINTS.chapter}/${chapterId}`),
      )
      .pipe(map(unwrapApiData));
  }

  markChapterComplete(chapterId: string): Observable<ChapterProgress | null> {
    return this.http
      .patch<ApiResponse<ChapterProgress>>(this.apiUrl(`${PROGRESS_ENDPOINTS.chapter}/${chapterId}`), {
        status: 'completed',
      })
      .pipe(map(unwrapApiData));
  }

  markLessonComplete(chapterId: string): Observable<ChapterProgress | null> {
    return this.markChapterComplete(chapterId);
  }

  listExerciseProgress(): Observable<ExerciseProgress[]> {
    return this.http
      .get<ApiResponse<ExerciseProgress[]>>(this.apiUrl(PROGRESS_ENDPOINTS.exercise))
      .pipe(map(unwrapApiData));
  }

  private apiUrl(path: string): string {
    return `${environment.apiUrl}${path}`;
  }
}
