import { TerminoAplicado } from './glosario.model';

export interface ContextoItem {
  id_contexto: number;
  nombre: string;
  descripcion: string;
  personalizado?: boolean;
  activo?: boolean;
}

export interface ContextosRespuesta {
  mensaje: string;
  resultado: ContextoItem[];
}

export interface CrearContextoSolicitud {
  nombre: string;
  descripcion: string;
}

export interface CrearContextoResultado {
  id?: number;
  id_contexto: number;
  nombre: string;
  descripcion: string;
  personalizado: boolean;
  activo: boolean;
  id_usuario?: number;
}

export interface CrearContextoRespuesta {
  mensaje: string;
  resultado: CrearContextoResultado;
}

export interface TonoItem {
  id?: number;
  id_tono: number;
  nombre: string;
  descripcion?: string;
  activo?: boolean;
}

export interface TonosRespuesta {
  mensaje: string;
  resultado: TonoItem[];
}

export interface VarianteRegionalItem {
  id?: number;
  id_variante_regional: number;
  nombre: string;
  codigo: string;
  activo?: boolean;
  id_idioma?: number;
}

export interface VariantesRegionalesRespuesta {
  mensaje: string;
  resultado: VarianteRegionalItem[];
}

export interface Contexto {
  id: number;
  nombre: string;
  descripcion: string | null;
  idUsuario: number;
  usuario?: unknown;
  traducciones?: Traduccion[];
}

export interface ContextoSolicitud {
  nombre: string;
  descripcion?: string | null;
  idUsuario: number;
}

export interface Idioma {
  id: number;
  nombre: string;
  codigo: string;
  traduccionesOrigen?: Traduccion[];
  traduccionesDestino?: Traduccion[];
}

export interface IdiomasRespuesta {
  mensaje: string;
  resultado: Idioma[];
}

export interface Traduccion {
  id: number;
  textoOriginal: string;
  textoTraducido: string;
  fechaCreacion: string;
  idContexto: number;
  idIdiomaOrigen: number;
  idIdiomaDestino: number;
  contexto?: Contexto;
  idiomaOrigen?: Idioma;
  idiomaDestino?: Idioma;
}

export interface TraduccionSolicitud {
  textoOriginal: string;
  textoTraducido: string;
  idContexto: number;
  idIdiomaOrigen: number;
  idIdiomaDestino: number;
}

export interface RealizarTraduccionSolicitud {
  idioma_destino: string;
  texto_a_traducir: string;
  texto_origen?: string;
  texto?: string;
  idioma_origen?: string | null;
  id_glosario?: number | null;
  /** false: no se guarda en el historial (traduccion automatica mientras se escribe) */
  guardar_en_historial?: boolean;
  // Valores puntuales (HU-33): se usan solo en esta traduccion, no modifican las preferencias
  id_contexto?: number | null;
  id_tono?: number | null;
  id_variante_regional?: number | null;
  explicar_expresiones?: boolean;
  generar_alternativas?: boolean;
}

export interface AlternativaTraduccion {
  traduccion: string;
  explicacion?: string | null;
}

export interface ExplicacionExpresion {
  expresion: string;
  significado: string;
  equivalente?: string | null;
}

export interface RealizarTraduccionResultado {
  /** Registro del historial creado (null si se tradujo sin guardar) */
  id_traduccion?: number | null;
  texto_origen: string;
  idioma_origen: string;
  idioma_destino: string;
  traduccion: string;
  confianza_deteccion: number | null;
  id_configuracion_traduccion?: number | null;
  id_contexto?: number | null;
  nombre_contexto?: string | null;
  id_tono?: number | null;
  nombre_tono?: string | null;
  id_variante_regional?: number | null;
  nombre_variante_regional?: string | null;
  /** HU-17: true si la traduccion principal fue adaptada a la variante regional */
  region_aplicada?: boolean;
  estado_region?: EstadoRegion;
  explicar_expresiones?: boolean;
  /** HU-16: true solo si las explicaciones estaban activadas y se procesaron correctamente */
  explicaciones_procesadas?: boolean;
  generar_alternativas?: boolean;
  alternativas?: AlternativaTraduccion[];
  explicacion_expresiones?: ExplicacionExpresion[];
  analisis_contextual?: Record<string, unknown> | null;
  id_glosario?: number | null;
  nombre_glosario?: string | null;
  terminos_glosario_aplicados?: TerminoAplicado[];
  /** HU-44: traducciones anteriores similares del historial (maximo 3, de mayor a menor similitud) */
  sugerencias?: SugerenciaTraduccion[];
}

/** Registro en el historial de una traduccion terminada (POST /traducciones/historial) */
export interface RegistrarTraduccionSolicitud {
  texto_original: string;
  /** El resultado que el usuario uso (puede ser una alternativa o una sugerencia) */
  texto_traducido: string;
  idioma_origen: string;
  idioma_destino: string;
  id_glosario?: number | null;
}

export interface RegistrarTraduccionRespuesta {
  mensaje: string;
  resultado: { id_traduccion: number; fecha_creacion: string };
}

/** Traduccion anterior similar del historial del usuario (HU-44) */
export interface SugerenciaTraduccion {
  id_traduccion: number;
  texto_original: string;
  texto_traducido: string;
  fecha_creacion: string;
  /** 0 a 1 */
  similitud: number;
}

/** Estado de la localizacion cultural en una traduccion (HU-17) */
export type EstadoRegion = 'sin_region' | 'aplicada' | 'incompatible' | 'error_adaptacion';

export interface RealizarTraduccionRespuesta {
  mensaje: string;
  resultado: RealizarTraduccionResultado;
}

export interface GuardarConfiguracionSolicitud {
  id_contexto: number;
  id_tono: number;
  id_variante_regional?: number | null;
  explicar_expresiones: boolean;
  generar_alternativas: boolean;
  /** Idioma de destino preferido (HU-33); tambien valida la variante y el glosario */
  idioma_destino?: string | null;
  /** Glosario predeterminado (HU-33) */
  id_glosario?: number | null;
}

export interface ConfiguracionTraduccionResultado {
  id?: number;
  id_configuracion_traduccion: number;
  id_contexto: number;
  id_tono?: number | null;
  id_variante_regional?: number | null;
  id_usuario?: number | null;
  explicar_expresiones: boolean;
  generar_alternativas: boolean;
  nombre_contexto?: string | null;
  nombre_tono?: string | null;
  nombre_variante_regional?: string | null;
  id_idioma_destino?: number | null;
  codigo_idioma_destino?: string | null;
  nombre_idioma_destino?: string | null;
  id_glosario?: number | null;
  nombre_glosario?: string | null;
}

export interface RespuestaConfiguracionTraduccion {
  mensaje: string;
  resultado: ConfiguracionTraduccionResultado;
}

