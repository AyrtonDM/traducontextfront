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
  descripcion_contexto?: string | null;
  mantener_contexto: boolean;
  asistencia_conversacional: boolean;
}

/** PATCH parcial: solo se envian los campos que cambiaron. Los idiomas no se modifican. */
export interface ActualizarConversacionSolicitud {
  id_entorno?: number;
  id_contexto?: number | null;
  id_tono?: number | null;
  descripcion_contexto?: string | null;
  mantener_contexto?: boolean;
  asistencia_conversacional?: boolean;
}
