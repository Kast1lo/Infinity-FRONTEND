import { Routes } from '@angular/router';
import { Login } from './pages/auth-pages/login/login';
import { Registration } from './pages/auth-pages/registration/registration';
import { Profile } from './pages/main-pages/profile/profile';
import { authGuard } from './guards/auth-guard-guard';
import { EditProfile } from './pages/main-pages/edit-profile/edit-profile';
import { InfinityLife } from './pages/main-pages/infinity-life/infinity-life';
import { Projects } from './pages/main-pages/projects/projects';
import { FileSystem } from './pages/main-pages/file-system/file-system';
import { Trash } from './pages/main-pages/trash/trash';
import { Shared } from './pages/main-pages/shared/shared';
import { ProfileCard } from './pages/main-pages/profile/profile-card/profile-card';
import { ShareFile } from './common-ui/share-file/share-file';
import { MainPage } from './common-ui/main-page/main-page';
import { UiKit } from './common-ui/ui-kit/ui-kit';

export const routes: Routes = [
    {
        path: '',
        component: MainPage,
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
        path: 'projects',
        component: Projects,
        canActivate:[authGuard]
    },
    {
        path: 'projects/:projectId',
        component: InfinityLife,
        canActivate:[authGuard]
    },
    {
        path: 'infinity-life',
        redirectTo: 'projects',
        pathMatch: 'full'
    },
    {
        path: 'file-system',
        component: FileSystem,
        canActivate:[authGuard],
    },
    {
        path: 'trash',
        component: Trash,
        canActivate:[authGuard],
    },
    {
        path: 'shared',
        component: Shared,
        canActivate:[authGuard],
    },
    {
        path: 'ui-kit',
        component: UiKit
    },
    { path: '**', redirectTo: 'file-system' }
];
