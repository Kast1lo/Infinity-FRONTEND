import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { AuthInterceptor } from './auth.interceptor';

describe('AuthInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let router: { navigate: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    router = { navigate: vi.fn() };
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([AuthInterceptor])),
        provideHttpClientTesting(),
        { provide: Router, useValue: router },
      ],
    });
    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('пропускает auth-эндпоинты без обработки 401', () => {
    http.post('/auth/login', {}).subscribe({ error: () => {} });
    const req = httpMock.expectOne('/auth/login');
    req.flush({ message: 'bad' }, { status: 401, statusText: 'Unauthorized' });
    // refresh НЕ должен вызываться
    httpMock.expectNone((r) => r.url.includes('/auth/refresh'));
  });

  it('при 401 вызывает /auth/refresh и повторяет исходный запрос', () =>
    new Promise<void>((resolve) => {
      http.get('/user/profile').subscribe((res) => {
        expect(res).toEqual({ id: 'u1' });
        resolve();
      });

      // 1) исходный запрос падает с 401
      httpMock.expectOne('/user/profile').flush(
        { message: 'no' },
        { status: 401, statusText: 'Unauthorized' },
      );

      // 2) интерсептор дёргает refresh
      httpMock.expectOne((r) => r.url.includes('/auth/refresh')).flush({});

      // 3) исходный запрос повторяется и успешно завершается
      httpMock.expectOne('/user/profile').flush({ id: 'u1' });
    }));

  it('редиректит на /login, если refresh тоже упал', () =>
    new Promise<void>((resolve) => {
      http.get('/user/profile').subscribe({
        error: () => {
          expect(router.navigate).toHaveBeenCalledWith(['/login']);
          resolve();
        },
      });

      httpMock.expectOne('/user/profile').flush(
        { message: 'no' },
        { status: 401, statusText: 'Unauthorized' },
      );
      httpMock.expectOne((r) => r.url.includes('/auth/refresh')).flush(
        { message: 'expired' },
        { status: 401, statusText: 'Unauthorized' },
      );
    }));

  it('не зацикливается: повторный 401 (с RETRY_TOKEN) не вызывает refresh снова', () =>
    new Promise<void>((resolve) => {
      http.get('/user/profile').subscribe({ error: () => resolve() });

      httpMock.expectOne('/user/profile').flush(null, { status: 401, statusText: 'Unauthorized' });
      httpMock.expectOne((r) => r.url.includes('/auth/refresh')).flush({});
      // повтор снова 401 — но RETRY_TOKEN уже стоит, второго refresh быть не должно
      httpMock.expectOne('/user/profile').flush(null, { status: 401, statusText: 'Unauthorized' });
      httpMock.expectNone((r) => r.url.includes('/auth/refresh'));
    }));
});
