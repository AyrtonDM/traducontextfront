export interface RegistroUsuario {
  nombre: string;
  correo: string;
  contrasena: string;
}

export interface VerificarCodigo {
  correo: string;
  codigo: string;
}

export interface InicioSesion {
  correo: string;
  contrasena: string;
}

export interface RolUsuario {
  id?: number;
  nombre?: string;
}

export interface PerfilUsuario {
  id?: number;
  nombre?: string;
  correo?: string;
  rol?: RolUsuario | string | null;
  permisos?: string[];
}

export interface PerfilUsuarioRespuesta {
  mensaje?: string;
  resultado?: PerfilUsuario | null;
}

export interface UsuarioAutenticado {
  nombre: string;
  correo: string;
  rol: string;
  permisos: string[];
}