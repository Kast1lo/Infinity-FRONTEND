import { computed, Injectable, signal } from '@angular/core';
import { UserProfile } from '../interfaces/profile-interfaces/user-profile.model';
import { HttpClient } from '@angular/common/http';
import { catchError, Observable, tap, throwError } from 'rxjs';
import { UpdateProfile } from '../interfaces/profile-interfaces/update-profile.model';
import { environment } from '../../environments/environment.prod';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private readonly apiUrl = environment.apiUrl;

  private _profile   = signal<UserProfile | null | undefined>(undefined);
  private _isLoading = signal(false);
  private _error     = signal<string | null>(null);

  profile   = computed(() => this._profile());
  isLoading = computed(() => this._isLoading());
  error     = computed(() => this._error());

  constructor(private http: HttpClient) {
    this.getProfile().subscribe();
  }

  getProfile(): Observable<UserProfile> {
    this._isLoading.set(true);
    this._error.set(null);
    return this.http.get<UserProfile>(`${this.apiUrl}/profile`, { withCredentials: true }).pipe(
      tap(profile => {
        this._profile.set(profile);
        this._isLoading.set(false);
      }),
      catchError(err => {
        this._isLoading.set(false);
        if (err.status === 401) {
          this._profile.set(null);
        } else {
          this._error.set(err.error?.message || 'Ошибка загрузки профиля');
        }
        return throwError(() => err);
      }),
    );
  }

  clearProfile(): void {
    this._profile.set(null);
    this._error.set(null);
  }

  updateProfile(updates: UpdateProfile): Observable<UserProfile> {
    this._isLoading.set(true);
    this._error.set(null);
    return this.http.patch<UserProfile>(`${this.apiUrl}/updateProfile`, updates, { withCredentials: true }).pipe(
      tap(updated => {
        this._profile.set(updated);
        this._isLoading.set(false);
      }),
      catchError(err => {
        this._isLoading.set(false);
        this._error.set(err.error?.message || 'Ошибка обновления профиля');
        return throwError(() => err);
      }),
    );
  }

  // ─── Смена пароля ───
  changePassword(currentPassword: string, newPassword: string): Observable<{ message: string }> {
    return this.http
      .patch<{ message: string }>(
        `${this.apiUrl}/changePassword`,
        { currentPassword, newPassword },
        { withCredentials: true },
      )
      .pipe(
        catchError(err => throwError(() => err)),
      );
  }

  uploadAvatar(file: File): Observable<UserProfile> {
    this._isLoading.set(true);
    this._error.set(null);
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<UserProfile>(`${this.apiUrl}/createAvatar`, formData, { withCredentials: true }).pipe(
      tap(updatedProfile => {
        this._profile.set(updatedProfile);
        this._isLoading.set(false);
      }),
      catchError(err => {
        this._isLoading.set(false);
        this._error.set(err.error?.message || 'Ошибка загрузки аватара');
        return throwError(() => err);
      }),
    );
  }
}