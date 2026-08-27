import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { AutenticationService } from '../../../core/services/autentication.service';

@Component({
	selector: 'app-inicio-sesion',
	imports: [FormsModule],
	templateUrl: './inicio_sesion.html',
	styleUrl: './inicio_sesion.css',
})
export class InicioSesion {
	protected correo = '';
	protected contrasena = '';
	protected mensaje = '';
	protected cargando = false;

	private readonly autenticacion = inject(AutenticationService);

	iniciarSesion(): void {
		this.mensaje = '';
		this.cargando = true;

		this.autenticacion.iniciarSesion(this.correo, this.contrasena).subscribe({
			next: (respuesta) => {
				this.mensaje = respuesta.mensaje;
				this.cargando = false;
			},
			error: (error: { error?: { detail?: string } }) => {
				this.mensaje = error.error?.detail ?? 'No se pudo iniciar sesion.';
				this.cargando = false;
			},
		});
	}
}
