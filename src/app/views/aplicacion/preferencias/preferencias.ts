import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { CorreccionTraduccion } from '../../../core/models/aprendizaje.model';
import { GlosarioResumen } from '../../../core/models/glosario.model';
import {
  ConfiguracionTraduccionResultado,
  ContextoItem,
  Idioma,
  TonoItem,
  VarianteRegionalItem,
} from '../../../core/models/traduccion.model';
import { AprendizajeService } from '../../../core/services/aprendizaje.service';
import { GlosarioService } from '../../../core/services/glosario.service';
import { TraduccionService } from '../../../core/services/traduccion.service';

interface FormularioPreferencias {
  idiomaDestino: string | null;
  idContexto: number | null;
  idTono: number | null;
  idVariante: number | null;
  idGlosario: number | null;
  explicarExpresiones: boolean;
  generarAlternativas: boolean;
}

type Confirmacion = 'restablecer' | 'borrar_todo' | null;

/**
 * Preferencias de traduccion (HU-33) y aprendizaje de preferencias (HU-34).
 * Las preferencias se cargan solas al abrir una traduccion de texto, un documento o una conversacion.
 */
@Component({
  selector: 'app-preferencias',
  standalone: true,
  imports: [FormsModule, RouterLink, DatePipe],
  templateUrl: './preferencias.html',
  styleUrl: './preferencias.css',
})
export class Preferencias {
  private readonly traduccionService = inject(TraduccionService);
  private readonly glosarioService = inject(GlosarioService);
  private readonly aprendizajeService = inject(AprendizajeService);

  readonly idiomas = signal<Idioma[]>([]);
  readonly contextos = signal<ContextoItem[]>([]);
  readonly tonos = signal<TonoItem[]>([]);
  readonly variantes = signal<VarianteRegionalItem[]>([]);
  readonly glosarios = signal<GlosarioResumen[]>([]);

  formulario: FormularioPreferencias = this.formularioVacio();
  /** Lo guardado en el servidor, para saber si hay cambios */
  private guardado: FormularioPreferencias | null = null;

  readonly cargando = signal(true);
  readonly guardando = signal(false);
  readonly mensaje = signal('');
  readonly error = signal('');
  readonly confirmacion = signal<Confirmacion>(null);

  // Aprendizaje (HU-34)
  readonly aprendizajeActivo = signal(true);
  readonly totalCorrecciones = signal(0);
  readonly correcciones = signal<CorreccionTraduccion[]>([]);
  readonly cargandoCorrecciones = signal(false);
  readonly cambiandoAprendizaje = signal(false);
  readonly eliminando = signal<number | 'todas' | null>(null);
  readonly errorAprendizaje = signal('');
  filtroOrigen: string | null = null;
  filtroDestino: string | null = null;

  readonly contextosActivos = computed(() => this.contextos().filter((c) => c.activo !== false));
  readonly tonosActivos = computed(() => this.tonos().filter((t) => t.activo !== false));

  constructor() {
    this.cargarCatalogos();
    this.cargarPreferencias();
    this.cargarAprendizaje();
  }

  // ---------- Preferencias (HU-33) ----------

  /** La variante regional debe corresponder al idioma de destino */
  get variantesDisponibles(): VarianteRegionalItem[] {
    const idioma = this.idiomas().find((i) => i.codigo === this.formulario.idiomaDestino);
    if (!idioma) {
      return [];
    }
    return this.variantes().filter((v) => v.activo !== false && v.id_idioma === idioma.id);
  }

  /** Solo los glosarios cuyo idioma de destino es el preferido */
  get glosariosDisponibles(): GlosarioResumen[] {
    const destino = (this.formulario.idiomaDestino ?? '').toLowerCase();
    if (!destino) {
      return [];
    }
    return this.glosarios().filter((g) => (g.codigo_idioma_destino ?? '').toLowerCase() === destino);
  }

  get hayCambios(): boolean {
    return JSON.stringify(this.formulario) !== JSON.stringify(this.guardado);
  }

