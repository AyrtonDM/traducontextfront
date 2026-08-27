import { Routes } from '@angular/router';

import { InicioSesion } from './views/autenticacion/inicio_sesion/inicio_sesion';

export const routes: Routes = [
	{ path: '', pathMatch: 'full', redirectTo: 'iniciar-sesion' },
	{ path: 'iniciar-sesion', component: InicioSesion },
	{ path: '**', redirectTo: 'iniciar-sesion' },
];
