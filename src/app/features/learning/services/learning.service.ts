import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { ApiResponse, unwrapApiData } from '../../../core/models/api-response.model';

export type ChapterLearningStatus = 'not-started' | 'in-progress' | 'completed';
export interface ChapterLearningProgress {
  chapterId: string;
  status: ChapterLearningStatus;
  completedAt?: string;
}
export interface LearningChapterReference {
  id: string;
  title: string;
  slug: string;
  order: number;
  completedAt?: string;
}

export interface StartedCourse {
  course: {
    id: string;
    title: string;
    slug: string;
    shortDescription?: string;
    bannerUrl?: string;
    thumbnailUrl?: string;
    category?: string;
    level?: string;
    durationMinutes?: number;
    totalChapters: number;
  };
  completedChapters: number;
  progressPercentage: number;
  lastActivityAt?: string;
  lastChapter: LearningChapterReference | null;
  resumeChapter: LearningChapterReference | null;
}

export interface RecentCompletedChapter {
  course: { id: string; title: string; slug: string };
  chapter: LearningChapterReference;
  completedAt: string;
}

export interface LearningOverview {
  startedCourses: StartedCourse[];
  recentCompletedChapters: RecentCompletedChapter[];
}

@Injectable({ providedIn: 'root' })
export class LearningService {
  private readonly http = inject(HttpClient);
  overview(): Observable<LearningOverview> {
    return this.http
      .get<ApiResponse<LearningOverview>>(`${environment.apiUrl}/learning/me`)
      .pipe(map(unwrapApiData));
  }
  courseProgress(courseId: string): Observable<ChapterLearningProgress[]> {
    return this.http
      .get<ApiResponse<ChapterLearningProgress[]>>(
        `${environment.apiUrl}/learning/courses/${courseId}/progress`,
      )
      .pipe(map(unwrapApiData));
  }
  markRead(chapterId: string): Observable<ChapterLearningProgress> {
    return this.update(chapterId, 'in-progress');
  }
  markComplete(chapterId: string): Observable<ChapterLearningProgress> {
    return this.update(chapterId, 'completed');
  }
  private update(
    chapterId: string,
    status: 'in-progress' | 'completed',
  ): Observable<ChapterLearningProgress> {
    return this.http
      .patch<ApiResponse<ChapterLearningProgress>>(
        `${environment.apiUrl}/learning/chapters/${chapterId}`,
        { status },
      )
      .pipe(map(unwrapApiData));
  }
}
