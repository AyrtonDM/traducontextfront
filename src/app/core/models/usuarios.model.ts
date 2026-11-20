// Administracion de usuarios (HU-05)

export type EstadoUsuario = 'ACTIVO' | 'INACTIVO' | 'SUSPENDIDO';

export interface RolItem {
  id: number;
  nombre: string;
}

export interface UsuarioAdminResumen {
  id: number;
  nombre: string;
  correo: string;
  estado: EstadoUsuario;
  fecha_creacion: string;
  rol: RolItem;
}

export interface UsuarioAdminDetalle extends UsuarioAdminResumen {
  fecha_actualizacion?: string | null;
  foto_perfil?: string | null;
  ultimo_acceso?: string | null;
  sesiones_activas: number;
  total_traducciones: number;
  total_documentos: number;
  total_conversaciones: number;
  total_glosarios: number;
}

export interface FiltroUsuarios {
  pagina: number;
  tamano_pagina: number;
  busqueda?: string | null;
  id_rol?: number | null;
  estado?: EstadoUsuario | null;
}

export interface ListaUsuariosPaginada {
  elementos: UsuarioAdminResumen[];
  total: number;
  pagina: number;
  tamano_pagina: number;
  total_paginas: number;
}

export interface ListaUsuariosRespuesta {
  mensaje: string;
  resultado: ListaUsuariosPaginada;
}

export interface UsuarioAdminRespuesta {
  mensaje: string;
  resultado: UsuarioAdminDetalle;
}

export interface ListaRolesRespuesta {
  mensaje: string;
  resultado: RolItem[];
}
