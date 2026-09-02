import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
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

    this.authService.iniciarSesion(email, password).subscribe({
      next: (respuesta) => {
        this.isLoading = false;
        // Se guarda el token retornado en la clave resultado que es una lista con el token
        if (respuesta.resultado && respuesta.resultado.length > 0) {
          const token = respuesta.resultado[0].token;
          localStorage.setItem('auth_token', token);
        }
        // Redirige al panel principal/home una vez logueado
        this.router.navigate(['/inicio']);
      },
      error: (err) => {
        this.isLoading = false;
        this.backendError = err.error?.detail || 'Correo o contrasena incorrectos.';
      }
    });
  }
}
