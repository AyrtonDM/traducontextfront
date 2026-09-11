import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AutenticacionService } from '../services/autenticacion.service';

export const permisoGuard: CanActivateFn = (route) => {
  const router = inject(Router);
  const authService = inject(AutenticacionService);

  const usuarioActual = authService.obtenerUsuarioActual();
  const permisoRequerido = route.data['permiso'] as string | undefined;

  if (!usuarioActual) {
    return router.createUrlTree(['/login']);
  }

  if (!permisoRequerido) {
    return true;
  }

  const tienePermiso = usuarioActual.permisos?.includes(permisoRequerido) ?? false;

  if (tienePermiso) {
    return true;
  }

  return router.createUrlTree(['/inicio']);
};