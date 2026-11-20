import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  ActualizarSesionExternaSolicitud,
  AutorizacionRespuesta,
  CrearSesionExternaSolicitud,
  EstadoSesionExterna,
  IntervencionExternaRespuesta,
  IntervencionesExternasRespuesta,
  ParticipanteExternoRespuesta,
  Plataforma,
  PlataformaRespuesta,
  PlataformasRespuesta,
  SesionExternaRespuesta,
  SesionesExternasRespuesta,
  SincronizacionParticipantesRespuesta,
} from '../models/integracion.model';

export type AccionServicio = 'iniciar' | 'pausar' | 'reanudar' | 'finalizar';

/** Integraciones con Google Meet y Zoom (HU-35 a HU-41) */
@Injectable({
  providedIn: 'root'
})
export class IntegracionService {
  private readonly http = inject(HttpClient);
  private readonly integracionesUrl = `${environment.apiUrl}/integraciones`;
  private readonly sesionesUrl = `${environment.apiUrl}/sesiones-externas`;

  // ---------- Conexiones (HU-35) ----------

  /** Endpoint: GET /api/v1/integraciones */
  listarPlataformas(): Observable<PlataformasRespuesta> {
    return this.http.get<PlataformasRespuesta>(this.integracionesUrl);
  }

  /** Devuelve la URL de la pantalla oficial de autorizacion. Endpoint: POST /integraciones/{p}/autorizar */
  autorizar(plataforma: Plataforma): Observable<AutorizacionRespuesta> {
    return this.http.post<AutorizacionRespuesta>(`${this.integracionesUrl}/${plataforma}/autorizar`, {});
  }

  /** Revoca y elimina los tokens. Endpoint: DELETE /integraciones/{p} */
  desvincular(plataforma: Plataforma): Observable<PlataformaRespuesta> {
    return this.http.delete<PlataformaRespuesta>(`${this.integracionesUrl}/${plataforma}`);
  }

  // ---------- Sesiones externas (HU-36, HU-41) ----------

  listarSesiones(estado: EstadoSesionExterna | null = null): Observable<SesionesExternasRespuesta> {
    let params = new HttpParams();
    if (estado) {
      params = params.set('estado', estado);
    }
    return this.http.get<SesionesExternasRespuesta>(this.sesionesUrl, { params });
  }

  obtenerSesion(id: number): Observable<SesionExternaRespuesta> {
    return this.http.get<SesionExternaRespuesta>(`${this.sesionesUrl}/${id}`);
  }

  crearSesion(datos: CrearSesionExternaSolicitud): Observable<SesionExternaRespuesta> {
    return this.http.post<SesionExternaRespuesta>(this.sesionesUrl, datos);
  }

  actualizarSesion(id: number, datos: ActualizarSesionExternaSolicitud): Observable<SesionExternaRespuesta> {
    return this.http.patch<SesionExternaRespuesta>(`${this.sesionesUrl}/${id}`, datos);
  }

  /** iniciar | pausar | reanudar | finalizar: solo el servicio de traduccion, nunca la reunion */
  cambiarServicio(id: number, accion: AccionServicio): Observable<SesionExternaRespuesta> {
    return this.http.post<SesionExternaRespuesta>(`${this.sesionesUrl}/${id}/${accion}`, {});
  }

  // ---------- Participantes (HU-40) ----------

  agregarParticipante(id: number, nombre: string | null = null): Observable<ParticipanteExternoRespuesta> {
    return this.http.post<ParticipanteExternoRespuesta>(`${this.sesionesUrl}/${id}/participantes`, { nombre });
  }

  renombrarParticipante(id: number, idParticipante: number, nombre: string): Observable<ParticipanteExternoRespuesta> {
    return this.http.patch<ParticipanteExternoRespuesta>(`${this.sesionesUrl}/${id}/participantes/${idParticipante}`, { nombre });
  }

  sincronizarParticipantes(id: number): Observable<SincronizacionParticipantesRespuesta> {
    return this.http.post<SincronizacionParticipantesRespuesta>(`${this.sesionesUrl}/${id}/participantes/sincronizar`, {});
  }

  // ---------- Captura, traduccion y subtitulos (HU-37 a HU-39) ----------

  /** Envia un fragmento de audio de la reunion. Endpoint: POST /sesiones-externas/{id}/audio (multipart) */
  enviarAudio(id: number, audio: Blob, idParticipante: number | null): Observable<IntervencionExternaRespuesta> {
    const formulario = new FormData();
    const extension = audio.type.includes('ogg') ? 'ogg' : 'webm';
    formulario.append('audio', audio, `fragmento.${extension}`);
    if (idParticipante !== null) {
      formulario.append('id_participante', String(idParticipante));
    }
    return this.http.post<IntervencionExternaRespuesta>(`${this.sesionesUrl}/${id}/audio`, formulario);
  }

  listarIntervenciones(id: number, despuesDe: number | null = null): Observable<IntervencionesExternasRespuesta> {
    let params = new HttpParams();
    if (despuesDe !== null) {
      params = params.set('despues_de', despuesDe);
    }
    return this.http.get<IntervencionesExternasRespuesta>(`${this.sesionesUrl}/${id}/intervenciones`, { params });
  }

  reintentarIntervencion(id: number, idIntervencion: number): Observable<IntervencionExternaRespuesta> {
    return this.http.post<IntervencionExternaRespuesta>(`${this.sesionesUrl}/${id}/intervenciones/${idIntervencion}/reintentar`, {});
  }

  asignarParticipante(id: number, idIntervencion: number, idParticipante: number | null): Observable<IntervencionExternaRespuesta> {
    return this.http.patch<IntervencionExternaRespuesta>(`${this.sesionesUrl}/${id}/intervenciones/${idIntervencion}`, {
      id_participante: idParticipante,
    });
  }
}
