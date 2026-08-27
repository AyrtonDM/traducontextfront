import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

import { API_BASE_URL } from '../configuration/api.config';

export interface LoginResponse {
	mensaje: string;
	resultado: Array<{ token: string }>;
}

@Injectable({ providedIn: 'root' })
export class AutenticationService {
	private readonly http = inject(HttpClient);

	iniciarSesion(correo: string, contrasena: string): Observable<LoginResponse> {
		return this.http
			.post<LoginResponse>(`${API_BASE_URL}/autenticacion/iniciar-sesion`, {
				correo,
				contrasena,
			})
			.pipe(
				tap((respuesta) => {
					const token = respuesta.resultado[0]?.token;
					if (token) {
						localStorage.setItem('token', token);
					}
				}),
			);
	}

	cerrarSesion(): void {
		localStorage.removeItem('token');
	}
}
