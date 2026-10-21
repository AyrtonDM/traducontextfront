import { Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { merge, of, Subject } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import {
  ContextoItem,
  Idioma,
  RealizarTraduccionSolicitud,
  TonoItem,
  Traduccion as TraduccionModelo,
  VarianteRegionalItem
} from '../../../core/models/traduccion.model';
import { TraduccionService } from '../../../core/services/traduccion.service';

@Component({
  selector: 'app-traduccion',
  imports: [FormsModule, RouterLink],
  templateUrl: './traduccion.html',
  styleUrl: './traduccion.css',
})
export class Traduccion {
  private readonly traduccionService = inject(TraduccionService);
  texto = '';
  resultado = '';
  origen = '';
  destino = 'en';
  idiomaOrigenDetectado: string | null = null;
  idContextoSeleccionado: number | null = null;
  idTonoSeleccionado: number | null = null;
  idVarianteSeleccionada: number | null = null;
  alternativas = true;
  modismos = false;
  formatoLocal = false;
  favorito = false;
  ayuda = false;
  verTodo = false;
  readonly cargando = signal(false);
  readonly mensaje = signal('');
  readonly idiomas = signal<Idioma[]>([]);
  readonly contextos = signal<ContextoItem[]>([]);
  readonly tonos = signal<TonoItem[]>([]);
  readonly variantes = signal<VarianteRegionalItem[]>([]);

  // Modal nuevo contexto
  readonly modalNuevoContextoAbierto = signal(false);
  nombreNuevoContexto = '';
  descripcionNuevoContexto = '';
  readonly guardandoContexto = signal(false);
  readonly errorModal = signal('');

  readonly recientes: TraduccionModelo[] = [];

  private readonly debouncedTrigger$ = new Subject<string>();
  private readonly immediateTrigger$ = new Subject<string>();

  constructor() {
    this.cargarIdiomas();
    this.cargarContextos();
    this.cargarTonos();
    this.cargarVariantes();
    this.configurarTraduccionAutomatica();
  }

  get variantesDisponibles(): VarianteRegionalItem[] {
    const lista = this.variantes().filter(v => v.activo !== false);
    if (!this.destino) {
      return lista;
    }
    const coincidentes = lista.filter(v =>
      v.codigo.toLowerCase().startsWith(this.destino.toLowerCase())
    );
    return coincidentes.length > 0 ? coincidentes : lista;
  }

  private configurarTraduccionAutomatica(): void {
    merge(
      this.debouncedTrigger$.pipe(
        debounceTime(400),
        distinctUntilChanged()
      ),
      this.immediateTrigger$
    ).pipe(
      switchMap(() => {
        const textoLimpio = this.texto.trim();
        if (!textoLimpio) {
          this.resultado = '';
          this.cargando.set(false);
          return of(null);
        }

        if (!this.destino) {
          this.cargando.set(false);
          return of(null);
        }

        this.cargando.set(true);

        const solicitud: RealizarTraduccionSolicitud = {
          texto_a_traducir: textoLimpio,
          idioma_destino: this.destino,
          idioma_origen: this.origen ? this.origen : null,
          id_contexto: this.idContextoSeleccionado
        };

        return this.traduccionService.traducir(solicitud).pipe(
          catchError((error) => {
            console.error('Error al traducir:', error);
            this.cargando.set(false);
            this.mensaje.set('Ocurrió un error al traducir el texto.');
            return of(null);
          })
        );
      }),
      takeUntilDestroyed()
    ).subscribe((respuesta) => {
      this.cargando.set(false);
      if (respuesta?.resultado) {
        this.resultado = respuesta.resultado.traduccion;
        this.idiomaOrigenDetectado = respuesta.resultado.idioma_origen;
      }
    });
  }

  private cargarIdiomas(): void {
    this.traduccionService.obtenerIdiomas().subscribe({
      next: (respuesta) => {
        this.idiomas.set(respuesta.resultado);
        if (respuesta.resultado.length > 0 && !this.destino) {
          this.destino = respuesta.resultado[0].codigo;
        }
      },
      error: () => this.mensaje.set('No se pudieron cargar los idiomas disponibles.'),
    });
  }

  private cargarContextos(): void {
    this.traduccionService.obtenerContextos().subscribe({
      next: (respuesta) => {
        const lista = respuesta.resultado || [];
        this.contextos.set(lista);
        if (lista.length > 0) {
          if (!this.idContextoSeleccionado || !lista.some(c => c.id_contexto === this.idContextoSeleccionado)) {
            this.idContextoSeleccionado = lista[0].id_contexto;
          }
        } else {
          this.idContextoSeleccionado = null;
        }
      },
      error: () => this.mensaje.set('No se pudieron cargar los contextos disponibles.'),
    });
  }

  private cargarTonos(): void {
    this.traduccionService.obtenerTonos().subscribe({
      next: (respuesta) => {
        const lista = respuesta.resultado || [];
        this.tonos.set(lista);
        if (lista.length > 0 && !this.idTonoSeleccionado) {
          this.idTonoSeleccionado = lista[0].id_tono;
        }
      },
      error: () => this.mensaje.set('No se pudieron cargar los tonos disponibles.')
    });
  }

  private cargarVariantes(): void {
    this.traduccionService.obtenerVariantesRegionales().subscribe({
      next: (respuesta) => {
        this.variantes.set(respuesta.resultado || []);
        this.verificarVarianteValida();
      },
      error: () => this.mensaje.set('No se pudieron cargar las variantes regionales.')
    });
  }

  onDestinoChange(nuevoDestino: string): void {
    this.destino = nuevoDestino;
    this.verificarVarianteValida();
    this.actualizarTexto(true);
  }

  private verificarVarianteValida(): void {
    if (this.idVarianteSeleccionada !== null) {
      const disponibles = this.variantesDisponibles;
      if (!disponibles.some(v => v.id_variante_regional === this.idVarianteSeleccionada)) {
        this.idVarianteSeleccionada = null;
      }
    }
  }

  onContextoChange(valor: any): void {
    if (valor === 'NUEVO') {
      this.abrirModalNuevoContexto();
      return;
    }
    this.idContextoSeleccionado = valor;
    this.actualizarTexto(true);
  }

  abrirModalNuevoContexto(): void {
    this.nombreNuevoContexto = '';
    this.descripcionNuevoContexto = '';
    this.errorModal.set('');
    this.guardandoContexto.set(false);
    this.modalNuevoContextoAbierto.set(true);
  }

  cancelarModalContexto(): void {
    this.modalNuevoContextoAbierto.set(false);
    this.seleccionarPrimerContexto();
  }

  guardarModalContexto(): void {
    const nombre = this.nombreNuevoContexto.trim();
    if (!nombre) {
      this.errorModal.set('El nombre del contexto es obligatorio.');
      return;
    }

    this.guardandoContexto.set(true);
    this.errorModal.set('');

    this.traduccionService.crearContexto({
      nombre,
      descripcion: this.descripcionNuevoContexto.trim() || null
    }).subscribe({
      next: () => {
        this.guardandoContexto.set(false);
        this.modalNuevoContextoAbierto.set(false);
        this.mensaje.set('Contexto creado correctamente.');
        this.traduccionService.obtenerContextos().subscribe({
          next: (resp) => {
            this.contextos.set(resp.resultado || []);
            this.seleccionarPrimerContexto();
          },
          error: () => {
            this.seleccionarPrimerContexto();
          }
        });
      },
      error: (err) => {
        this.guardandoContexto.set(false);
        this.errorModal.set(err.error?.detail || err.error?.mensaje || 'No se pudo crear el contexto.');
      }
    });
  }

  private seleccionarPrimerContexto(): void {
    const lista = this.contextos();
    if (lista && lista.length > 0) {
      this.idContextoSeleccionado = lista[0].id_contexto;
    } else {
      this.idContextoSeleccionado = null;
    }
    this.actualizarTexto(true);
  }

  limpiar(): void {
    this.texto = '';
    this.resultado = '';
    this.favorito = false;
    this.mensaje.set('');
    this.cargando.set(false);
  }

  actualizarTexto(inmediato: boolean = false): void {
    this.favorito = false;
    this.mensaje.set('');

    const textoLimpio = this.texto.trim();
    if (!textoLimpio) {
      this.resultado = '';
      this.cargando.set(false);
      return;
    }

    const clave = `${this.origen}->${this.destino}:${this.idContextoSeleccionado}:${this.idTonoSeleccionado}:${this.idVarianteSeleccionada}:${this.texto}`;
    if (inmediato) {
      this.immediateTrigger$.next(clave);
    } else {
      this.debouncedTrigger$.next(clave);
    }
  }

  intercambiar(): void {
    const nuevoDestino = this.origen || this.idiomaOrigenDetectado;
    if (!nuevoDestino) {
      return;
    }
    const nuevoOrigen = this.destino;
    this.origen = nuevoOrigen;
    this.destino = nuevoDestino;
    this.verificarVarianteValida();
    this.texto = this.resultado;
    this.resultado = '';
    this.actualizarTexto(true);
  }

  traducir(): void {
    this.actualizarTexto(true);
  }

  async copiar(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.resultado);
      this.mensaje.set('Traducción copiada.');
    } catch {
      this.mensaje.set('No se pudo copiar. Selecciona el texto y cópialo manualmente.');
    }
  }

  escuchar(): void {
    if (!('speechSynthesis' in window)) {
      this.mensaje.set('Tu navegador no permite leer el texto en voz alta.');
      return;
    }
    window.speechSynthesis.cancel();
    const voz = new SpeechSynthesisUtterance(this.resultado);
    voz.lang = this.destino;
    window.speechSynthesis.speak(voz);
  }
}
