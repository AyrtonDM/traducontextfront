import { Routes } from '@angular/router';
import { InicioSesion } from './views/autenticacion/inicio_sesion/inicio_sesion';
import { Registro } from './views/autenticacion/registro/registro';
import { VerificarCorreo } from './views/autenticacion/verificar_correo/verificar_correo';

export const routes: Routes = [
  {
    path: 'login',
    component: InicioSesion,
  },
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
    redirectTo: 'login',
    pathMatch: 'full',
  },
  {
    path: '**',
    redirectTo: 'login',
  },
];
