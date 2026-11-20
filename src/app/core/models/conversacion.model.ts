/** Entorno de una conversacion (HU-24): reunion, conferencia, clase, entrevista, conversacion informal */
export interface EntornoItem {
  id_entorno: number;
  nombre: string;
  descripcion?: string | null;
  activo: boolean;
}

export interface EntornosRespuesta {
  mensaje: string;
  resultado: EntornoItem[];
}

/** Estado de una sesion de conversacion (HU-23) */
export type EstadoConversacion = 'activa' | 'pausada' | 'finalizada';

/** Participante de una conversacion (HU-31): el 1 habla el idioma de origen y el 2 el de destino */
export interface ParticipanteConversacion {
  id_participante: number;
  id_conversacion: number;
  nombre: string;
  orden: number;
  id_idioma: number;
  codigo_idioma?: string | null;
  nombre_idioma?: string | null;
}

export interface ParticipanteRespuesta {
  mensaje: string;
  resultado: ParticipanteConversacion;
}

export interface ParticipantesRespuesta {
  mensaje: string;
  resultado: ParticipanteConversacion[];
}

export interface Conversacion {
  id_conversacion: number;
  id: number;
  estado: EstadoConversacion;
  id_idioma_origen: number;
  id_idioma_destino: number;
  codigo_idioma_origen?: string | null;
  codigo_idioma_destino?: string | null;
  nombre_idioma_origen?: string | null;
  nombre_idioma_destino?: string | null;
  id_contexto?: number | null;
  nombre_contexto?: string | null;
  id_entorno: number;
  nombre_entorno?: string | null;
  id_tono?: number | null;
  nombre_tono?: string | null;
  /** HU-32: glosario de la sesion; se aplica solo en su sentido (par_idiomas_glosario, p. ej. "ES → EN") */
  id_glosario?: number | null;
  nombre_glosario?: string | null;
  par_idiomas_glosario?: string | null;
  descripcion_contexto?: string | null;
  mantener_contexto: boolean;
  asistencia_conversacional: boolean;
  participantes: ParticipanteConversacion[];
  fecha_inicio: string;
  fecha_actualizacion?: string | null;
  fecha_fin?: string | null;
}

export interface ConversacionRespuesta {
  mensaje: string;
  resultado: Conversacion;
}

export interface ConversacionesRespuesta {
  mensaje: string;
  resultado: Conversacion[];
}

export interface IniciarConversacionSolicitud {
  id_idioma_origen: number;
  id_idioma_destino: number;
  id_contexto?: number | null;
  id_entorno: number;
  id_tono?: number | null;
  id_glosario?: number | null;
  descripcion_contexto?: string | null;
  mantener_contexto: boolean;
  asistencia_conversacional: boolean;
}

/** PATCH parcial: solo se envian los campos que cambiaron. Los idiomas no se modifican. */
export interface ActualizarConversacionSolicitud {
  id_entorno?: number;
  id_contexto?: number | null;
  id_tono?: number | null;
  id_glosario?: number | null;
  descripcion_contexto?: string | null;
  mantener_contexto?: boolean;
  asistencia_conversacional?: boolean;
}

/**
 * Asistencia conversacional (HU-30), bajo demanda.
 * - explicacion: explica una intervencion (expresiones, referencias, intencion) a quien la escucha.
 * - sugerencias: posibles respuestas a una intervencion para quien la escucha.
 * - como_decir: formas de expresar una idea en el idioma de un participante segun el entorno.
 */
export type TipoAsistencia = 'explicacion' | 'sugerencias' | 'como_decir';

export interface SolicitudAsistencia {
  tipo: TipoAsistencia;
  /** Sin valor se usa la ultima intervencion traducida */
  id_intervencion?: number | null;
  /** Obligatorio en 'como_decir' */
  id_participante?: number | null;
  /** Idea a expresar, obligatoria en 'como_decir' */
  texto?: string | null;
}

/** En 'explicacion': texto = expresion y nota = explicacion. En el resto: texto = frase propuesta. */
export interface ElementoAsistencia {
  texto: string;
  traduccion?: string | null;
  nota?: string | null;
}

export interface ResultadoAsistencia {
  tipo: TipoAsistencia;
  id_conversacion: number;
  id_intervencion?: number | null;
  /** Participante que diria las frases propuestas (sugerencias y como_decir) */
  id_participante?: number | null;
  nombre_participante?: string | null;
  /** Idioma en que esta redactada la asistencia */
  codigo_idioma?: string | null;
  nombre_idioma?: string | null;
  resumen?: string | null;
  elementos: ElementoAsistencia[];
}

export interface AsistenciaRespuesta {
  mensaje: string;
  resultado: ResultadoAsistencia;
}
