import { Routes } from '@angular/router';
import { Login } from './pages/auth-pages/login/login';
import { Registration } from './pages/auth-pages/registration/registration';
import { Profile } from './pages/main-pages/profile/profile';
import { authGuard } from './guards/auth-guard-guard';
import { EditProfile } from './pages/main-pages/edit-profile/edit-profile';
import { InfinityLife } from './pages/main-pages/infinity-life/infinity-life';
import { FileSystem } from './pages/main-pages/file-system/file-system';
import { ProfileCard } from './pages/main-pages/profile/profile-card/profile-card';
import { ShareFile } from './common-ui/share-file/share-file';
import { MainPage } from './common-ui/main-page/main-page';

export const routes: Routes = [
    {
        path:'',
        redirectTo: 'main',
        pathMatch: 'full'
    },
    {
        path: 'main',
        component: MainPage
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
        path: 'share/:username/:filename',
        component: ShareFile
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
    },
    { path: '**', redirectTo: 'file-system' }
];
