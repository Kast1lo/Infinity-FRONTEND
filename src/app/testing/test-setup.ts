import { EnvironmentProviders, Provider } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, ActivatedRoute, convertToParamMap } from '@angular/router';
import { MessageService, ConfirmationService } from 'primeng/api';
import { of } from 'rxjs';

/**
 * Общий набор провайдеров для smoke-тестов standalone-компонентов.
 *
 * Зачем:
 *  - provideHttpClientTesting() перехватывает любые HTTP-запросы (в т.ч.
 *    авто-вызов UserService.getProfile() в конструкторе), чтобы тесты не били
 *    в реальный backend на localhost:4400;
 *  - provideRouter([]) + ActivatedRoute-заглушка дают routerLink и чтение
 *    параметров маршрута без падений;
 *  - MessageService/ConfirmationService нужны компонентам с p-toast / p-confirm.
 */
export function commonTestProviders(): (Provider | EnvironmentProviders)[] {
  const emptyMap = convertToParamMap({});
  return [
    provideHttpClient(),
    provideHttpClientTesting(),
    provideRouter([]),
    MessageService,
    ConfirmationService,
    {
      provide: ActivatedRoute,
      useValue: {
        snapshot: {
          paramMap: emptyMap,
          queryParamMap: emptyMap,
          params: {},
          queryParams: {},
          data: {},
        },
        paramMap: of(emptyMap),
        queryParamMap: of(emptyMap),
        params: of({}),
        queryParams: of({}),
        data: of({}),
      },
    },
  ];
}
