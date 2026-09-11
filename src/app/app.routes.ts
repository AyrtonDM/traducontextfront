import { Routes } from '@angular/router';
import { InicioSesion } from './views/autenticacion/inicio_sesion/inicio_sesion';
import { Registro } from './views/autenticacion/registro/registro';
import { VerificarCorreo } from './views/autenticacion/verificar_correo/verificar_correo';
import { RecuperacionContrasena } from './views/autenticacion/recuperacion_contrasena/recuperacion_contrasena.';

import { Inicio } from './views/inicio/inicio';

import { Autenticado } from './layouts/autenticado/autenticado';

import { autenticacionGuard } from './core/guards/autenticacion.guard';
import { Usuarios } from './views/administracion/usuarios/usuarios';
import { permisoGuard } from './core/guards/permiso.guard';

export const routes: Routes = [
  // ==========================
  // RUTAS P�BLICAS
  // ==========================

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
    path: 'recuperar-password',
    component: RecuperacionContrasena,
  },
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full',
  },

  // ==========================
  // RUTAS AUTENTICADAS
  // ==========================

  {
    path: '',
    component: Autenticado,
    canActivate: [autenticacionGuard],
    children: [

      {
        path: 'inicio',
        component: Inicio
      },

      {
        path: 'administracion/usuarios',
        component: Usuarios,
        canActivate: [permisoGuard],
        data: {
          permiso: 'gestionar_usuarios'
        }
      }

    ]
  },

  {
    path: '**',
    redirectTo: 'login',
  },

];
