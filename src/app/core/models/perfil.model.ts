import { RolUsuario } from './autenticacion.model';
import { ConfiguracionTraduccionResultado } from './traduccion.model';

export interface PerfilDetalle {
  id: number;
  nombre: string;
  correo: string;
  estado: string;
  rol: RolUsuario;
  fecha_creacion: string;
  fecha_actualizacion?: string | null;
  url_foto_perfil?: string | null;
  configuracion_traduccion?: ConfiguracionTraduccionResultado | null;
}

export interface PerfilRespuesta {
  mensaje: string;
  resultado: PerfilDetalle;
}

// El correo no es editable: se usa para la autenticacion de la cuenta
export interface ActualizarPerfilSolicitud {
  nombre: string;
}