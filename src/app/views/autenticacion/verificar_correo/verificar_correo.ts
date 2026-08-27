import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

@Component({
  selector: 'app-verificar-correo',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './verificar_correo.html',
  styleUrl: './verificar_correo.css',
})
export class VerificarCorreo {
  verificationSubmitted = false;
  codeResent = false;

  readonly verificacionForm;

  // Temporalmente usamos un correo de ejemplo.
  // Posteriormente vendrá del flujo de registro o del backend.
  correo = 'usuario@gmail.com';

  constructor(private readonly formBuilder: FormBuilder) {
    this.verificacionForm = this.formBuilder.nonNullable.group({
      codigo: [
        '',
        [
          Validators.required,
          Validators.pattern(/^\d{6}$/),
        ],
      ],
    });
  }

  get codigo() {
    return this.verificacionForm.controls.codigo;
  }

  verificarCorreo(): void {
    this.verificationSubmitted = true;

    if (this.verificacionForm.invalid) {
      this.verificacionForm.markAllAsTouched();
      return;
    }

    // Aquí posteriormente se conectará con el backend.
  }

  reenviarCodigo(): void {
    this.codeResent = true;

    // Aquí posteriormente se solicitará al backend
    // el reenvío del código de verificación.
  }

  campoInvalido(campo: { invalid: boolean; touched: boolean }): boolean {
    return campo.invalid && (campo.touched || this.verificationSubmitted);
  }
}