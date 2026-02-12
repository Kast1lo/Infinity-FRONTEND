import { Routes } from '@angular/router';
import { Login } from './pages/auth-pages/login/login';
import { Registration } from './pages/auth-pages/registration/registration';

export const routes: Routes = [
    {
        path:'',
        redirectTo: 'login',
        pathMatch: 'full'
    },
    {
        path: 'login',
        component: Login
    },
    {
        path: 'registration',
        component: Registration
    },
];
