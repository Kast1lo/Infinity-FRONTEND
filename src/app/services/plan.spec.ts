import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PlanService } from './plan';

describe('PlanService', () => {
  let service: PlanService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), PlanService],
    });
    service = TestBed.inject(PlanService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  describe('loadPricing', () => {
    it('GET /plan/pricing и кладёт результат в signal pricing()', () => {
      const data = [{ plan: 'pulse', label: 'Infinity Pulse', amount: 399, period: 'month', recurring: true, storageGb: 250 }];
      service.loadPricing().subscribe();
      const req = httpMock.expectOne((r) => r.url.endsWith('/plan/pricing'));
      expect(req.request.method).toBe('GET');
      expect(req.request.withCredentials).toBe(true);
      req.flush(data);
      expect(service.pricing()).toEqual(data as any);
    });
  });

  describe('loadPlanInfo', () => {
    it('сбрасывает loading и наполняет planInfo() при успехе', () => {
      service.loadPlanInfo().subscribe();
      expect(service.isLoading()).toBe(true);
      const req = httpMock.expectOne((r) => r.url.endsWith('/plan/info'));
      req.flush({ planType: 'pulse' });
      expect(service.isLoading()).toBe(false);
      expect(service.planInfo()).toEqual({ planType: 'pulse' } as any);
    });

    it('выставляет error() из тела ответа при ошибке', () => {
      service.loadPlanInfo().subscribe({ error: () => {} });
      httpMock
        .expectOne((r) => r.url.endsWith('/plan/info'))
        .flush({ message: 'нет доступа' }, { status: 500, statusText: 'Error' });
      expect(service.isLoading()).toBe(false);
      expect(service.error()).toBe('нет доступа');
    });
  });

  describe('subscribe', () => {
    it('POST /payment/subscribe с телом {plan} и редиректит на полученный url', () => {
      const loc = { href: '' };
      Object.defineProperty(window, 'location', { value: loc, writable: true, configurable: true });

      service.subscribe('pulse').subscribe();
      const req = httpMock.expectOne((r) => r.url.endsWith('/payment/subscribe'));
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ plan: 'pulse' });
      req.flush({ url: 'https://pay.example/redirect' });
      expect(loc.href).toBe('https://pay.example/redirect');
    });
  });

  describe('buyEternal', () => {
    it('POST /payment/eternal с пустым телом', () => {
      Object.defineProperty(window, 'location', { value: { href: '' }, writable: true, configurable: true });
      service.buyEternal().subscribe();
      const req = httpMock.expectOne((r) => r.url.endsWith('/payment/eternal'));
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({});
      req.flush({ url: 'https://pay.example/sbp' });
    });
  });

  describe('unbindCard', () => {
    it('DELETE /payment/card и перезагружает planInfo', () => {
      service.unbindCard().subscribe();
      const del = httpMock.expectOne((r) => r.url.endsWith('/payment/card'));
      expect(del.request.method).toBe('DELETE');
      del.flush({ cardBound: false });
      // tap вызывает loadPlanInfo() → второй GET
      httpMock.expectOne((r) => r.url.endsWith('/plan/info')).flush({ planType: 'spark' });
    });
  });

  describe('formatBytes', () => {
    it('форматирует 0 байт', () => {
      expect(service.formatBytes(0)).toBe('0 Б');
    });
    it('форматирует килобайты и гигабайты', () => {
      expect(service.formatBytes(1536)).toBe('1.5 КБ');
      expect(service.formatBytes(5 * 1024 ** 3)).toBe('5.0 ГБ');
    });
  });

  describe('getStorageColor', () => {
    it('красный при ≥90%, золотой при ≥70%, иначе бренд-акцент', () => {
      expect(service.getStorageColor(95)).toBe('#e05555');
      expect(service.getStorageColor(75)).toBe('#d4b84a');
      expect(service.getStorageColor(20)).toBe('var(--brand-accent)');
    });
  });
});
