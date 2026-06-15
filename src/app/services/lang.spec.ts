import { TestBed } from '@angular/core/testing';
import { LangService } from './lang';

describe('LangService', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [LangService] });
  });

  it('по умолчанию язык — русский', () => {
    const service = TestBed.inject(LangService);
    expect(service.lang()).toBe('ru');
    expect(service.t()).toBeTruthy();
  });

  it('читает сохранённый язык из localStorage', () => {
    localStorage.setItem('lang', 'en');
    const service = TestBed.inject(LangService);
    expect(service.lang()).toBe('en');
  });

  it('toggle переключает язык и сохраняет в localStorage', () => {
    const service = TestBed.inject(LangService);
    service.toggle();
    expect(service.lang()).toBe('en');
    expect(localStorage.getItem('lang')).toBe('en');
    service.toggle();
    expect(service.lang()).toBe('ru');
    expect(localStorage.getItem('lang')).toBe('ru');
  });

  it('t() реактивно меняет словарь при смене языка', () => {
    const service = TestBed.inject(LangService);
    const ruDict = service.t();
    service.toggle();
    const enDict = service.t();
    expect(enDict).not.toBe(ruDict);
  });
});
