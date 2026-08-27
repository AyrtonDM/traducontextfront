import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { AutenticacionService } from '../../../core/services/autenticacion.service';


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
  // Posteriormente vendrÃ¡ del flujo de registro o del backend.
  correo = '';

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly route: ActivatedRoute,
    private readonly autenticacionService: AutenticacionService
  ) {
    this.correo = this.route.snapshot.queryParamMap.get('correo') ?? '';
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

    const datos = {
      correo: this.correo,
      codigo: this.codigo.value
    };

    this.autenticacionService.verificarCodigo(datos).subscribe({
      next: () => {
        console.log('Correo verificado correctamente');

        // Aquí posteriormente iremos a la siguiente pantalla.
      },

      error: (error) => {
        console.error('Error al verificar correo:', error);
      }
    });
  }

  reenviarCodigo(): void {
    this.codeResent = false;

    this.autenticacionService.reenviarCodigo(this.correo).subscribe({
      next: () => {
        this.codeResent = true;
      },
      error: (error) => {
        console.error('Error al reenviar código:', error);
      }
    });
  }

  campoInvalido(campo: { invalid: boolean; touched: boolean }): boolean {
    return campo.invalid && (campo.touched || this.verificationSubmitted);
  }
}