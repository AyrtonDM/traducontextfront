import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AutenticacionService } from '../../../core/services/autenticacion.service';

@Component({
  selector: 'app-registro',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './registro.html',
  styleUrl: './registro.css',
})
export class Registro {
  registerSubmitted = false;
  isLoading = false;

  readonly registroForm;

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly router: Router,
    private readonly autenticacionService: AutenticacionService
  ) {
    this.registroForm = this.formBuilder.nonNullable.group({
      nombre: [
        '',
        [
          Validators.required,
          Validators.minLength(3),
          Validators.maxLength(80),
        ],
      ],
      correo: ['', [Validators.required, Validators.email]],
      contrasena: [
        '',
        [
          Validators.required,
          Validators.pattern(/^(?=.*[A-Za-z])(?=.*\d).{8,}$/),
        ],
      ],
    });
  }

  get nombre() {
    return this.registroForm.controls.nombre;
  }

  get correo() {
    return this.registroForm.controls.correo;
  }

  get contrasena() {
    return this.registroForm.controls.contrasena;
  }

  registrar(): void {
    this.registerSubmitted = true;

    if (this.registroForm.invalid) {
      this.registroForm.markAllAsTouched();
      return;
    }

    const datos = this.registroForm.getRawValue();
    this.isLoading = true;

    this.autenticacionService.registrarUsuario(datos).subscribe({
      next: () => {
        this.isLoading = false;
        this.router.navigate(['/verificar_correo'], {
          queryParams: {
            correo: datos.correo
          }
        });
      },

      error: (error) => {
        this.isLoading = false;
        console.error('Error al registrar usuario:', error);
      }
    });
  }

  campoInvalido(campo: { invalid: boolean; touched: boolean }): boolean {
    return campo.invalid && (campo.touched || this.registerSubmitted);
  }
}