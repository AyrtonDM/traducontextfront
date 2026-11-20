/** Integracion con Google Meet y Zoom (HU-35 a HU-41) */

export type Plataforma = 'google_meet' | 'zoom';
export type EstadoConexion = 'vinculada' | 'no_vinculada' | 'expirada';

export interface PermisoPlataforma {
  alcance: string;
  descripcion: string;
}

export interface PlataformaDetalle {
  plataforma: Plataforma;
  nombre: string;
  /** false si el servidor no tiene las credenciales OAuth de la plataforma */
  configurada: boolean;
  estado: EstadoConexion;
  cuenta_externa: string | null;
  fecha_vinculacion: string | null;
  permisos: PermisoPlataforma[];
}

export interface PlataformasRespuesta {
  mensaje: string;
  resultado: PlataformaDetalle[];
}

export interface PlataformaRespuesta {
  mensaje: string;
  resultado: PlataformaDetalle;
}

export interface AutorizacionRespuesta {
  mensaje: string;
  resultado: { plataforma: Plataforma; url_autorizacion: string; permisos: PermisoPlataforma[] };
}

// ---------- Sesiones externas ----------

export type EstadoSesionExterna = 'configurada' | 'activa' | 'pausada' | 'finalizada';

export interface ParticipanteExterno {
  id_participante: number;
  id_sesion_externa: number;
  nombre: string;
  orden: number;
  /** Etiqueta generica renombrable ('Participante N') */
  generico: boolean;
  desde_plataforma: boolean;
}

export interface SesionExterna {
  id: number;
  id_sesion_externa: number;
  plataforma: Plataforma;
  nombre_plataforma: string;
  enlace_reunion: string;
  referencia_reunion: string;
  url_reunion: string;
  estado: EstadoSesionExterna;
  id_idioma_origen: number;
  id_idioma_destino: number;
  codigo_idioma_origen: string | null;
  codigo_idioma_destino: string | null;
  nombre_idioma_origen: string | null;
  nombre_idioma_destino: string | null;
  id_entorno: number;
  nombre_entorno: string | null;
  id_contexto: number | null;
  nombre_contexto: string | null;
  id_tono: number | null;
  nombre_tono: string | null;
  id_glosario: number | null;
  nombre_glosario: string | null;
  par_idiomas_glosario: string | null;
  descripcion_contexto: string | null;
  participantes: ParticipanteExterno[];
  total_intervenciones: number;
  fecha_creacion: string;
  fecha_inicio: string | null;
  fecha_actualizacion: string | null;
  fecha_fin: string | null;
}

export interface SesionExternaRespuesta {
  mensaje: string;
  resultado: SesionExterna;
}

export interface SesionesExternasRespuesta {
  mensaje: string;
  resultado: SesionExterna[];
}

export interface CrearSesionExternaSolicitud {
  plataforma: Plataforma;
  enlace_reunion: string;
  id_idioma_origen: number;
  id_idioma_destino: number;
  id_entorno: number;
  id_contexto?: number | null;
  id_tono?: number | null;
  id_glosario?: number | null;
  descripcion_contexto?: string | null;
}

/** PATCH parcial; enlace e idiomas solo antes de iniciar */
export type ActualizarSesionExternaSolicitud = Partial<Omit<CrearSesionExternaSolicitud, 'plataforma'>>;

export interface ParticipanteExternoRespuesta {
  mensaje: string;
  resultado: ParticipanteExterno;
}

export interface SincronizacionParticipantesRespuesta {
  mensaje: string;
  resultado: {
    disponible: boolean;
    agregados: number;
    aviso: string | null;
    participantes: ParticipanteExterno[];
  };
}

export type EstadoIntervencionExterna = 'procesando' | 'traducida' | 'error';

export interface IntervencionExterna {
  id: number;
  id_intervencion: number;
  id_sesion_externa: number;
  id_participante: number | null;
  /** null = no se pudo determinar el hablante */
  nombre_participante: string | null;
  orden: number;
  texto_original: string;
  texto_traducido: string | null;
  codigo_idioma_origen: string | null;
  codigo_idioma_destino: string | null;
  nombre_idioma_origen: string | null;
  nombre_idioma_destino: string | null;
  estado: EstadoIntervencionExterna;
  mensaje_error: string | null;
  fecha_creacion: string;
  fecha_actualizacion: string | null;
}

export interface IntervencionExternaRespuesta {
  mensaje: string;
  /** null si el fragmento no tenia voz */
  resultado: IntervencionExterna | null;
}

export interface IntervencionesExternasRespuesta {
  mensaje: string;
  resultado: IntervencionExterna[];
}
