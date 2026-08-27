import { Routes } from '@angular/router';

import { Registro } from './views/autenticacion/registro/registro';
import { VerificarCorreo } from './views/autenticacion/verificar_correo/verificar_correo';

export const routes: Routes = [
  {
    path: 'registro',
    component: Registro,
  },
  {
    path: 'verificar_correo',
    component: VerificarCorreo,
  },
  {
    path: '',
    redirectTo: 'registro',
    pathMatch: 'full',
  },
];