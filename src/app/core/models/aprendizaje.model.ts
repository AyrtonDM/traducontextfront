/** Aprendizaje de preferencias (HU-34) */

export type TipoCorreccion = 'correccion' | 'alternativa';

export interface EstadoAprendizaje {
  activo: boolean;
  total_correcciones: number;
}

export interface EstadoAprendizajeRespuesta {
  mensaje: string;
  resultado: EstadoAprendizaje;
}

/** Idiomas por codigo, como en /traducciones */
export interface RegistrarCorreccionSolicitud {
  tipo: TipoCorreccion;
  texto_original: string;
  traduccion_generada: string;
  traduccion_corregida: string;
  idioma_origen: string;
  idioma_destino: string;
}

export interface CorreccionTraduccion {
  id: number;
  id_correccion: number;
  tipo: TipoCorreccion;
  texto_original: string;
  traduccion_generada: string;
  traduccion_corregida: string;
  codigo_idioma_origen: string | null;
  codigo_idioma_destino: string | null;
  nombre_idioma_origen: string | null;
  nombre_idioma_destino: string | null;
  fecha_creacion: string;
  fecha_actualizacion: string | null;
}

export interface CorreccionRespuesta {
  mensaje: string;
  /** null si el aprendizaje esta desactivado (no se registro) */
  resultado: CorreccionTraduccion | null;
}

export interface CorreccionesRespuesta {
  mensaje: string;
  resultado: CorreccionTraduccion[];
}

export interface EliminarCorreccionesRespuesta {
  mensaje: string;
  resultado: { eliminadas: number };
}

export interface FiltroCorrecciones {
  idioma_origen?: string | null;
  idioma_destino?: string | null;
}
