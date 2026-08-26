import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

@Component({
  selector: 'app-registro',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './registro.html',
  styleUrl: './registro.css',
})
export class Registro {
  verificationModalOpen = false;
  registerSubmitted = false;
  verificationSubmitted = false;

  readonly registroForm;
  readonly verificacionForm;

  constructor(private readonly formBuilder: FormBuilder) {
    this.registroForm = this.formBuilder.nonNullable.group({
      nombre: [
        '',
        [Validators.required, Validators.minLength(2), Validators.maxLength(100)],
      ],
      correo: ['', [Validators.required, Validators.email]],
      contrasena: [
        '',
        [Validators.required, Validators.pattern(/^(?=.*[A-Za-z])(?=.*\d).{8,}$/)],
      ],
    });

    this.verificacionForm = this.formBuilder.nonNullable.group({
      correo: ['', [Validators.required, Validators.email]],
      codigo: ['', [Validators.required]],
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

  get correoVerificacion() {
    return this.verificacionForm.controls.correo;
  }

  get codigoVerificacion() {
    return this.verificacionForm.controls.codigo;
  }

  registrar(): void {
    this.registerSubmitted = true;

    if (this.registroForm.invalid) {
      this.registroForm.markAllAsTouched();
      return;
    }
  }

  abrirModalVerificacion(): void {
    this.verificationSubmitted = false;
    this.verificacionForm.patchValue({
      correo: this.correo.value,
    });
    this.verificationModalOpen = true;
  }

  cerrarModalVerificacion(): void {
    this.verificationModalOpen = false;
  }

  verificarCorreo(): void {
    this.verificationSubmitted = true;

    if (this.verificacionForm.invalid) {
      this.verificacionForm.markAllAsTouched();
      return;
    }
  }

  campoInvalido(campo: { invalid: boolean; touched: boolean }): boolean {
    return campo.invalid && (campo.touched || this.registerSubmitted);
  }

  campoVerificacionInvalido(campo: { invalid: boolean; touched: boolean }): boolean {
    return campo.invalid && (campo.touched || this.verificationSubmitted);
  }
}
