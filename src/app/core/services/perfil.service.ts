import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ActualizarPerfilSolicitud, PerfilRespuesta } from '../models/perfil.model';

@Injectable({
  providedIn: 'root'
})
export class PerfilService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  obtenerPerfil(): Observable<PerfilRespuesta> {
    return this.http.get<PerfilRespuesta>(`${this.apiUrl}/perfil`);
  }

  actualizarPerfil(datos: ActualizarPerfilSolicitud): Observable<PerfilRespuesta> {
    return this.http.patch<PerfilRespuesta>(`${this.apiUrl}/perfil`, datos);
  }}
