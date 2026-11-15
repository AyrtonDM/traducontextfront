import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { HistorialRespuesta } from '../models/historial.model';

@Injectable({ providedIn: 'root' })
export class HistorialService {

  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  /**
   * Obtiene el historial de traducciones del usuario autenticado.
   * El interceptor añade el header Authorization automáticamente.
   * Endpoint esperado en el backend: GET /traducciones/historial
   */
  obtenerHistorial(): Observable<HistorialRespuesta> {
    return this.http.get<HistorialRespuesta>(`${this.apiUrl}/traducciones/historial`);
  }
}

