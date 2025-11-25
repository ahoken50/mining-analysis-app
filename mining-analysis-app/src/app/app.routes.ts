import { Routes } from '@angular/router';
import { Dashboard } from './features/dashboard/dashboard';
import { Overview } from './features/dashboard/overview/overview';
import { Statistics } from './features/dashboard/statistics/statistics';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
    {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
    },
    {
        path: 'dashboard',
        component: Dashboard,
        canActivate: [authGuard],
        children: [
            { path: '', redirectTo: 'overview', pathMatch: 'full' },
            { path: 'overview', component: Overview },
            { path: 'statistics', component: Statistics }
        ]
    },
    {
        path: 'projects/new',
        loadComponent: () => import('./features/projects/project-form/project-form').then(m => m.ProjectForm),
        canActivate: [authGuard]
    },
    {
        path: 'projects/:id/edit',
        loadComponent: () => import('./features/projects/project-form/project-form').then(m => m.ProjectForm),
        canActivate: [authGuard]
    },
    {
        path: 'projects/:id',
        loadComponent: () => import('./features/projects/project-details/project-details').then(m => m.ProjectDetails),
        canActivate: [authGuard]
    },
    {
        path: 'login',
        loadComponent: () => import('./features/auth/login/login').then(m => m.Login)
    },
    {
        path: 'register',
        loadComponent: () => import('./features/auth/register/register').then(m => m.Register)
    },
    {
        path: '**',
        redirectTo: 'dashboard'
    }
];
