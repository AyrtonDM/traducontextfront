import { Routes } from '@angular/router';
import { Registro } from './views/autenticacion/registro/regisro';

export const routes: Routes = [
  {
    path: 'registro',
    component: Registro,
  },
  {
    path: '',
    redirectTo: 'registro',
    pathMatch: 'full',
  },
];
