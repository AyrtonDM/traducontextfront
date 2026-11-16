export interface TerminoGlosario {
  id: number;
  id_termino_glosario: number;
  id_glosario: number;
  termino_origen: string;
  traduccion_preferida: string | null;
  conservar_original: boolean;
  distinguir_mayusculas: boolean;
  nota: string | null;
}

export interface GlosarioResumen {
  id: number;
  id_glosario: number;
  nombre: string;
  descripcion: string | null;
  id_usuario: number;
  id_idioma_origen: number;
  id_idioma_destino: number;
  codigo_idioma_origen: string | null;
  codigo_idioma_destino: string | null;
  nombre_idioma_origen: string | null;
  nombre_idioma_destino: string | null;
  /** Texto listo para mostrar, por ejemplo "EN → ES" */
  par_idiomas: string;
  cantidad_terminos: number;
  fecha_creacion: string;
  fecha_actualizacion: string | null;
}

export interface GlosarioDetalle extends GlosarioResumen {
  terminos: TerminoGlosario[];
}

export interface TerminoGlosarioSolicitud {
  termino_origen: string;
  traduccion_preferida?: string | null;
  conservar_original: boolean;
  distinguir_mayusculas?: boolean;
  nota?: string | null;
}

export type ActualizarTerminoGlosarioSolicitud = Partial<TerminoGlosarioSolicitud>;

export interface CrearGlosarioSolicitud {
  nombre: string;
  descripcion?: string | null;
  id_idioma_origen: number;
  id_idioma_destino: number;
  terminos?: TerminoGlosarioSolicitud[];
}

export interface ActualizarGlosarioSolicitud {
  nombre?: string;
  descripcion?: string | null;
  id_idioma_origen?: number;
  id_idioma_destino?: number;
}

export interface FiltroGlosarios {
  idioma_origen?: string | null;
  idioma_destino?: string | null;
}

export interface GlosarioRespuesta {
  mensaje: string;
  resultado: GlosarioDetalle;
}

export interface GlosariosRespuesta {
  mensaje: string;
  resultado: GlosarioResumen[];
}

export interface TerminoGlosarioRespuesta {
  mensaje: string;
  resultado: TerminoGlosario;
}

export interface EliminarGlosarioRespuesta {
  mensaje: string;
  resultado: null;
}

/** Termino que el backend aplico durante una traduccion */
export interface TerminoAplicado {
  termino_origen: string;
  resultado: string;
  conservar_original: boolean;
}
