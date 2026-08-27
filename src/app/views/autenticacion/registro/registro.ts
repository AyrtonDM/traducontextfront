import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-registro',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './registro.html',
  styleUrl: './registro.css',
})
export class Registro {
  registerSubmitted = false;

  readonly registroForm;

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly router: Router
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

    // Temporalmente simulamos que el registro fue exitoso.
    this.router.navigate(['/verificar_correo']);
  }

  campoInvalido(campo: { invalid: boolean; touched: boolean }): boolean {
    return campo.invalid && (campo.touched || this.registerSubmitted);
  }
}