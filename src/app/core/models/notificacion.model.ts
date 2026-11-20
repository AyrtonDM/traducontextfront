// Espejo de app/schemas/notificacion.py (traducontextback)

export interface Notificacion {
  id_notificacion: number;
  tipo: string;
  titulo: string;
  cuerpo: string;
  datos: Record<string, unknown> | null;
  leida: boolean;
  fecha_creacion: string;
  fecha_lectura: string | null;
}

export interface ListaNotificacionesPaginada {
  elementos: Notificacion[];
  total: number;
  no_leidas: number;
  pagina: number;
  tamano_pagina: number;
  total_paginas: number;
}

export interface ListaNotificacionesRespuesta {
  mensaje: string;
  resultado: ListaNotificacionesPaginada;
}

export interface NotificacionRespuesta {
  mensaje: string;
  resultado: Notificacion;
}

export interface MarcarLeidasRespuesta {
  mensaje: string;
  resultado: { actualizadas: number };
}

export interface RegistrarDispositivoSolicitud {
  token_fcm: string;
  plataforma: 'android' | 'ios' | 'web';
}
