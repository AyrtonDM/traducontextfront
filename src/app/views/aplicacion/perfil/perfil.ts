import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
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
  private readonly destroyRef = inject(DestroyRef);

  private static readonly TAMANO_MAXIMO_FOTO = 5 * 1024 * 1024;
  private static readonly TIPOS_FOTO = ['image/jpeg', 'image/png', 'image/webp'];

  readonly perfil = signal<PerfilDetalle | null>(null);
  readonly cargando = signal(true);
  readonly guardando = signal(false);
  readonly mensajeExito = signal('');
  readonly mensajeError = signal('');
  private readonly formularioCambiado = signal(0);

  readonly fotoUrl = signal<string | null>(null);
  readonly subiendoFoto = signal(false);

  readonly perfilForm = this.fb.nonNullable.group({
    nombre: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
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
    return this.normalizarNombre() !== actual.nombre;
  });

  constructor() {
    this.perfilForm.valueChanges.subscribe(() => this.formularioCambiado.update((v) => v + 1));
    this.destroyRef.onDestroy(() => this.liberarFoto());
    this.cargarPerfil();
  }

  get nombreControl() {
    return this.perfilForm.controls.nombre;
  }

  campoInvalido(campo: { invalid: boolean; touched: boolean; dirty: boolean }): boolean {
    return campo.invalid && (campo.touched || campo.dirty);
  }

  cancelar(): void {
    const actual = this.perfil();
    if (actual) {
      this.perfilForm.reset({ nombre: actual.nombre });
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

    const datos = { nombre: this.normalizarNombre() };

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

  seleccionarFoto(evento: Event): void {
    const input = evento.target as HTMLInputElement;
    const archivo = input.files?.[0];
    // Permite volver a elegir el mismo archivo despues de un error
    input.value = '';

    if (!archivo || this.subiendoFoto()) {
      return;
    }

    this.mensajeError.set('');
    this.mensajeExito.set('');

    if (!Perfil.TIPOS_FOTO.includes(archivo.type)) {
      this.mensajeError.set('Formato de imagen no soportado. Solo se permiten JPG, PNG o WEBP.');
      return;
    }
    if (archivo.size > Perfil.TAMANO_MAXIMO_FOTO) {
      this.mensajeError.set('La imagen no puede superar los 5 MB.');
      return;
    }

    this.subiendoFoto.set(true);
    this.perfilService.subirFoto(archivo).pipe(
      finalize(() => this.subiendoFoto.set(false))
    ).subscribe({
      next: (respuesta) => {
        this.perfil.set(respuesta.resultado);
        this.mostrarFoto(archivo);
        this.mensajeExito.set(respuesta.mensaje || 'Foto de perfil actualizada correctamente.');
      },
      error: (error) => {
        this.mensajeError.set(this.extraerError(error, 'No se pudo subir la foto de perfil.'));
      },
    });
  }

  quitarFoto(): void {
    if (this.subiendoFoto() || !this.fotoUrl()) {
      return;
    }

    this.mensajeError.set('');
    this.mensajeExito.set('');
    this.subiendoFoto.set(true);

    this.perfilService.eliminarFoto().pipe(
      finalize(() => this.subiendoFoto.set(false))
    ).subscribe({
      next: (respuesta) => {
        this.perfil.set(respuesta.resultado);
        this.liberarFoto();
        this.mensajeExito.set(respuesta.mensaje || 'Foto de perfil eliminada correctamente.');
      },
      error: (error) => {
        this.mensajeError.set(this.extraerError(error, 'No se pudo eliminar la foto de perfil.'));
      },
    });
  }

  private cargarFoto(): void {
    this.perfilService.obtenerFoto().subscribe({
      next: (blob) => this.mostrarFoto(blob),
      // Si la foto no se puede cargar se muestran las iniciales
      error: () => this.liberarFoto(),
    });
  }

  private mostrarFoto(imagen: Blob): void {
    this.liberarFoto();
    this.fotoUrl.set(URL.createObjectURL(imagen));
  }

  private liberarFoto(): void {
    const actual = this.fotoUrl();
    if (actual) {
      URL.revokeObjectURL(actual);
    }
    this.fotoUrl.set(null);
  }

  private cargarPerfil(): void {
    this.cargando.set(true);
    this.perfilService.obtenerPerfil().pipe(
      finalize(() => this.cargando.set(false))
    ).subscribe({
      next: (respuesta) => {
        this.aplicarPerfil(respuesta.resultado);
        if (respuesta.resultado.url_foto_perfil) {
          this.cargarFoto();
        }
      },
      error: (error) => {
        this.mensajeError.set(this.extraerError(error, 'No se pudo cargar la informacion del perfil.'));
      },
    });
  }

  private aplicarPerfil(perfil: PerfilDetalle): void {
    this.perfil.set(perfil);
    this.perfilForm.reset({ nombre: perfil.nombre });

    // Mantiene sincronizado el usuario guardado para los proximos inicios de la app
    const usuarioGuardado = this.authService.obtenerUsuarioActual();
    this.authService.guardarUsuarioActual({
      nombre: perfil.nombre,
      correo: perfil.correo,
      rol: perfil.rol?.nombre ?? usuarioGuardado?.rol ?? '',
      permisos: usuarioGuardado?.permisos ?? [],
    });
  }

  private normalizarNombre(): string {
    return this.perfilForm.getRawValue().nombre.trim().split(/\s+/).join(' ');
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
