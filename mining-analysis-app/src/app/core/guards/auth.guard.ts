import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { map, take, tap } from 'rxjs/operators';

export const authGuard: CanActivateFn = (route, state) => {
    const authService = inject(AuthService);
    const router = inject(Router);

    return authService.isLoggedIn$.pipe(
        take(1),
        tap(isLoggedIn => {
            if (!isLoggedIn) {
                router.navigate(['/login']);
            }
        })
    );
};
