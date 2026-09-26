import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { ADMIN_ENDPOINTS } from '../../../core/constants/api.constants';
import { ApiResponse, unwrapApiData } from '../../../core/models/api-response.model';
import {
  AdminAccessEntry,
  AdminAnalytics,
  AdminCourse,
  AdminDashboard,
  AdminStudent,
  Lead,
  LeadPayload,
} from '../models/admin.model';

@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly http = inject(HttpClient);

  dashboard(): Observable<AdminDashboard> {
    return this.get<AdminDashboard>(ADMIN_ENDPOINTS.dashboard);
  }

  analytics(): Observable<AdminAnalytics> {
    return this.get<AdminAnalytics>(ADMIN_ENDPOINTS.analytics);
  }

  courses(): Observable<AdminCourse[]> {
    return this.get<AdminCourse[]>(ADMIN_ENDPOINTS.courses);
  }

  students(): Observable<AdminStudent[]> {
    return this.get<AdminStudent[]>(ADMIN_ENDPOINTS.students);
  }

  accessList(): Observable<AdminAccessEntry[]> {
    return this.get<AdminAccessEntry[]>(ADMIN_ENDPOINTS.access);
  }

  grantAccess(email: string): Observable<AdminAccessEntry> {
    return this.http
      .post<ApiResponse<AdminAccessEntry>>(this.url(ADMIN_ENDPOINTS.access), { email })
      .pipe(map(unwrapApiData));
  }

  revokeAccess(userId: string): Observable<void> {
    return this.http
      .delete<ApiResponse<{ id: string }>>(`${this.url(ADMIN_ENDPOINTS.access)}/${userId}`)
      .pipe(map(() => void 0));
  }

  leads(): Observable<Lead[]> {
    return this.get<Lead[]>(ADMIN_ENDPOINTS.leads);
  }

  createLead(payload: LeadPayload): Observable<Lead> {
    return this.http
      .post<ApiResponse<Lead>>(this.url(ADMIN_ENDPOINTS.leads), payload)
      .pipe(map(unwrapApiData));
  }

  updateLead(leadId: string, payload: LeadPayload): Observable<Lead> {
    return this.http
      .patch<ApiResponse<Lead>>(`${this.url(ADMIN_ENDPOINTS.leads)}/${leadId}`, payload)
      .pipe(map(unwrapApiData));
  }

  deleteLead(leadId: string): Observable<void> {
    return this.http
      .delete<ApiResponse<{ id: string }>>(`${this.url(ADMIN_ENDPOINTS.leads)}/${leadId}`)
      .pipe(map(() => void 0));
  }

  private get<T>(path: string): Observable<T> {
    return this.http.get<ApiResponse<T>>(this.url(path)).pipe(map(unwrapApiData));
  }

  private url(path: string): string {
    return `${environment.apiUrl}${path}`;
  }
}
