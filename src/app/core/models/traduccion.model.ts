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

export interface EjemploTraduccion {
  nombre: string;
  texto: string;
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

export interface SolicitudTraduccionContextual {
  texto: string;
  idioma_origen: string;
  idioma_destino: string;
  dominio?: string;
  tono?: string;
  variante_regional?: string;
  contexto_adicional?: string;
  mostrar_alternativas?: boolean;
  explicar_modismos?: boolean;
  adaptar_formato_local?: boolean;
}

export interface ResultadoTraduccionContextual {
  id?: number;
  texto_original: string;
  texto_traducido: string;
  idioma_origen: string;
  idioma_destino: string;
  dominio: string;
  alternativas: string[];
  explicacion_modismos?: string | null;
  fecha_creacion?: string;
}

export interface RespuestaTraduccionContextual {
  mensaje: string;
  resultado: ResultadoTraduccionContextual;
}

export interface TraduccionHistorialItem {
  id: number;
  texto_original: string;
  texto_traducido: string;
  fecha_creacion: string;
  id_idioma_origen: number;
  id_idioma_destino: number;
  codigo_idioma_origen?: string;
  codigo_idioma_destino?: string;
  nombre_idioma_origen?: string;
  nombre_idioma_destino?: string;
  contexto?: string;
}

export interface RespuestaHistorialTraducciones {
  mensaje: string;
  resultado: TraduccionHistorialItem[];
}

export interface RespuestaIdiomas {
  mensaje: string;
  resultado: Idioma[];
}

export interface ResultadoDeteccionIdioma {
  codigo: string;
  nombre: string;
  confianza: number;
}

export interface RespuestaDeteccionIdioma {
  mensaje: string;
  resultado: ResultadoDeteccionIdioma;
}
