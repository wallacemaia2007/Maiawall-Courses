import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map } from 'rxjs/operators';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { USER_ENDPOINTS } from '../constants/api.constants';
import { ApiResponse, unwrapApiData } from '../models/api-response.model';
import { User, UserProfileUpdatePayload } from '../models/user.model';
import { AuthStateService } from '../auth/auth-state.service';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private readonly authState = inject(AuthStateService);
  private readonly http = inject(HttpClient);

  readonly currentUser = this.authState.user;

  getCurrentUser(): Observable<User> {
    return this.http
      .get<ApiResponse<User>>(this.apiUrl(USER_ENDPOINTS.me))
      .pipe(map(unwrapApiData));
  }

  updateCurrentUser(payload: UserProfileUpdatePayload): Observable<User> {
    return this.http
      .patch<ApiResponse<User>>(this.apiUrl(USER_ENDPOINTS.updateMe), payload)
      .pipe(
        map(unwrapApiData),
        map((user) => {
          this.authState.setUser(user);
          return user;
        }),
      );
  }

  changePassword(currentPassword: string, newPassword: string): Observable<void> {
    return this.http
      .patch<ApiResponse<void>>(this.apiUrl(USER_ENDPOINTS.changePassword), {
        currentPassword,
        newPassword,
      })
      .pipe(map(() => void 0));
  }

  private apiUrl(path: string): string {
    return `${environment.apiUrl}${path}`;
  }
}
