import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  ActualizarConversacionSolicitud,
  AsistenciaRespuesta,
  ConversacionRespuesta,
  ConversacionesRespuesta,
  EntornosRespuesta,
  EstadoConversacion,
  IniciarConversacionSolicitud,
  ParticipanteRespuesta,
  SolicitudAsistencia,
} from '../models/conversacion.model';
import {
  CrearIntervencionSolicitud,
  IntervencionRespuesta,
  IntervencionesRespuesta,
} from '../models/intervencion.model';

@Injectable({
  providedIn: 'root'
})
export class ConversacionService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/conversaciones`;
  private readonly entornosUrl = `${environment.apiUrl}/entornos`;

  /**
   * Lista los entornos activos (HU-24).
   * Endpoint: GET /api/v1/entornos
   */
  listarEntornos(): Observable<EntornosRespuesta> {
    return this.http.get<EntornosRespuesta>(this.entornosUrl);
  }

  /**
   * Lista las conversaciones del usuario, de la mas reciente a la mas antigua.
   * Endpoint: GET /api/v1/conversaciones?estado=activa
   */
  listar(estado: EstadoConversacion | null = null): Observable<ConversacionesRespuesta> {
    let params = new HttpParams();
    if (estado) {
      params = params.set('estado', estado);
    }
    return this.http.get<ConversacionesRespuesta>(this.apiUrl, { params });
  }

  /** Endpoint: GET /api/v1/conversaciones/{id} */
  obtener(idConversacion: number): Observable<ConversacionRespuesta> {
    return this.http.get<ConversacionRespuesta>(`${this.apiUrl}/${idConversacion}`);
  }

  /** Endpoint: POST /api/v1/conversaciones */
  iniciar(datos: IniciarConversacionSolicitud): Observable<ConversacionRespuesta> {
    return this.http.post<ConversacionRespuesta>(this.apiUrl, datos);
  }

  /**
   * Modifica la configuracion de una sesion no finalizada (entorno, contexto, tono, descripcion y opciones).
   * Endpoint: PATCH /api/v1/conversaciones/{id}
   */
  actualizar(idConversacion: number, datos: ActualizarConversacionSolicitud): Observable<ConversacionRespuesta> {
    return this.http.patch<ConversacionRespuesta>(`${this.apiUrl}/${idConversacion}`, datos);
  }

  /** Endpoint: POST /api/v1/conversaciones/{id}/pausar */
  pausar(idConversacion: number): Observable<ConversacionRespuesta> {
    return this.http.post<ConversacionRespuesta>(`${this.apiUrl}/${idConversacion}/pausar`, {});
  }

  /** Endpoint: POST /api/v1/conversaciones/{id}/reanudar */
  reanudar(idConversacion: number): Observable<ConversacionRespuesta> {
    return this.http.post<ConversacionRespuesta>(`${this.apiUrl}/${idConversacion}/reanudar`, {});
  }

  /** Endpoint: POST /api/v1/conversaciones/{id}/finalizar */
  finalizar(idConversacion: number): Observable<ConversacionRespuesta> {
    return this.http.post<ConversacionRespuesta>(`${this.apiUrl}/${idConversacion}/finalizar`, {});
  }

  /** Renombra un participante (HU-31). Endpoint: PATCH /api/v1/conversaciones/{id}/participantes/{idParticipante} */
  renombrarParticipante(idConversacion: number, idParticipante: number, nombre: string): Observable<ParticipanteRespuesta> {
    return this.http.patch<ParticipanteRespuesta>(
      `${this.apiUrl}/${idConversacion}/participantes/${idParticipante}`,
      { nombre },
    );
  }

  /**
   * Registra y traduce una intervencion escrita. Si la traduccion falla, llega en estado 'error' (201).
   * Endpoint: POST /api/v1/conversaciones/{id}/intervenciones
   */
  registrarIntervencion(idConversacion: number, datos: CrearIntervencionSolicitud): Observable<IntervencionRespuesta> {
    return this.http.post<IntervencionRespuesta>(`${this.apiUrl}/${idConversacion}/intervenciones`, datos);
  }

  /**
   * Intervenciones en orden ascendente; con `despuesDe` solo las posteriores a ese id.
   * Endpoint: GET /api/v1/conversaciones/{id}/intervenciones?despues_de=
   */
  listarIntervenciones(idConversacion: number, despuesDe: number | null = null): Observable<IntervencionesRespuesta> {
    let params = new HttpParams();
    if (despuesDe !== null) {
      params = params.set('despues_de', despuesDe);
    }
    return this.http.get<IntervencionesRespuesta>(`${this.apiUrl}/${idConversacion}/intervenciones`, { params });
  }

  /** Endpoint: POST /api/v1/conversaciones/{id}/intervenciones/{idIntervencion}/reintentar */
  reintentarIntervencion(idConversacion: number, idIntervencion: number): Observable<IntervencionRespuesta> {
    return this.http.post<IntervencionRespuesta>(
      `${this.apiUrl}/${idConversacion}/intervenciones/${idIntervencion}/reintentar`,
      {},
    );
  }

  /**
   * Asistencia conversacional bajo demanda (HU-30). No modifica la sesion.
   * Endpoint: POST /api/v1/conversaciones/{id}/asistencia
   */
  solicitarAsistencia(idConversacion: number, datos: SolicitudAsistencia): Observable<AsistenciaRespuesta> {
    return this.http.post<AsistenciaRespuesta>(`${this.apiUrl}/${idConversacion}/asistencia`, datos);
  }
}
