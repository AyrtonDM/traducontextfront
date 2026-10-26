import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  ContextosRespuesta,
  CrearContextoRespuesta,
  CrearContextoSolicitud,
  GuardarConfiguracionSolicitud,
  IdiomasRespuesta,
  RealizarTraduccionRespuesta,
  RealizarTraduccionSolicitud,
  RespuestaConfiguracionTraduccion,
  TonosRespuesta,
  VariantesRegionalesRespuesta
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

  obtenerContextos(): Observable<ContextosRespuesta> {
    return this.http.get<ContextosRespuesta>(`${this.apiUrl}/contextos`);
  }

  obtenerTonos(): Observable<TonosRespuesta> {
    return this.http.get<TonosRespuesta>(`${this.apiUrl}/tonos`);
  }

  obtenerVariantesRegionales(idIdioma?: number): Observable<VariantesRegionalesRespuesta> {
    const options = idIdioma !== undefined && idIdioma !== null
      ? { params: { id_idioma: idIdioma.toString() } }
      : {};
    return this.http.get<VariantesRegionalesRespuesta>(`${this.apiUrl}/variantes-regionales`, options);
  }

  crearContexto(datos: CrearContextoSolicitud): Observable<CrearContextoRespuesta> {
    return this.http.post<CrearContextoRespuesta>(`${this.apiUrl}/contextos`, datos);
  }

  traducir(solicitud: RealizarTraduccionSolicitud): Observable<RealizarTraduccionRespuesta> {
    return this.http.post<RealizarTraduccionRespuesta>(`${this.apiUrl}/traducciones`, solicitud);
  }

  guardarConfiguracion(datos: GuardarConfiguracionSolicitud): Observable<RespuestaConfiguracionTraduccion> {
    return this.http.post<RespuestaConfiguracionTraduccion>(`${this.apiUrl}/configuracion-traduccion`, datos);
  }

  obtenerConfiguracion(): Observable<RespuestaConfiguracionTraduccion> {
    return this.http.get<RespuestaConfiguracionTraduccion>(`${this.apiUrl}/configuracion-traduccion`);
  }
}
