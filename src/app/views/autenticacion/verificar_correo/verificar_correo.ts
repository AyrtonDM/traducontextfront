import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AutenticacionService } from '../../../core/services/autenticacion.service';

@Component({
  selector: 'app-verificar-correo',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './verificar_correo.html',
  styleUrl: './verificar_correo.css',
})
export class VerificarCorreo implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly authService = inject(AutenticacionService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  verificationSubmitted = false;
  codeResent = false;
  mensajeError: string | null = null;
  mensajeExito: string | null = null;
  cargando = false;

  readonly verificacionForm = this.formBuilder.nonNullable.group({
    codigo: [
      '',
      [
        Validators.required,
        Validators.pattern(/^\d{6}$/),
      ],
    ],
  });

  correo = '';

  ngOnInit(): void {
     this.correo = this.route.snapshot.queryParamMap.get('correo') ?? '';
  }

  get codigo() {
    return this.verificacionForm.controls.codigo;
  }

  verificarCorreo(): void {
    this.verificationSubmitted = true;
    this.mensajeError = null;
    this.mensajeExito = null;

    if (this.verificacionForm.invalid) {
      this.verificacionForm.markAllAsTouched();
      return;
    }

    this.cargando = true;
    const codigoVal = this.codigo.value;

    this.authService.verificarCodigo({ correo: this.correo, codigo: codigoVal }).subscribe({
      next: (respuesta: any) => {
        this.cargando = false;
        this.mensajeExito = respuesta.mensaje || '�Cuenta verificada con exito!';
        localStorage.removeItem('correo_verificar');
        setTimeout(() => {
          this.router.navigate(['/login']);
        }, 2500);
      },
      error: (err) => {
        this.cargando = false;
        this.mensajeError = err.error?.detail || 'El código ingresado es incorrecto o ha expirado.';
      }
    });
  }

  reenviarCodigo(): void {
    this.mensajeError = null;
    this.mensajeExito = null;
    this.codeResent = false;

    this.authService.reenviarCodigo(this.correo).subscribe({
      next: (respuesta: any) => {
        this.codeResent = true;
        this.mensajeExito = respuesta.mensaje || 'Se ha solicitado un nuevo código.';
      },
      error: (err) => {
        this.mensajeError = err.error?.detail || 'No se pudo reenviar el código.';
      }
    });
  }

  campoInvalido(campo: { invalid: boolean; touched: boolean }): boolean {
    return campo.invalid && (campo.touched || this.verificationSubmitted);
  }
}
