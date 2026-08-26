import { Routes } from '@angular/router';
import { InicioSesion } from './views/autenticacion/inicio_sesion/inicio_sesion';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: InicioSesion },
  { path: '**', redirectTo: 'login' },
];
