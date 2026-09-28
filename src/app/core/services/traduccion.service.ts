import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  IdiomasRespuesta,
  RealizarTraduccionRespuesta,
  RealizarTraduccionSolicitud
} from '../models/traduccion.model';

@Injectable({
  providedIn: 'root'
})
export class TraduccionService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  obtenerIdiomas(): Observable<IdiomasRespuesta> {
    return this.http.get<IdiomasRespuesta>(`${this.apiUrl}/idiomas`);
  }

  traducir(solicitud: RealizarTraduccionSolicitud): Observable<RealizarTraduccionRespuesta> {
    return this.http.post<RealizarTraduccionRespuesta>(`${this.apiUrl}/traducciones`, solicitud);
  }
}
