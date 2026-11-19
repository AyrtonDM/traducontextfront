import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  FiltroUsuarios,
  ListaRolesRespuesta,
  ListaUsuariosRespuesta,
  UsuarioAdminRespuesta,
} from '../models/usuarios.model';

/** Administracion de usuarios (HU-05). Todos los endpoints requieren el permiso gestionar_usuarios. */
@Injectable({
  providedIn: 'root'
})
export class UsuariosService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/usuarios`;

  /** Endpoint: GET /api/v1/usuarios?pagina=1&tamano_pagina=10&busqueda=&id_rol=&estado= */
  listar(filtro: FiltroUsuarios): Observable<ListaUsuariosRespuesta> {
    let params = new HttpParams()
      .set('pagina', filtro.pagina)
      .set('tamano_pagina', filtro.tamano_pagina);
    if (filtro.busqueda?.trim()) {
      params = params.set('busqueda', filtro.busqueda.trim());
    }
    if (filtro.id_rol != null) {
      params = params.set('id_rol', filtro.id_rol);
    }
    if (filtro.estado) {
      params = params.set('estado', filtro.estado);
    }
    return this.http.get<ListaUsuariosRespuesta>(this.apiUrl, { params });
  }

  /** Endpoint: GET /api/v1/usuarios/roles */
  listarRoles(): Observable<ListaRolesRespuesta> {
    return this.http.get<ListaRolesRespuesta>(`${this.apiUrl}/roles`);
  }

  /** Endpoint: GET /api/v1/usuarios/{id} */
  obtener(idUsuario: number): Observable<UsuarioAdminRespuesta> {
    return this.http.get<UsuarioAdminRespuesta>(`${this.apiUrl}/${idUsuario}`);
  }

  /** Endpoint: PATCH /api/v1/usuarios/{id}/suspender */
  suspender(idUsuario: number): Observable<UsuarioAdminRespuesta> {
    return this.http.patch<UsuarioAdminRespuesta>(`${this.apiUrl}/${idUsuario}/suspender`, {});
  }

  /** Endpoint: PATCH /api/v1/usuarios/{id}/reactivar */
  reactivar(idUsuario: number): Observable<UsuarioAdminRespuesta> {
    return this.http.patch<UsuarioAdminRespuesta>(`${this.apiUrl}/${idUsuario}/reactivar`, {});
  }

  /** Endpoint: PATCH /api/v1/usuarios/{id}/rol */
  cambiarRol(idUsuario: number, idRol: number): Observable<UsuarioAdminRespuesta> {
    return this.http.patch<UsuarioAdminRespuesta>(`${this.apiUrl}/${idUsuario}/rol`, { id_rol: idRol });
  }
}
