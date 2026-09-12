import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  RegistroUsuario,
  VerificarCodigo,
  InicioSesion,
  PerfilUsuario,
  PerfilUsuarioRespuesta,
  UsuarioAutenticado,
} from '../models/autenticacion.model';

@Injectable({
  providedIn: 'root'
})
export class AutenticacionService {

  private http = inject(HttpClient);

  private apiUrl = environment.apiUrl;

  registrarUsuario(
    datos: RegistroUsuario
  ): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/usuarios/registrar`,
      datos
    );
  }

  verificarCodigo(
    datos: VerificarCodigo
  ): Observable<unknown> {
    return this.http.post<unknown>(
      `${this.apiUrl}/usuarios/verificar-codigo`,
      datos
    );
  }

  reenviarCodigo(correo: string): Observable<unknown> {
    return this.http.post<unknown>(
      `${this.apiUrl}/usuarios/reenviar-codigo`,
      { correo }
    );
  }

  solicitarRecuperacion(correo: string): Observable<unknown> {
    return this.http.post<unknown>(
      `${this.apiUrl}/autenticacion/solicitar-recuperacion`,
      { correo },
    );
  }

  validarCodigoRecuperacion(correo: string, codigo: string): Observable<unknown> {
    return this.http.post<unknown>(
      `${this.apiUrl}/autenticacion/validar-codigo-recuperacion`,
      { correo, codigo },
    );
  }

  restablecerContrasena(correo: string, codigo: string, nuevaContrasena: string): Observable<unknown> {
    return this.http.post<unknown>(
      `${this.apiUrl}/autenticacion/restablecer-contrasena`,
      { correo, codigo, nueva_contrasena: nuevaContrasena },
    );
  }

  iniciarSesion(correo: string, contrasena: string): Observable<any> {
    return this.http.post<any>(
      `${this.apiUrl}/autenticacion/iniciar-sesion`,
      { correo, contrasena }
    );
  }

  obtenerPerfilUsuario(): Observable<PerfilUsuarioRespuesta> {
    return this.http.get<PerfilUsuarioRespuesta>(`${this.apiUrl}/usuarios/me`);
  }

  obtenerUsuarioActual(): UsuarioAutenticado | null {
    const usuarioEnStorage = localStorage.getItem('usuario_actual');

    if (!usuarioEnStorage) {
      return null;
    }

    try {
      return JSON.parse(usuarioEnStorage) as UsuarioAutenticado;
    } catch {
      return null;
    }
  }

  guardarUsuarioActual(usuario: UsuarioAutenticado | null): void {
    if (!usuario) {
      localStorage.removeItem('usuario_actual');
      return;
    }

    localStorage.setItem('usuario_actual', JSON.stringify(usuario));
  }

  normalizarPerfilUsuario(respuesta: PerfilUsuarioRespuesta | PerfilUsuario | null | undefined): UsuarioAutenticado | null {
    const perfilCrudo = (respuesta as PerfilUsuarioRespuesta).resultado;

    if (!perfilCrudo || typeof perfilCrudo !== 'object') {
      return null;
    }

    const perfil = perfilCrudo as PerfilUsuario;
    const usuario: UsuarioAutenticado = {
      nombre: perfil.nombre ?? '',
      correo: perfil.correo ?? '',
      rol: this.extraerNombreRol(perfil),
      permisos: perfil.permisos ?? [],
    };

    return usuario;
  }

  private extraerNombreRol(perfil: PerfilUsuario): string {
    const rol = perfil.rol ?? '';

    if (typeof rol === 'string') {
      return rol;
    }

    if (rol && typeof rol === 'object') {
      return rol.nombre ?? '';
    }
    return '';
  }

  cerrarSesion(): Observable<unknown> {
    return this.http.post<unknown>(
      `${this.apiUrl}/autenticacion/cerrar-sesion`,
      {}
    );
  }
}