  /** Al cambiar el idioma se quitan la variante y el glosario que ya no correspondan */
  alCambiarIdioma(codigo: string | null): void {
    this.formulario.idiomaDestino = codigo;
    if (!this.variantesDisponibles.some((v) => v.id_variante_regional === this.formulario.idVariante)) {
      this.formulario.idVariante = null;
    }
    if (!this.glosariosDisponibles.some((g) => g.id_glosario === this.formulario.idGlosario)) {
      this.formulario.idGlosario = null;
    }
  }

  guardar(): void {
    const f = this.formulario;
    if (f.idContexto === null || f.idTono === null) {
      this.mostrarError('Selecciona un contexto y un tono.');
      return;
    }
    this.limpiarMensajes();
    this.guardando.set(true);
    this.traduccionService
      .guardarConfiguracion({
        id_contexto: f.idContexto,
        id_tono: f.idTono,
        id_variante_regional: f.idVariante,
        explicar_expresiones: f.explicarExpresiones,
        generar_alternativas: f.generarAlternativas,
        idioma_destino: f.idiomaDestino,
        id_glosario: f.idGlosario,
      })
      .pipe(finalize(() => this.guardando.set(false)))
      .subscribe({
        next: (respuesta) => {
          this.aplicarPreferencias(respuesta.resultado);
          this.mensaje.set('Preferencias guardadas. Se aplicarán en tus próximas traducciones.');
        },
        error: (error) => this.mostrarError(this.extraerError(error, 'No se pudieron guardar las preferencias.')),
      });
  }

  descartarCambios(): void {
    if (this.guardado) {
      this.formulario = { ...this.guardado };
    }
  }

  restablecerConfirmado(): void {
    this.limpiarMensajes();
    this.guardando.set(true);
    this.traduccionService
      .restablecerConfiguracion()
      .pipe(
        finalize(() => {
          this.guardando.set(false);
          this.confirmacion.set(null);
        }),
      )
      .subscribe({
        next: (respuesta) => {
          this.aplicarPreferencias(respuesta.resultado);
          this.mensaje.set(respuesta.mensaje || 'Preferencias restablecidas a los valores por defecto.');
        },
        error: (error) => this.mostrarError(this.extraerError(error, 'No se pudieron restablecer las preferencias.')),
      });
  }

  // ---------- Aprendizaje (HU-34) ----------

  alternarAprendizaje(activo: boolean): void {
    this.errorAprendizaje.set('');
    this.cambiandoAprendizaje.set(true);
    this.aprendizajeService
      .cambiarEstado(activo)
      .pipe(finalize(() => this.cambiandoAprendizaje.set(false)))
      .subscribe({
        next: (respuesta) => {
          this.aprendizajeActivo.set(respuesta.resultado.activo);
          this.totalCorrecciones.set(respuesta.resultado.total_correcciones);
        },
        error: (error) => {
          // Se vuelve al estado real
          this.aprendizajeActivo.set(!activo);
          this.errorAprendizaje.set(this.extraerError(error, 'No se pudo cambiar el aprendizaje.'));
        },
      });
  }

  cargarCorrecciones(): void {
    this.cargandoCorrecciones.set(true);
    this.aprendizajeService
      .listarCorrecciones({ idioma_origen: this.filtroOrigen, idioma_destino: this.filtroDestino })
      .pipe(finalize(() => this.cargandoCorrecciones.set(false)))
      .subscribe({
        next: (respuesta) => this.correcciones.set(respuesta.resultado ?? []),
        error: (error) => this.errorAprendizaje.set(this.extraerError(error, 'No se pudieron cargar las correcciones.')),
      });
  }

  eliminarCorreccion(correccion: CorreccionTraduccion): void {
    if (this.eliminando() !== null) {
      return;
    }
    this.errorAprendizaje.set('');
    this.eliminando.set(correccion.id_correccion);
    this.aprendizajeService
      .eliminarCorreccion(correccion.id_correccion)
      .pipe(finalize(() => this.eliminando.set(null)))
      .subscribe({
        next: () => {
          this.correcciones.update((lista) => lista.filter((c) => c.id_correccion !== correccion.id_correccion));
          this.totalCorrecciones.update((total) => Math.max(total - 1, 0));
        },
        error: (error) => this.errorAprendizaje.set(this.extraerError(error, 'No se pudo eliminar la corrección.')),
      });
  }

