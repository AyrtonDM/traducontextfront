import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { PerfilDetalle } from '../../../core/models/perfil.model';
import { AutenticacionService } from '../../../core/services/autenticacion.service';
import { PerfilService } from '../../../core/services/perfil.service';

@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './perfil.html',
  styleUrl: './perfil.css',
})
export class Perfil {
  private readonly fb = inject(FormBuilder);
  private readonly perfilService = inject(PerfilService);
  private readonly authService = inject(AutenticacionService);

  readonly perfil = signal<PerfilDetalle | null>(null);
  readonly cargando = signal(true);
  readonly guardando = signal(false);
  readonly mensajeExito = signal('');
  readonly mensajeError = signal('');
  private readonly formularioCambiado = signal(0);

  readonly perfilForm = this.fb.nonNullable.group({
    nombre: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
    correo: ['', [Validators.required, Validators.email, Validators.maxLength(255)]],
  });

  readonly iniciales = computed(() => {
    const nombre = this.perfil()?.nombre?.trim() ?? '';
    const palabras = nombre.split(/\s+/).filter(Boolean).slice(0, 2);
    return palabras.map((p) => p.charAt(0).toUpperCase()).join('') || 'US';
  });

  readonly nombreRol = computed(() => this.perfil()?.rol?.nombre || 'Usuario');

  readonly hayCambios = computed(() => {
    this.formularioCambiado();
    const actual = this.perfil();
    if (!actual) {
      return false;
    }
    const { nombre, correo } = this.normalizar();
    return nombre !== actual.nombre || correo !== actual.correo;
  });

  constructor() {
    this.perfilForm.valueChanges.subscribe(() => this.formularioCambiado.update((v) => v + 1));
    this.cargarPerfil();
  }

  get nombreControl() {
    return this.perfilForm.controls.nombre;
  }

  get correoControl() {
    return this.perfilForm.controls.correo;
  }

  campoInvalido(campo: { invalid: boolean; touched: boolean; dirty: boolean }): boolean {
    return campo.invalid && (campo.touched || campo.dirty);
  }

  cancelar(): void {
    const actual = this.perfil();
    if (actual) {
      this.perfilForm.reset({ nombre: actual.nombre, correo: actual.correo });
    }
    this.mensajeError.set('');
    this.mensajeExito.set('');
  }

  guardar(): void {
    if (this.perfilForm.invalid || this.guardando()) {
      this.perfilForm.markAllAsTouched();
      return;
    }

    const actual = this.perfil();
    if (!actual || !this.hayCambios()) {
      return;
    }

    const { nombre, correo } = this.normalizar();
    const datos: { nombre?: string; correo?: string } = {};
    if (nombre !== actual.nombre) {
      datos.nombre = nombre;
    }
    if (correo !== actual.correo) {
      datos.correo = correo;
    }

    this.guardando.set(true);
    this.mensajeError.set('');
    this.mensajeExito.set('');

    this.perfilService.actualizarPerfil(datos).pipe(
      finalize(() => this.guardando.set(false))
    ).subscribe({
      next: (respuesta) => {
        this.aplicarPerfil(respuesta.resultado);
        this.mensajeExito.set(respuesta.mensaje || 'Perfil actualizado correctamente.');
      },
      error: (error) => {
        this.mensajeError.set(this.extraerError(error, 'No se pudo actualizar el perfil.'));
      },
    });
  }

  private cargarPerfil(): void {
    this.cargando.set(true);
    this.perfilService.obtenerPerfil().pipe(
      finalize(() => this.cargando.set(false))
    ).subscribe({
      next: (respuesta) => this.aplicarPerfil(respuesta.resultado),
      error: (error) => {
        this.mensajeError.set(this.extraerError(error, 'No se pudo cargar la informacion del perfil.'));
      },
    });
  }

  private aplicarPerfil(perfil: PerfilDetalle): void {
    this.perfil.set(perfil);
    this.perfilForm.reset({ nombre: perfil.nombre, correo: perfil.correo });

    // Mantiene sincronizado el usuario guardado para los proximos inicios de la app
    const usuarioGuardado = this.authService.obtenerUsuarioActual();
    this.authService.guardarUsuarioActual({
      nombre: perfil.nombre,
      correo: perfil.correo,
      rol: perfil.rol?.nombre ?? usuarioGuardado?.rol ?? '',
      permisos: usuarioGuardado?.permisos ?? [],
    });
  }

  private normalizar(): { nombre: string; correo: string } {
    const { nombre, correo } = this.perfilForm.getRawValue();
    return {
      nombre: nombre.trim().split(/\s+/).join(' '),
      correo: correo.trim().toLowerCase(),
    };
  }

  // El backend responde los errores como { mensaje, resultado }; en los 422
  // "resultado" trae la lista de validaciones de Pydantic con el motivo real.
  private extraerError(error: any, porDefecto: string): string {
    if (error?.status === 0) {
      return 'No se pudo conectar con el servidor.';
    }

    const cuerpo = error?.error;
    const validaciones = cuerpo?.resultado;
    if (Array.isArray(validaciones) && validaciones.length > 0 && validaciones[0]?.msg) {
      return String(validaciones[0].msg).replace(/^Value error, /, '');
    }

    return cuerpo?.mensaje || porDefecto;
  }
}
