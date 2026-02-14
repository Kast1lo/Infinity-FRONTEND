import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { UserService } from '../services/user-service';

export const authGuard: CanActivateFn = (route, state) => {
  const userService = inject(UserService);
  const router = inject(Router);

  return userService.getProfile().pipe(
    map(profile => {
      return true;
    }),
    catchError(error => {
      router.navigate(['/login'], {
        queryParams: {returnUrl: state.url}
      });
      return of(false);
    })
  )
};
