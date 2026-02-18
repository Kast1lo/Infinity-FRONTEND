import { Routes } from '@angular/router';
import { Login } from './pages/auth-pages/login/login';
import { Registration } from './pages/auth-pages/registration/registration';
import { Profile } from './pages/main-pages/profile/profile';
import { authGuard } from './guards/auth-guard-guard';
import { EditProfile } from './pages/main-pages/edit-profile/edit-profile';
import { InfinityLife } from './pages/main-pages/infinity-life/infinity-life';
import { FileSystem } from './pages/main-pages/file-system/file-system';
import { ProfileCard } from './pages/main-pages/profile/profile-card/profile-card';

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
    {
        path: 'profile',
        component: Profile,
        canActivate:[authGuard]
    },
    {
        path: 'edit',
        component: EditProfile,
        canActivate:[authGuard]
    },
    {
        path: 'infinity-life',
        component: InfinityLife,
        canActivate:[authGuard]
    },
    {
        path: 'file-system',
        component: FileSystem,
        canActivate:[authGuard],
    }
];
