/** Estado de una intervencion escrita de una conversacion (B3) */
export type EstadoIntervencion = 'procesando' | 'traducida' | 'error';

/** Longitud maxima del texto de una intervencion (igual que el backend) */
export const LONGITUD_MAXIMA_INTERVENCION = 2000;

/** Intervencion de un participante: texto original y su traduccion al idioma del otro participante */
export interface Intervencion {
  id_intervencion: number;
  id: number;
  id_conversacion: number;
  id_participante?: number | null;
  nombre_participante?: string | null;
  orden_participante?: number | null;
  orden: number;
  texto_original: string;
  texto_traducido?: string | null;
  id_idioma_origen: number;
  id_idioma_destino: number;
  codigo_idioma_origen?: string | null;
  codigo_idioma_destino?: string | null;
  nombre_idioma_origen?: string | null;
  nombre_idioma_destino?: string | null;
  estado: EstadoIntervencion;
  mensaje_error?: string | null;
  fecha_creacion: string;
  fecha_actualizacion?: string | null;
}

/** El participante que habla se indica explicitamente; el usuario sale del token */
export interface CrearIntervencionSolicitud {
  id_participante: number;
  texto: string;
}

export interface IntervencionRespuesta {
  mensaje: string;
  resultado: Intervencion;
}

export interface IntervencionesRespuesta {
  mensaje: string;
  resultado: Intervencion[];
}
