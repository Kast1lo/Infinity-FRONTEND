import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { authGuard } from './auth-guard-guard';
import { UserService } from '../services/user-service';

describe('authGuard', () => {
  let userService: { getProfile: ReturnType<typeof vi.fn> };
  let router: { navigate: ReturnType<typeof vi.fn> };

  const run = (url = '/file-system') =>
    TestBed.runInInjectionContext(() => authGuard({} as any, { url } as any));

  beforeEach(() => {
    userService = { getProfile: vi.fn() };
    router = { navigate: vi.fn() };
    TestBed.configureTestingModule({
      providers: [
        { provide: UserService, useValue: userService },
        { provide: Router, useValue: router },
      ],
    });
  });

  it('пропускает (true), когда профиль загружается успешно', () =>
    new Promise<void>((resolve) => {
      userService.getProfile.mockReturnValue(of({ id: 'u1' }));
      (run() as any).subscribe((allowed: boolean) => {
        expect(allowed).toBe(true);
        expect(router.navigate).not.toHaveBeenCalled();
        resolve();
      });
    }));

  it('блокирует (false) и редиректит на /login с returnUrl при ошибке профиля', () =>
    new Promise<void>((resolve) => {
      userService.getProfile.mockReturnValue(throwError(() => ({ status: 401 })));
      (run('/profile') as any).subscribe((allowed: boolean) => {
        expect(allowed).toBe(false);
        expect(router.navigate).toHaveBeenCalledWith(['/login'], {
          queryParams: { returnUrl: '/profile' },
        });
        resolve();
      });
    }));
});
