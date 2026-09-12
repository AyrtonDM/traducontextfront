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
