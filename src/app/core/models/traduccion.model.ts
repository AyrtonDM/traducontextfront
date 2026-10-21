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
  descripcion?: string | null;
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
  idioma_origen: string | null;
  id_contexto: number | null;
}

export interface RealizarTraduccionResultado {
  texto_origen: string;
  idioma_origen: string;
  idioma_destino: string;
  traduccion: string;
  confianza_deteccion: number | null;
  id_contexto: number | null;
  nombre_contexto: string | null;
  analisis_contextual: string | null;
}

export interface RealizarTraduccionRespuesta {
  mensaje: string;
  resultado: RealizarTraduccionResultado;
}
