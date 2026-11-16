import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  EliminarTraduccionRespuesta,
  FavoritoRespuesta,
  FiltrosHistorial,
  HistorialRespuesta,
} from '../models/historial.model';

@Injectable({ providedIn: 'root' })
export class HistorialService {

  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  /**
   * Obtiene el historial de traducciones del usuario autenticado aplicando los filtros.
   * El interceptor añade el header Authorization automáticamente.
   * Endpoint: GET /traducciones/historial
   */
  obtenerHistorial(filtros?: FiltrosHistorial): Observable<HistorialRespuesta> {
    let params = new HttpParams();
    if (filtros) {
      if (filtros.busqueda.trim()) params = params.set('texto', filtros.busqueda.trim());
      if (filtros.idiomaOrigen) params = params.set('idioma_origen', filtros.idiomaOrigen);
      if (filtros.idiomaDestino) params = params.set('idioma_destino', filtros.idiomaDestino);
      if (filtros.fechaDesde) params = params.set('fecha_desde', filtros.fechaDesde);
      if (filtros.fechaHasta) params = params.set('fecha_hasta', filtros.fechaHasta);
      if (filtros.soloFavoritos) params = params.set('solo_favoritos', 'true');
    }
    return this.http.get<HistorialRespuesta>(`${this.apiUrl}/traducciones/historial`, { params });
  }

  /**
   * Marca o retira una traducción de favoritos.
   * Endpoint: PATCH /traducciones/{id}/favorito
   */
  marcarFavorito(idTraduccion: number, favorito: boolean): Observable<FavoritoRespuesta> {
    return this.http.patch<FavoritoRespuesta>(
      `${this.apiUrl}/traducciones/${idTraduccion}/favorito`,
      { favorito }
    );
  }

  /**
   * Elimina una traducción del historial.
   * Endpoint: DELETE /traducciones/{id}
   */
  eliminarTraduccion(idTraduccion: number): Observable<EliminarTraduccionRespuesta> {
    return this.http.delete<EliminarTraduccionRespuesta>(`${this.apiUrl}/traducciones/${idTraduccion}`);
  }
}
