// Respuesta del backend: GET /traducciones/historial
export interface TraduccionHistorial {
  id_traduccion: number;
  texto_original: string;
  texto_traducido: string;
  fecha_creacion: string;           // ISO 8601
  idioma_origen: string;            // código BCP-47 ej. "en"
  idioma_destino: string;           // código BCP-47 ej. "es"
  nombre_contexto: string | null;
  nombre_tono: string | null;
  nombre_variante_regional: string | null;
  explicar_expresiones: boolean;
  generar_alternativas: boolean;
  analisis_contextual: Record<string, unknown> | null;
}

export interface HistorialRespuesta {
  mensaje: string;
  resultado: TraduccionHistorial[];
}

// Estado de UI para los filtros
export interface FiltrosHistorial {
  busqueda: string;
  idiomaOrigen: string;   // '' = todos
  idiomaDestino: string;  // '' = todos
  contexto: string;       // '' = todos
  periodo: 'hoy' | 'semana' | 'mes' | 'todos';
}

