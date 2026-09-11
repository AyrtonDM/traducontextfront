import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { switchMap } from 'rxjs';
import { AutenticacionService } from '../../../core/services/autenticacion.service';

@Component({
  selector: 'app-inicio-sesion',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './inicio_sesion.html',
  styleUrl: './inicio_sesion.css',
})
export class InicioSesion {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AutenticacionService);
  private readonly router = inject(Router);

  readonly loginForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  showPassword = false;
  isLoading = false;
  backendError = '';

  get emailControl() {
    return this.loginForm.controls.email;
  }

  get passwordControl() {
    return this.loginForm.controls.password;
  }

  get hasEmailError(): boolean {
    return this.emailControl.invalid && (this.emailControl.touched || this.emailControl.dirty);
  }

  get hasPasswordError(): boolean {
    return this.passwordControl.invalid && (this.passwordControl.touched || this.passwordControl.dirty);
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  onSubmit(): void {
    if (this.loginForm.invalid || this.isLoading) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.backendError = '';

    const { email, password } = this.loginForm.getRawValue();

    this.authService.iniciarSesion(email, password).pipe(
      switchMap((respuesta) => {
        if (!respuesta?.resultado || respuesta.resultado.length === 0) {
          throw new Error('No se recibió el token de sesión.');
        }

        const token = respuesta.resultado[0]?.token;

        if (!token) {
          throw new Error('No se recibió un token de sesión válido.');
        }

        localStorage.setItem('auth_token', token);

        return this.authService.obtenerPerfilUsuario();
      })
    ).subscribe({
      next: (perfil) => {
        const usuario = this.authService.normalizarPerfilUsuario(perfil);

        if (!usuario) {
          localStorage.removeItem('auth_token');
          localStorage.removeItem('usuario_actual');

          this.isLoading = false;
          this.backendError = 'No se pudo obtener la información del usuario.';
          return;
        }

        this.authService.guardarUsuarioActual(usuario);

        this.isLoading = false;

        this.router.navigate(['/inicio']);
      },
      error: (err) => {
        this.isLoading = false;

        localStorage.removeItem('auth_token');
        localStorage.removeItem('usuario_actual');

        this.backendError =
          err.error?.detail ||
          err.message ||
          'No se pudo iniciar sesión.';
      }
    });
  }
}