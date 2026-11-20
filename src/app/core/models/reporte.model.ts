// Reportes administrativos (HU-47) y exportacion (HU-48)

export type FormatoExportacion = 'pdf' | 'xlsx';

export type TipoServicio = 'texto' | 'documento' | 'conversacion' | 'sesion_externa';

export interface FiltroReporte {
  fecha_desde: string;
  fecha_hasta: string;
  zona_horaria: string;
  tipo_servicio?: TipoServicio | null;
  id_idioma_origen?: number | null;
  id_idioma_destino?: number | null;
  id_contexto?: number | null;
  pagina?: number;
  tamano_pagina?: number;
}

export interface FiltrosAplicados {
  fecha_desde: string;
  fecha_hasta: string;
  zona_horaria: string;
  tipo_servicio?: TipoServicio | null;
  id_idioma_origen?: number | null;
  nombre_idioma_origen?: string | null;
  id_idioma_destino?: number | null;
  nombre_idioma_destino?: string | null;
  id_contexto?: number | null;
  nombre_contexto?: string | null;
}

export interface TotalesReporte {
  total: number;
  texto: number;
  documento: number;
  conversacion: number;
  sesion_externa: number;
  sesion_externa_disponible: boolean;
}

export interface ActividadReporte {
  tipo_servicio: TipoServicio;
  id_registro: number;
  fecha: string;
  id_usuario: number;
  nombre_usuario: string;
  correo_usuario: string;
  idioma_origen?: string | null;
  idioma_destino?: string | null;
  contexto?: string | null;
  estado?: string | null;
  detalle?: string | null;
}

export interface ReporteActividad {
  filtros: FiltrosAplicados;
  totales: TotalesReporte;
  actividades: ActividadReporte[];
  pagina: number;
  tamano_pagina: number;
  total_paginas: number;
  fecha_generacion: string;
}

export interface ReporteActividadRespuesta {
  mensaje: string;
  resultado: ReporteActividad;
}
