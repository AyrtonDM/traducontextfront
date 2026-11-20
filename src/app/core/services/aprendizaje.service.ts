import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  CorreccionRespuesta,
  CorreccionesRespuesta,
  EliminarCorreccionesRespuesta,
  EstadoAprendizajeRespuesta,
  FiltroCorrecciones,
  RegistrarCorreccionSolicitud,
} from '../models/aprendizaje.model';

/** Aprendizaje de preferencias (HU-34) */
@Injectable({
  providedIn: 'root'
})
export class AprendizajeService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/aprendizaje`;

  /** Endpoint: GET /api/v1/aprendizaje */
  obtenerEstado(): Observable<EstadoAprendizajeRespuesta> {
    return this.http.get<EstadoAprendizajeRespuesta>(this.apiUrl);
  }

  /** Activa o desactiva el aprendizaje sin borrar lo aprendido. Endpoint: PATCH /api/v1/aprendizaje */
  cambiarEstado(activo: boolean): Observable<EstadoAprendizajeRespuesta> {
    return this.http.patch<EstadoAprendizajeRespuesta>(this.apiUrl, { activo });
  }

  /**
   * Registra una correccion manual o la alternativa elegida. Con el aprendizaje desactivado
   * responde 201 con `resultado: null`. Endpoint: POST /api/v1/aprendizaje/correcciones
   */
  registrarCorreccion(datos: RegistrarCorreccionSolicitud): Observable<CorreccionRespuesta> {
    return this.http.post<CorreccionRespuesta>(`${this.apiUrl}/correcciones`, datos);
  }

  /** Endpoint: GET /api/v1/aprendizaje/correcciones?idioma_origen=es&idioma_destino=en */
  listarCorrecciones(filtro: FiltroCorrecciones = {}): Observable<CorreccionesRespuesta> {
    let params = new HttpParams();
    if (filtro.idioma_origen) {
      params = params.set('idioma_origen', filtro.idioma_origen);
    }
    if (filtro.idioma_destino) {
      params = params.set('idioma_destino', filtro.idioma_destino);
    }
    return this.http.get<CorreccionesRespuesta>(`${this.apiUrl}/correcciones`, { params });
  }

  /** Endpoint: DELETE /api/v1/aprendizaje/correcciones/{id} */
  eliminarCorreccion(idCorreccion: number): Observable<EliminarCorreccionesRespuesta> {
    return this.http.delete<EliminarCorreccionesRespuesta>(`${this.apiUrl}/correcciones/${idCorreccion}`);
  }

  /** Borra todo lo aprendido. Endpoint: DELETE /api/v1/aprendizaje/correcciones */
  eliminarTodas(): Observable<EliminarCorreccionesRespuesta> {
    return this.http.delete<EliminarCorreccionesRespuesta>(`${this.apiUrl}/correcciones`);
  }
}
