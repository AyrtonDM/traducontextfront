import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  DocumentoCargado,
  DocumentosCargadosRespuesta,
  DocumentoTraducido,
  DocumentosTraducidosRespuesta,
  EliminarRespuesta,
  SubirDocumentoRespuesta,
  TraducirDocumentoRespuesta,
  TraducirDocumentoSolicitud,
} from '../models/documentos.model';

@Injectable({
  providedIn: 'root'
})
export class DocumentosService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  /**
   * Obtiene la URL base del backend sin el sufijo /api/v1
   */
  get backendBaseUrl(): string {
    return this.apiUrl.replace(/\/api\/v1\/?$/, '');
  }

  /**
   * Sube un documento mediante multipart/form-data con el campo 'archivo'
   * Endpoint: POST /api/v1/documentos/subir
   */
  subirDocumento(archivo: File): Observable<SubirDocumentoRespuesta> {
    const formData = new FormData();
    formData.append('archivo', archivo, archivo.name);
    return this.http.post<SubirDocumentoRespuesta>(`${this.apiUrl}/documentos/subir`, formData);
  }

  /**
   * Obtiene la lista de documentos cargados por el usuario
   * Endpoint: GET /api/v1/documentos
   */
  obtenerDocumentosCargados(): Observable<DocumentosCargadosRespuesta> {
    return this.http.get<DocumentosCargadosRespuesta>(`${this.apiUrl}/documentos`);
  }

  /**
   * Traduce un documento específico
   * Endpoint: POST /api/v1/documentos/traducir
   */
  traducirDocumento(solicitud: TraducirDocumentoSolicitud): Observable<TraducirDocumentoRespuesta> {
    return this.http.post<TraducirDocumentoRespuesta>(`${this.apiUrl}/documentos/traducir`, solicitud);
  }

  /**
   * Obtiene la lista de documentos ya traducidos
   * Endpoint: GET /api/v1/documentos/traducidos
   */
  obtenerDocumentosTraducidos(): Observable<DocumentosTraducidosRespuesta> {
    return this.http.get<DocumentosTraducidosRespuesta>(`${this.apiUrl}/documentos/traducidos`);
  }

  /**
   * Descarga un archivo binario desde la URL especificada
   */
  descargarArchivo(url: string): Observable<Blob> {
    return this.http.get(url, { responseType: 'blob' });
  }

  /**
   * Construye la URL de descarga para un documento traducido
   * Endpoint: GET <url del back>/documentos/traducido/<nombre_archivo>
   */
  obtenerUrlDescarga(documento: DocumentoTraducido): string {
    if (documento.url_descarga) {
      if (documento.url_descarga.startsWith('http://') || documento.url_descarga.startsWith('https://')) {
        return documento.url_descarga;
      }
      const ruta = documento.url_descarga.startsWith('/') ? documento.url_descarga : `/${documento.url_descarga}`;
      return `${this.backendBaseUrl}${ruta}`;
    }

    if (documento.ruta_archivo) {
      if (documento.ruta_archivo.startsWith('http://') || documento.ruta_archivo.startsWith('https://')) {
        return documento.ruta_archivo;
      }
      const ruta = documento.ruta_archivo.startsWith('/') ? documento.ruta_archivo : `/${documento.ruta_archivo}`;
      return `${this.backendBaseUrl}${ruta}`;
    }

    return `${this.backendBaseUrl}/documentos/traducido/${encodeURIComponent(documento.nombre)}`;
  }

  /**
   * Elimina un documento original cargado y sus archivos físicos
   * Endpoint: DELETE /api/v1/documentos/{id_documento}
   */
  eliminarDocumentoCargado(idDocumento: number): Observable<EliminarRespuesta> {
    return this.http.delete<EliminarRespuesta>(`${this.apiUrl}/documentos/${idDocumento}`);
  }

  /**
   * Elimina un documento traducido y su archivo físico
   * Endpoint: DELETE /api/v1/documentos/traducidos/{id_traduccion_documento}
   */
  eliminarDocumentoTraducido(idTraduccionDocumento: number): Observable<EliminarRespuesta> {
    return this.http.delete<EliminarRespuesta>(`${this.apiUrl}/documentos/traducidos/${idTraduccionDocumento}`);
  }
}
