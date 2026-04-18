import { HttpClient } from '@angular/common/http';
import { computed, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { LoginRequest } from '../interfaces/auth-interfaces/login-request.model';
import { catchError, Observable, switchMap, tap, throwError } from 'rxjs';
import { apiResponse } from '../interfaces/auth-interfaces/api-response.model';
import { RegisterData } from '../interfaces/auth-interfaces/register-data.model';
import { UserProfile } from '../interfaces/profile-interfaces/user-profile.model';
import { UserService } from './user-service';
import { environment } from '../../environments/environment.prod';


@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly apiUrl = environment.apiUrl;

  private _isLoading = signal(false);
  private _error     = signal<string | null>(null);

  isLoading = computed(() => this._isLoading());
  error     = computed(() => this._error());

  constructor(
    private http:        HttpClient,
    private router:      Router,
    private userService: UserService,
  ) {}

  login(credentials: LoginRequest): Observable<UserProfile> {
    this._isLoading.set(true);
    this._error.set(null);
    return this.http
      .post<apiResponse>(`${this.apiUrl}/auth/login`, credentials, { withCredentials: true })
      .pipe(
        switchMap(() => this.userService.getProfile()),
        tap(() => {
          this._isLoading.set(false);
          this.router.navigate(['/profile']);
        }),
        catchError(err => {
          this._isLoading.set(false);
          return throwError(() => err);
        }),
      );
  }

  // ─── Регистрация — возвращает email, не редиректит ───
  register(data: RegisterData): Observable<{ message: string; email: string }> {
    this._isLoading.set(true);
    this._error.set(null);
    return this.http
      .post<{ message: string; email: string }>(
        `${this.apiUrl}/auth/register`,
        data,
        { withCredentials: true },
      )
      .pipe(
        tap(() => this._isLoading.set(false)),
        catchError(err => {
          this._isLoading.set(false);
          return throwError(() => err);
        }),
      );
  }

  // ─── Подтверждение кода ───
  verifyEmail(email: string, code: string): Observable<UserProfile> {
    this._isLoading.set(true);
    this._error.set(null);
    return this.http
      .post(`${this.apiUrl}/auth/verify-email`, { email, code }, { withCredentials: true })
      .pipe(
        switchMap(() => this.userService.getProfile()),
        tap(() => {
          this._isLoading.set(false);
          this.router.navigate(['/profile']);
        }),
        catchError(err => {
          this._isLoading.set(false);
          return throwError(() => err);
        }),
      );
  }

  // ─── Повторная отправка кода ───
  resendCode(email: string): Observable<{ message: string }> {
    return this.http
      .post<{ message: string }>(
        `${this.apiUrl}/auth/resend-code`,
        { email },
        { withCredentials: true },
      )
      .pipe(
        catchError(err => throwError(() => err)),
      );
  }

  logout(): void {
    this.http
      .post(`${this.apiUrl}/auth/logout`, {}, { withCredentials: true })
      .subscribe({
        complete: () => {
          this.userService.clearProfile();
          this._isLoading.set(false);
          this._error.set(null);
          this.router.navigate(['/login']);
        },
        error: err => {
          this.userService.clearProfile();
          console.error('Logout error', err);
          this.router.navigate(['/login']);
        },
      });
  }
}