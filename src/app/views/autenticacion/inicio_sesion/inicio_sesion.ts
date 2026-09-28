import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { switchMap } from 'rxjs/operators';
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
        let token = '';
        if (Array.isArray(respuesta?.resultado) && respuesta.resultado.length > 0) {
          token = respuesta.resultado[0].token || respuesta.resultado[0].access_token;
        } else if (respuesta?.resultado && typeof respuesta.resultado === 'object') {
          token = respuesta.resultado.token || respuesta.resultado.access_token;
        } else if (respuesta?.token || respuesta?.access_token) {
          token = respuesta.token || respuesta.access_token;
        }

        if (token) {
          localStorage.setItem('auth_token', token);
        }

        return this.authService.cargarYGuardarPerfil();
      })
    ).subscribe({
      next: () => {
        this.isLoading = false;
        this.router.navigate(['/inicio']);
      },
      error: (err) => {
        this.isLoading = false;
        this.backendError = err.error?.detail || err.error?.mensaje || 'Correo o contraseña incorrectos.';
      }
    });
  }
}
