import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { AuthService } from './auth';
import { UserService } from './user-service';

describe('AuthService (frontend)', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;
  let router: { navigate: ReturnType<typeof vi.fn> };
  let userService: { getProfile: ReturnType<typeof vi.fn>; clearProfile: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    localStorage.clear();
    router = { navigate: vi.fn() };
    userService = {
      getProfile: vi.fn().mockReturnValue(of({ id: 'u1', email: 'a@b.c', username: 'john' })),
      clearProfile: vi.fn(),
    };
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: Router, useValue: router },
        { provide: UserService, useValue: userService },
        AuthService,
      ],
    });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  describe('login', () => {
    it('логинит, грузит профиль, ставит remember-флаг и редиректит в /profile', () => {
      service.login({ username: 'john', password: 'pw', rememberMe: true } as any).subscribe();
      const req = httpMock.expectOne((r) => r.url.endsWith('/auth/login'));
      expect(req.request.method).toBe('POST');
      req.flush({ message: 'ok' });

      expect(userService.getProfile).toHaveBeenCalled();
      expect(localStorage.getItem('infinity_remember')).toBe('1');
      expect(router.navigate).toHaveBeenCalledWith(['/profile']);
      expect(service.isLoading()).toBe(false);
    });

    it('без rememberMe удаляет remember-флаг', () => {
      localStorage.setItem('infinity_remember', '1');
      service.login({ username: 'john', password: 'pw', rememberMe: false } as any).subscribe();
      httpMock.expectOne((r) => r.url.endsWith('/auth/login')).flush({ message: 'ok' });
      expect(localStorage.getItem('infinity_remember')).toBeNull();
    });
  });

  describe('register', () => {
    it('POST /auth/register и возвращает message+email', () => {
      let result: any;
      service.register({ email: 'a@b.c', username: 'john', password: 'pw' } as any).subscribe((r) => (result = r));
      const req = httpMock.expectOne((r) => r.url.endsWith('/auth/register'));
      req.flush({ message: 'код отправлен', email: 'a@b.c' });
      expect(result).toEqual({ message: 'код отправлен', email: 'a@b.c' });
      expect(service.isLoading()).toBe(false);
    });
  });

  describe('verifyEmail', () => {
    it('подтверждает email и грузит профиль БЕЗ навигации (её делает компонент)', () => {
      service.verifyEmail('a@b.c', '123456').subscribe();
      httpMock.expectOne((r) => r.url.endsWith('/auth/verify-email')).flush({});
      expect(userService.getProfile).toHaveBeenCalled();
      expect(router.navigate).not.toHaveBeenCalled();
    });
  });

  describe('logout', () => {
    it('чистит профиль, remember-флаг и редиректит в /login', () => {
      localStorage.setItem('infinity_remember', '1');
      service.logout();
      httpMock.expectOne((r) => r.url.endsWith('/auth/logout')).flush({});
      expect(userService.clearProfile).toHaveBeenCalled();
      expect(localStorage.getItem('infinity_remember')).toBeNull();
      expect(router.navigate).toHaveBeenCalledWith(['/login']);
    });
  });

  describe('autoRedirectIfRemembered', () => {
    it('ничего не делает без remember-флага', () => {
      service.autoRedirectIfRemembered();
      expect(userService.getProfile).not.toHaveBeenCalled();
    });

    it('редиректит в /profile, если флаг стоит и профиль доступен', () => {
      localStorage.setItem('infinity_remember', '1');
      service.autoRedirectIfRemembered();
      expect(router.navigate).toHaveBeenCalledWith(['/profile']);
    });
  });
});
