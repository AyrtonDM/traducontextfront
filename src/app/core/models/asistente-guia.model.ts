export type RolMensajeGuia = 'assistant' | 'user';

export interface MensajeHistorialGuia {
  rol: RolMensajeGuia;
  contenido: string;
}

export interface MensajeChatGuia {
  rol: RolMensajeGuia;
  contenido: string;
  fecha: Date;
}

export interface BienvenidaGuiaResultado {
  saludo: string;
  vista_actual: string;
  sugerencias_iniciales: string[];
}

export interface BienvenidaGuiaRespuesta {
  mensaje: string;
  resultado: BienvenidaGuiaResultado;
}

export interface PreguntarGuiaSolicitud {
  pregunta: string;
  vista_actual: string;
  historial: MensajeHistorialGuia[];
}

export interface PreguntarGuiaResultado {
  respuesta: string;
  sugerencias: string[];
  es_tema_sistema?: boolean;
}

export interface PreguntarGuiaRespuesta {
  mensaje: string;
  resultado: PreguntarGuiaResultado;
}
