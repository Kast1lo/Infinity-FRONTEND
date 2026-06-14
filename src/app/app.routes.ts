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
import { Starred } from './pages/main-pages/starred/starred';
import { Recent } from './pages/main-pages/recent/recent';
import { SharedWithMe } from './pages/main-pages/shared-with-me/shared-with-me';
import { ShareFile } from './common-ui/share-file/share-file';
import { ShareFolder } from './common-ui/share-folder/share-folder';
import { MainPage } from './common-ui/main-page/main-page';
import { UiKit } from './common-ui/ui-kit/ui-kit';
import { Shell } from './common-ui/shell/shell';

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
        path: 'share-folder/:slug',
        component: ShareFolder
    },
    {
        path: 'ui-kit',
        component: UiKit
    },
    {
        path: 'infinity-life',
        redirectTo: 'projects',
        pathMatch: 'full'
    },
    // Авторизованные страницы внутри общего шелла (топбар + сайдбар)
    {
        path: '',
        component: Shell,
        canActivate: [authGuard],
        children: [
            { path: 'profile',             component: Profile },
            { path: 'edit',                component: EditProfile },
            { path: 'projects',            component: Projects },
            { path: 'projects/:projectId', component: InfinityLife },
            { path: 'file-system',         component: FileSystem },
            { path: 'recent',              component: Recent },
            { path: 'trash',               component: Trash },
            { path: 'shared',              component: Shared },
            { path: 'shared-with-me',      component: SharedWithMe },
            { path: 'starred',             component: Starred },
        ],
    },
    { path: '**', redirectTo: 'file-system' }
];
