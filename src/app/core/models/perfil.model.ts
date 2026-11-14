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
  configuracion_traduccion?: ConfiguracionTraduccionResultado | null;
}

export interface PerfilRespuesta {
  mensaje: string;
  resultado: PerfilDetalle;
}

export interface ActualizarPerfilSolicitud {
  nombre?: string;
  correo?: string;
}