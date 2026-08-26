import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-inicio-sesion',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './inicio_sesion.html',
  styleUrl: './inicio_sesion.css',
})
export class InicioSesion {
  private readonly fb = inject(FormBuilder);

  readonly loginForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
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

    setTimeout(() => {
      this.isLoading = false;

      if (email && password) {
        this.backendError = '';
        this.loginForm.reset({ email: '', password: '' });
      }
    }, 600);
  }
}
