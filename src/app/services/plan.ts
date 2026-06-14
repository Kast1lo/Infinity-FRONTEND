import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { catchError, Observable, tap, throwError } from 'rxjs';
import { PlanInfo } from '../interfaces/plan-interfaces/plan-info.model';
import { environment } from '../../environments/environment';

export interface PlanPricing {
  plan:      'pulse' | 'horizon' | 'eternal';
  label:     string;
  amount:    number;
  period:    'month' | 'year' | 'once';
  recurring: boolean;
  storageGb: number;
}


@Injectable({
  providedIn: 'root',
})
export class PlanService {
  private readonly apiUrl = environment.apiUrl;

  private readonly http = inject(HttpClient);

  private _planInfo  = signal<PlanInfo | null>(null);
  private _pricing   = signal<PlanPricing[]>([]);
  private _isLoading = signal(false);
  private _error     = signal<string | null>(null);

  planInfo  = computed(() => this._planInfo());
  pricing   = computed(() => this._pricing());
  isLoading = computed(() => this._isLoading());
  error     = computed(() => this._error());

  loadPricing(): Observable<PlanPricing[]> {
    return this.http
      .get<PlanPricing[]>(`${this.apiUrl}/plan/pricing`, { withCredentials: true })
      .pipe(tap(p => this._pricing.set(p)));
  }

  loadPlanInfo(): Observable<PlanInfo> {
    this._isLoading.set(true);
    this._error.set(null);

    return this.http
      .get<PlanInfo>(`${this.apiUrl}/plan/info`, { withCredentials: true })
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

  activatePromo(code: string): Observable<{ message: string }> {
    this._isLoading.set(true);
    this._error.set(null);

    return this.http
      .post<{ message: string }>(
        `${this.apiUrl}/plan/activate-promo`,
        { code },
        { withCredentials: true },
      )
      .pipe(
        tap(() => {
          this._isLoading.set(false);
          this.loadPlanInfo().subscribe();
        }),
        catchError(err => {
          this._isLoading.set(false);
          this._error.set(err.error?.message || 'Ошибка активации промокода');
          return throwError(() => err);
        }),
      );
  }

  /** Оформить Pulse/Horizon — редирект на Robokassa (первый платёж привяжет карту). */
  subscribe(plan: 'pulse' | 'horizon'): Observable<{ url: string }> {
    this._error.set(null);
    return this.http
      .post<{ url: string }>(`${this.apiUrl}/payment/subscribe`, { plan }, { withCredentials: true })
      .pipe(
        tap(({ url }) => { window.location.href = url; }),
        catchError(err => {
          this._error.set(err.error?.message || 'Не удалось перейти к оплате');
          return throwError(() => err);
        }),
      );
  }

  /** Купить Eternal — разовая оплата через СБП. */
  buyEternal(): Observable<{ url: string }> {
    this._error.set(null);
    return this.http
      .post<{ url: string }>(`${this.apiUrl}/payment/eternal`, {}, { withCredentials: true })
      .pipe(
        tap(({ url }) => { window.location.href = url; }),
        catchError(err => {
          this._error.set(err.error?.message || 'Не удалось перейти к оплате');
          return throwError(() => err);
        }),
      );
  }

  /** Включить/выключить автопродление. */
  setAutoRenew(enabled: boolean): Observable<{ autoRenew: boolean }> {
    return this.http
      .post<{ autoRenew: boolean }>(`${this.apiUrl}/payment/auto-renew`, { enabled }, { withCredentials: true })
      .pipe(
        tap(() => { this.loadPlanInfo().subscribe(); }),
        catchError(err => {
          this._error.set(err.error?.message || 'Не удалось изменить автопродление');
          return throwError(() => err);
        }),
      );
  }

  /** Отвязать карту. */
  unbindCard(): Observable<{ cardBound: boolean }> {
    return this.http
      .delete<{ cardBound: boolean }>(`${this.apiUrl}/payment/card`, { withCredentials: true })
      .pipe(
        tap(() => { this.loadPlanInfo().subscribe(); }),
        catchError(err => {
          this._error.set(err.error?.message || 'Не удалось отвязать карту');
          return throwError(() => err);
        }),
      );
  }

  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Б';
    const sizes = ['Б', 'КБ', 'МБ', 'ГБ', 'ТБ'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  }

  getStorageColor(percent: number): string {
    if (percent >= 90) return '#e05555';
    if (percent >= 70) return '#d4b84a';
    return 'var(--brand-accent)';
  }

  clear(): void {
    this._planInfo.set(null);
    this._error.set(null);
  }
}