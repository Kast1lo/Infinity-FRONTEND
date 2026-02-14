import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';
import { HttpContext } from '@angular/common/http';
import { RETRY_TOKEN } from './context-tokens';

const API_URL = 'http://localhost:4400';

export const AuthInterceptor: HttpInterceptorFn = (req, next) => {
  const http = inject(HttpClient);
  const router = inject(Router);
  if (
    req.url.includes('/auth/login') ||
    req.url.includes('/auth/register') ||
    req.url.includes('/auth/refresh') ||
    req.url.includes('/auth/logout')
  ) {
    return next(req);
  }
  return next(req).pipe(
    catchError(error => {
      if (error.status === 401 && !req.context.get(RETRY_TOKEN)) {
        // Клонируем запрос с флагом retry = true
        const retryReq = req.clone({
          context: req.context.set(RETRY_TOKEN, true)
        });
        return http.post(`${API_URL}/auth/refresh`, {}, { withCredentials: true }).pipe(
          switchMap(() => {
            return next(retryReq);
          }),
          catchError(refreshErr => {
            router.navigate(['/login']);
            return throwError(() => error);
          })
        );
      }
      return throwError(() => error);
    })
  );
};