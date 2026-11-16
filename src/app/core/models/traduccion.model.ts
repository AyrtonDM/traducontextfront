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
  explicar_expresiones?: boolean;
  generar_alternativas?: boolean;
  alternativas?: AlternativaTraduccion[];
  explicacion_expresiones?: ExplicacionExpresion[];
  analisis_contextual?: Record<string, unknown> | null;
  id_glosario?: number | null;
  nombre_glosario?: string | null;
  terminos_glosario_aplicados?: TerminoAplicado[];
}

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
}

export interface RespuestaConfiguracionTraduccion {
  mensaje: string;
  resultado: ConfiguracionTraduccionResultado;
}

