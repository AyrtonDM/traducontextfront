export interface DocumentoCargado {
  id_documento: number;
  nombre: string;
  tipo_mime: string;
  extension: string;
  tamano: number;
  ruta_archivo: string;
  fecha_carga: string;
  id_usuario: number;
  id_idioma_origen: number;
  codigo_idioma_origen: string;
  nombre_idioma_origen: string;
  id_configuracion_traduccion: number;

  // Propiedades de interacción en UI
  seleccionado?: boolean;
  idioma_origen_seleccionado?: string;
  idioma_destino_seleccionado?: string;
  traduciendo?: boolean;
  eliminando?: boolean;
}

export interface SubirDocumentoRespuesta {
  mensaje: string;
  resultado: DocumentoCargado;
}

export interface DocumentosCargadosRespuesta {
  mensaje: string;
  resultado: DocumentoCargado[];
}

export interface TraducirDocumentoSolicitud {
  id_documento: number;
  idioma_destino: string;
  idioma_origen?: string | null;
}

export interface DocumentoTraducido {
  id_traduccion_documento: number;
  id_documento: number;
  nombre: string;
  extension: string;
  estado: string;
  fecha: string;
  ruta_archivo: string;
  id_usuario: number;
  id_idioma_origen: number;
  id_idioma_destino: number;
  codigo_idioma_origen: string;
  codigo_idioma_destino: string;
  nombre_idioma_origen: string;
  nombre_idioma_destino: string;
  nombre_documento_original: string;
  url_descarga: string;

  // Propiedades de interacción en UI
  seleccionado?: boolean;
  descargando?: boolean;
  eliminando?: boolean;
}

export interface TraducirDocumentoRespuesta {
  mensaje: string;
  resultado: DocumentoTraducido;
}

export interface DocumentosTraducidosRespuesta {
  mensaje: string;
  resultado: DocumentoTraducido[];
}

export interface EliminarRespuesta {
  mensaje: string;
  resultado: null;
}
