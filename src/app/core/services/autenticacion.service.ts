import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
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

  // Usuario actual reactivo: header y sidebar se actualizan al editar el perfil
  readonly usuarioActual = signal<UsuarioAutenticado | null>(this.obtenerUsuarioActual());

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

  cargarYGuardarPerfil(): Observable<UsuarioAutenticado | null> {
    return this.obtenerPerfilUsuario().pipe(
      map((respuesta) => {
        const usuario = this.normalizarPerfilUsuario(respuesta);
        if (usuario) {
          this.guardarUsuarioActual(usuario);
        }
        return usuario;
      }),
      catchError((error) => {
        console.error('Error al cargar perfil del usuario:', error);
        return of(null);
      })
    );
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
    this.usuarioActual.set(usuario);

    if (!usuario) {
      localStorage.removeItem('usuario_actual');
      return;
    }

    localStorage.setItem('usuario_actual', JSON.stringify(usuario));
  }

  normalizarPerfilUsuario(respuesta: any): UsuarioAutenticado | null {
    if (!respuesta) {
      return null;
    }

    const res = respuesta.resultado !== undefined ? respuesta.resultado : respuesta;
    const perfilCrudo = Array.isArray(res) ? res[0] : res;

    if (!perfilCrudo || typeof perfilCrudo !== 'object') {
      return null;
    }

    const usuario: UsuarioAutenticado = {
      nombre: perfilCrudo.nombre ?? '',
      correo: perfilCrudo.correo ?? '',
      rol: this.extraerNombreRol(perfilCrudo),
      permisos: Array.isArray(perfilCrudo.permisos) ? perfilCrudo.permisos : [],
    };

    return usuario;
  }

  private extraerNombreRol(perfil: any): string {
    const rol = perfil?.rol;

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
