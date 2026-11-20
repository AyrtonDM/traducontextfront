import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { FiltroReporte, FormatoExportacion, ReporteActividadRespuesta } from '../models/reporte.model';

/** Reportes administrativos (HU-47) y su exportacion (HU-48). Requiere el permiso generar_reportes. */
@Injectable({
  providedIn: 'root'
})
export class ReportesService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/reportes`;

  /** Endpoint: GET /api/v1/reportes/actividad (todos los filtros son opcionales y se combinan) */
  generarActividad(filtro: FiltroReporte): Observable<ReporteActividadRespuesta> {
    return this.http.get<ReporteActividadRespuesta>(`${this.apiUrl}/actividad`, {
      params: this.armarParametros(filtro),
    });
  }

  /**
   * Endpoint: GET /api/v1/reportes/actividad/exportar?formato=pdf|xlsx (mismos filtros del reporte).
   * Devuelve la respuesta completa para leer el nombre del archivo de Content-Disposition.
   */
  exportarActividad(filtro: FiltroReporte, formato: FormatoExportacion): Observable<HttpResponse<Blob>> {
    const { pagina, tamano_pagina, ...filtros } = filtro;
    return this.http.get(`${this.apiUrl}/actividad/exportar`, {
      params: this.armarParametros(filtros).set('formato', formato),
      responseType: 'blob',
      observe: 'response',
    });
  }

  private armarParametros(filtro: Partial<FiltroReporte>): HttpParams {
    let params = new HttpParams();
    for (const [clave, valor] of Object.entries(filtro)) {
      if (valor !== null && valor !== undefined && valor !== '') {
        params = params.set(clave, String(valor));
      }
    }
    return params;
  }
}
