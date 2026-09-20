import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { ApiResponse, unwrapApiData } from '../../../core/models/api-response.model';

export type ChapterLearningStatus = 'not-started' | 'in-progress' | 'completed';
export interface ChapterLearningProgress { chapterId: string; status: ChapterLearningStatus; completedAt?: string; }
export interface LearningOverview {
  startedCourses: Array<{ course: { id: string; title: string; slug: string; thumbnailUrl?: string }; completedChapters: number; lastChapter: { id: string; title: string; slug: string; completedAt?: string } | null }>;
}

@Injectable({ providedIn: 'root' })
export class LearningService {
  private readonly http = inject(HttpClient);
  overview(): Observable<LearningOverview> { return this.http.get<ApiResponse<LearningOverview>>(`${environment.apiUrl}/learning/me`).pipe(map(unwrapApiData)); }
  courseProgress(courseId: string): Observable<ChapterLearningProgress[]> { return this.http.get<ApiResponse<ChapterLearningProgress[]>>(`${environment.apiUrl}/learning/courses/${courseId}/progress`).pipe(map(unwrapApiData)); }
  markRead(chapterId: string): Observable<ChapterLearningProgress> { return this.update(chapterId, 'in-progress'); }
  markComplete(chapterId: string): Observable<ChapterLearningProgress> { return this.update(chapterId, 'completed'); }
  private update(chapterId: string, status: 'in-progress' | 'completed'): Observable<ChapterLearningProgress> { return this.http.patch<ApiResponse<ChapterLearningProgress>>(`${environment.apiUrl}/learning/chapters/${chapterId}`, { status }).pipe(map(unwrapApiData)); }
}
