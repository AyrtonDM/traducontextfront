import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { RegistroUsuario, VerificarCodigo, InicioSesion } from '../models/autenticacion.model';

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

  iniciarSesion(correo: string, contrasena: string): Observable<any> {
    return this.http.post<any>(
      `${this.apiUrl}/autenticacion/iniciar-sesion`,
      { correo, contrasena }
    );
  }

  cerrarSesion(): Observable<unknown> {
    return this.http.post<unknown>(
      `${this.apiUrl}/autenticacion/cerrar-sesion`,
      {}
    );
  }
}