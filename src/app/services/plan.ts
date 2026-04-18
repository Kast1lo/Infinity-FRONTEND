import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { catchError, Observable, tap, throwError } from 'rxjs';
import { PlanInfo } from '../interfaces/plan-interfaces/plan-info.model';


@Injectable({
  providedIn: 'root',
})
export class PlanService {
  private readonly apiUrl = 'http://localhost:4400/plan';

  private readonly http = inject(HttpClient);

  private _planInfo  = signal<PlanInfo | null>(null);
  private _isLoading = signal(false);
  private _error     = signal<string | null>(null);

  planInfo  = computed(() => this._planInfo());
  isLoading = computed(() => this._isLoading());
  error     = computed(() => this._error());

  // ─── Загрузить информацию о тарифе ───

  loadPlanInfo(): Observable<PlanInfo> {
    this._isLoading.set(true);
    this._error.set(null);

    return this.http
      .get<PlanInfo>(`${this.apiUrl}/info`, { withCredentials: true })
      .pipe(
        tap(info => {
          this._planInfo.set(info);
          this._isLoading.set(false);
        }),
        catchError(err => {
          this._isLoading.set(false);
          this._error.set(err.error?.message || 'Ошибка загрузки тарифа');
          return throwError(() => err);
        }),
      );
  }

  // ─── Активировать промокод ───

  activatePromo(code: string): Observable<{ message: string }> {
    this._isLoading.set(true);
    this._error.set(null);

    return this.http
      .post<{ message: string }>(
        `${this.apiUrl}/activate-promo`,
        { code },
        { withCredentials: true },
      )
      .pipe(
        tap(() => {
          this._isLoading.set(false);
          // Перезагружаем информацию о тарифе после активации
          this.loadPlanInfo().subscribe();
        }),
        catchError(err => {
          this._isLoading.set(false);
          this._error.set(err.error?.message || 'Ошибка активации промокода');
          return throwError(() => err);
        }),
      );
  }

  // ─── Хелперы ───

  // Форматировать байты в человекочитаемый вид
  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Б';
    const sizes = ['Б', 'КБ', 'МБ', 'ГБ', 'ТБ'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  }

  // Получить цвет шкалы хранилища
  getStorageColor(percent: number): string {
    if (percent >= 90) return '#e05555';
    if (percent >= 70) return '#d4b84a';
    return 'var(--text2)';
  }

  // Сбросить данные (при logout)
  clear(): void {
    this._planInfo.set(null);
    this._error.set(null);
  }
}