  eliminarTodasConfirmado(): void {
    this.errorAprendizaje.set('');
    this.eliminando.set('todas');
    this.aprendizajeService
      .eliminarTodas()
      .pipe(
        finalize(() => {
          this.eliminando.set(null);
          this.confirmacion.set(null);
        }),
      )
      .subscribe({
        next: () => {
          this.correcciones.set([]);
          this.totalCorrecciones.set(0);
          this.mensaje.set('Se eliminó todo lo aprendido.');
        },
        error: (error) => this.errorAprendizaje.set(this.extraerError(error, 'No se pudieron eliminar las correcciones.')),
      });
  }

  // ---------- Carga ----------

  private cargarCatalogos(): void {
    this.traduccionService.obtenerIdiomas().subscribe({
      next: (r) => this.idiomas.set(r.resultado ?? []),
      error: () => this.mostrarError('No se pudieron cargar los idiomas.'),
    });
    this.traduccionService.obtenerContextos().subscribe({
      next: (r) => this.contextos.set(r.resultado ?? []),
      error: () => this.mostrarError('No se pudieron cargar los contextos.'),
    });
    this.traduccionService.obtenerTonos().subscribe({
      next: (r) => this.tonos.set(r.resultado ?? []),
      error: () => this.mostrarError('No se pudieron cargar los tonos.'),
    });
    this.traduccionService.obtenerVariantesRegionales().subscribe({
      next: (r) => this.variantes.set(r.resultado ?? []),
      error: () => this.variantes.set([]),
    });
    this.glosarioService.listar().subscribe({
      next: (r) => this.glosarios.set(r.resultado ?? []),
      error: () => this.glosarios.set([]),
    });
  }

  private cargarPreferencias(): void {
    this.traduccionService
      .obtenerConfiguracion()
      .pipe(finalize(() => this.cargando.set(false)))
      .subscribe({
        next: (respuesta) => this.aplicarPreferencias(respuesta.resultado),
        // 404: aun no guardo preferencias; el formulario queda vacio hasta que las guarde
        error: (error) => {
          if (error?.status !== 404) {
            this.mostrarError(this.extraerError(error, 'No se pudieron cargar tus preferencias.'));
          }
          this.guardado = null;
        },
      });
  }

  private cargarAprendizaje(): void {
    this.aprendizajeService.obtenerEstado().subscribe({
      next: (respuesta) => {
        this.aprendizajeActivo.set(respuesta.resultado.activo);
        this.totalCorrecciones.set(respuesta.resultado.total_correcciones);
      },
      error: (error) => this.errorAprendizaje.set(this.extraerError(error, 'No se pudo consultar el aprendizaje.')),
    });
    this.cargarCorrecciones();
  }

  private aplicarPreferencias(pref: ConfiguracionTraduccionResultado): void {
    this.formulario = {
      idiomaDestino: pref.codigo_idioma_destino ?? null,
      idContexto: pref.id_contexto ?? null,
      idTono: pref.id_tono ?? null,
      idVariante: pref.id_variante_regional ?? null,
      idGlosario: pref.id_glosario ?? null,
      explicarExpresiones: pref.explicar_expresiones ?? false,
      generarAlternativas: pref.generar_alternativas ?? false,
    };
    this.guardado = { ...this.formulario };
  }

  // ---------- Utilidades ----------

  private formularioVacio(): FormularioPreferencias {
    return {
      idiomaDestino: null,
      idContexto: null,
      idTono: null,
      idVariante: null,
      idGlosario: null,
      explicarExpresiones: false,
      generarAlternativas: false,
    };
  }

  private mostrarError(texto: string): void {
    this.mensaje.set('');
    this.error.set(texto);
  }

  private limpiarMensajes(): void {
    this.mensaje.set('');
    this.error.set('');
  }

  private extraerError(error: any, porDefecto: string): string {
    if (error?.status === 0) {
      return 'No se pudo conectar con el servidor.';
    }
    const cuerpo = error?.error;
    const validaciones = cuerpo?.resultado;
    if (Array.isArray(validaciones) && validaciones.length > 0 && validaciones[0]?.msg) {
      return String(validaciones[0].msg).replace(/^Value error, /, '');
    }
    return cuerpo?.mensaje || cuerpo?.detail || porDefecto;
  }
}
