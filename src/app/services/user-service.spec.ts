import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { UserService } from './user-service';

describe('UserService', () => {
  let service: UserService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), UserService],
    });
    service = TestBed.inject(UserService);
    httpMock = TestBed.inject(HttpTestingController);
    // Конструктор сразу дёргает getProfile() — гасим этот запрос.
    httpMock.expectOne((r) => r.url.endsWith('/user/profile')).flush({ id: 'u1', email: 'a@b.c', username: 'john' });
  });

  afterEach(() => httpMock.verify());

  describe('getProfile', () => {
    it('наполняет profile() при успехе', () => {
      service.getProfile().subscribe();
      httpMock.expectOne((r) => r.url.endsWith('/user/profile')).flush({ id: 'u2', email: 'x@y.z', username: 'jane' });
      expect(service.profile()).toEqual({ id: 'u2', email: 'x@y.z', username: 'jane' } as any);
    });

    it('ставит profile() в null при 401 (без записи в error)', () => {
      service.getProfile().subscribe({ error: () => {} });
      httpMock
        .expectOne((r) => r.url.endsWith('/user/profile'))
        .flush(null, { status: 401, statusText: 'Unauthorized' });
      expect(service.profile()).toBeNull();
      expect(service.error()).toBeNull();
    });

    it('пишет error() при не-401 ошибке', () => {
      service.getProfile().subscribe({ error: () => {} });
      httpMock
        .expectOne((r) => r.url.endsWith('/user/profile'))
        .flush({ message: 'сервер упал' }, { status: 500, statusText: 'Error' });
      expect(service.error()).toBe('сервер упал');
    });
  });

  describe('updateProfile', () => {
    it('PATCH /user/updateProfile и обновляет signal', () => {
      service.updateProfile({ username: 'newname' } as any).subscribe();
      const req = httpMock.expectOne((r) => r.url.endsWith('/user/updateProfile'));
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual({ username: 'newname' });
      req.flush({ id: 'u1', username: 'newname', email: 'a@b.c' });
      expect(service.profile()).toEqual({ id: 'u1', username: 'newname', email: 'a@b.c' } as any);
    });
  });

  describe('changePassword', () => {
    it('PATCH /user/changePassword с обоими паролями', () => {
      service.changePassword('old', 'new').subscribe();
      const req = httpMock.expectOne((r) => r.url.endsWith('/user/changePassword'));
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual({ currentPassword: 'old', newPassword: 'new' });
      req.flush({ message: 'ok' });
    });
  });

  describe('confirmEmailChange', () => {
    it('обновляет email в profile() после подтверждения', () => {
      // профиль уже есть из конструктора (a@b.c)
      service.confirmEmailChange('123456').subscribe();
      httpMock
        .expectOne((r) => r.url.endsWith('/user/confirm-email-change'))
        .flush({ message: 'ok', email: 'new@b.c' });
      expect(service.profile()?.email).toBe('new@b.c');
    });
  });

  describe('uploadAvatar', () => {
    it('POST /user/createAvatar с FormData', () => {
      const file = new File(['x'], 'a.png', { type: 'image/png' });
      service.uploadAvatar(file).subscribe();
      const req = httpMock.expectOne((r) => r.url.endsWith('/user/createAvatar'));
      expect(req.request.method).toBe('POST');
      expect(req.request.body instanceof FormData).toBe(true);
      req.flush({ id: 'u1', email: 'a@b.c', username: 'john', avatarUrl: 'https://cdn/a.png' });
      expect(service.profile()?.avatarUrl).toBe('https://cdn/a.png');
    });
  });
});
