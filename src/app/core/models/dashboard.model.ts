// Dashboard administrativo (HU-46)

export type AgrupacionDashboard = 'dia' | 'mes';

export interface FiltroDashboard {
  fecha_desde?: string | null;
  fecha_hasta?: string | null;
  zona_horaria: string;
}

export interface PeriodoDashboard {
  fecha_desde: string;
  fecha_hasta: string;
  zona_horaria: string;
  agrupacion: AgrupacionDashboard;
}

export interface IndicadoresUsuarios {
  total: number;
  activos_periodo: number;
  nuevos_periodo: number;
}

export interface IndicadoresActividad {
  traducciones_texto: number;
  documentos_traducidos: number;
  conversaciones: number;
  sesiones_externas: number;
  sesiones_externas_disponible: boolean;
}

export interface IdiomaUso {
  id_idioma: number;
  nombre: string;
  codigo: string;
  total: number;
}

export interface ContextoUso {
  id_contexto: number;
  nombre: string;
  total: number;
}

export interface PuntoEvolucion {
  fecha: string;
  traducciones_texto: number;
  documentos: number;
  conversaciones: number;
}

export interface DashboardResultado {
  periodo: PeriodoDashboard;
  usuarios: IndicadoresUsuarios;
  actividad: IndicadoresActividad;
  idiomas_mas_utilizados: IdiomaUso[];
  contextos_mas_utilizados: ContextoUso[];
  evolucion: PuntoEvolucion[];
}

export interface DashboardRespuesta {
  mensaje: string;
  resultado: DashboardResultado;
}
