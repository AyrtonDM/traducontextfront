export interface RegistroUsuario {
  nombre: string;
  correo: string;
  contrasena: string;
}

export interface VerificarCodigo {
  correo: string;
  codigo: string;
}