import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  SolicitudTraduccionContextual,
  RespuestaTraduccionContextual,
  RespuestaHistorialTraducciones,
  RespuestaIdiomas,
} from '../models/traduccion.model';

@Injectable({
  providedIn: 'root',
})
export class TraduccionService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  traducir(datos: SolicitudTraduccionContextual): Observable<RespuestaTraduccionContextual> {
    return this.http.post<RespuestaTraduccionContextual>(
      `${this.apiUrl}/traducciones/traducir`,
      datos
    );
  }

  obtenerRecientes(): Observable<RespuestaHistorialTraducciones> {
    return this.http.get<RespuestaHistorialTraducciones>(
      `${this.apiUrl}/traducciones/recientes`
    );
  }

  obtenerIdiomas(): Observable<RespuestaIdiomas> {
    return this.http.get<RespuestaIdiomas>(
      `${this.apiUrl}/traducciones/idiomas`
    );
  }
}
