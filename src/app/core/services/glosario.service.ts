import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  ActualizarGlosarioSolicitud,
  ActualizarTerminoGlosarioSolicitud,
  CrearGlosarioSolicitud,
  EliminarGlosarioRespuesta,
  FiltroGlosarios,
  GlosarioRespuesta,
  GlosariosRespuesta,
  TerminoGlosarioRespuesta,
  TerminoGlosarioSolicitud,
} from '../models/glosario.model';

@Injectable({
  providedIn: 'root'
})
export class GlosarioService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/glosarios`;

  /**
   * Lista los glosarios del usuario. Con filtro de idiomas devuelve solo los del par indicado.
   * Endpoint: GET /api/v1/glosarios?idioma_origen=en&idioma_destino=es
   */
  listar(filtro: FiltroGlosarios = {}): Observable<GlosariosRespuesta> {
    let params = new HttpParams();
    if (filtro.idioma_origen) {
      params = params.set('idioma_origen', filtro.idioma_origen);
    }
    if (filtro.idioma_destino) {
      params = params.set('idioma_destino', filtro.idioma_destino);
    }
    return this.http.get<GlosariosRespuesta>(this.apiUrl, { params });
  }

  /** Endpoint: GET /api/v1/glosarios/{id} (incluye los terminos) */
  obtener(idGlosario: number): Observable<GlosarioRespuesta> {
    return this.http.get<GlosarioRespuesta>(`${this.apiUrl}/${idGlosario}`);
  }

  /** Endpoint: POST /api/v1/glosarios */
  crear(datos: CrearGlosarioSolicitud): Observable<GlosarioRespuesta> {
    return this.http.post<GlosarioRespuesta>(this.apiUrl, datos);
  }

  /** Endpoint: PATCH /api/v1/glosarios/{id} */
  actualizar(idGlosario: number, datos: ActualizarGlosarioSolicitud): Observable<GlosarioRespuesta> {
    return this.http.patch<GlosarioRespuesta>(`${this.apiUrl}/${idGlosario}`, datos);
  }

  /** Endpoint: DELETE /api/v1/glosarios/{id} */
  eliminar(idGlosario: number): Observable<EliminarGlosarioRespuesta> {
    return this.http.delete<EliminarGlosarioRespuesta>(`${this.apiUrl}/${idGlosario}`);
  }

  /** Endpoint: POST /api/v1/glosarios/{id}/terminos */
  agregarTermino(idGlosario: number, datos: TerminoGlosarioSolicitud): Observable<TerminoGlosarioRespuesta> {
    return this.http.post<TerminoGlosarioRespuesta>(`${this.apiUrl}/${idGlosario}/terminos`, datos);
  }

  /** Endpoint: PATCH /api/v1/glosarios/{id}/terminos/{id_termino} */
  actualizarTermino(
    idGlosario: number,
    idTermino: number,
    datos: ActualizarTerminoGlosarioSolicitud,
  ): Observable<TerminoGlosarioRespuesta> {
    return this.http.patch<TerminoGlosarioRespuesta>(
      `${this.apiUrl}/${idGlosario}/terminos/${idTermino}`,
      datos,
    );
  }

  /** Endpoint: DELETE /api/v1/glosarios/{id}/terminos/{id_termino} */
  eliminarTermino(idGlosario: number, idTermino: number): Observable<EliminarGlosarioRespuesta> {
    return this.http.delete<EliminarGlosarioRespuesta>(`${this.apiUrl}/${idGlosario}/terminos/${idTermino}`);
  }
}
