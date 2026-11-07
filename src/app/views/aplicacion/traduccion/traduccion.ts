import { Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { merge, of, Subject } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import {
  AlternativaTraduccion,
  ContextoItem,
  ExplicacionExpresion,
  GuardarConfiguracionSolicitud,
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
  alternativas = false;
  modismos = false;
  favorito = false;
  ayuda = false;
  verTodo = false;
  readonly cargando = signal(false);
  readonly guardandoConfiguracion = signal(false);
  readonly mensaje = signal('');
  readonly listaAlternativas = signal<AlternativaTraduccion[]>([]);
  readonly listaModismos = signal<ExplicacionExpresion[]>([]);

  // Configuracion obtenida del endpoint o guardada previamente en base de datos
  configuracionGuardada: {
    id_contexto: number;
    id_tono: number;
    id_variante_regional: number | null;
    explicar_expresiones: boolean;
    generar_alternativas: boolean;
  } | null = null;
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
    this.cargarConfiguracionGuardada();
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

  get hayCambiosEnConfiguracion(): boolean {
    if (!this.idContextoSeleccionado || !this.idTonoSeleccionado) {
      return false;
    }

    if (!this.configuracionGuardada) {
      return true;
    }

    const mismoContexto = this.idContextoSeleccionado === this.configuracionGuardada.id_contexto;
    const mismoTono = this.idTonoSeleccionado === this.configuracionGuardada.id_tono;
    const mismaVariante = (this.idVarianteSeleccionada ?? null) === (this.configuracionGuardada.id_variante_regional ?? null);
    const mismosModismos = this.modismos === this.configuracionGuardada.explicar_expresiones;
    const mismasAlternativas = this.alternativas === this.configuracionGuardada.generar_alternativas;

    return !(mismoContexto && mismoTono && mismaVariante && mismosModismos && mismasAlternativas);
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
          this.listaAlternativas.set([]);
          this.listaModismos.set([]);
          this.cargando.set(false);
          return of(null);
        }

        if (!this.destino) {
          this.cargando.set(false);
          return of(null);
        }

        this.cargando.set(true);

        const solicitud: RealizarTraduccionSolicitud = {
          idioma_destino: this.destino,
          texto_a_traducir: textoLimpio,
          texto_origen: textoLimpio,
          texto: textoLimpio,
          idioma_origen: this.origen ? this.origen : null
        };

        return this.traduccionService.traducir(solicitud).pipe(
          catchError((error) => {
            console.error('Error al traducir:', error);
            this.cargando.set(false);
            this.listaAlternativas.set([]);
            this.listaModismos.set([]);
            const detalle = error?.error?.detail || 'Ocurrió un error al traducir el texto.';
            this.mensaje.set(detalle);
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
        this.listaAlternativas.set(respuesta.resultado.alternativas ?? []);
        this.listaModismos.set(respuesta.resultado.explicacion_expresiones ?? []);
      } else {
        this.listaAlternativas.set([]);
        this.listaModismos.set([]);
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
        if (lista.length > 0) {
          if (!this.idTonoSeleccionado || !lista.some(t => t.id_tono === this.idTonoSeleccionado)) {
            this.idTonoSeleccionado = lista[0].id_tono;
          }
        } else {
          this.idTonoSeleccionado = null;
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
    const descripcion = this.descripcionNuevoContexto.trim();

    if (!nombre) {
      this.errorModal.set('El nombre del contexto es obligatorio.');
      return;
    }

    if (!descripcion) {
      this.errorModal.set('La descripción del contexto es obligatoria.');
      return;
    }

    this.guardandoContexto.set(true);
    this.errorModal.set('');

    this.traduccionService.crearContexto({
      nombre,
      descripcion
    }).subscribe({
      next: (respuesta) => {
          this.guardandoContexto.set(false);
          this.modalNuevoContextoAbierto.set(false);
          this.mensaje.set(respuesta.mensaje || 'Contexto guardado correctamente.');
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
    this.listaAlternativas.set([]);
    this.listaModismos.set([]);
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
      this.listaAlternativas.set([]);
      this.listaModismos.set([]);
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
    this.listaAlternativas.set([]);
    this.listaModismos.set([]);
    this.actualizarTexto(true);
  }

  private cargarConfiguracionGuardada(): void {
    this.traduccionService.obtenerConfiguracion().subscribe({
      next: (resp) => {
        if (resp?.resultado) {
          const res = resp.resultado;
          this.idContextoSeleccionado = res.id_contexto;
          this.idTonoSeleccionado = res.id_tono ?? null;
          this.idVarianteSeleccionada = res.id_variante_regional ?? null;
          this.modismos = res.explicar_expresiones ?? false;
          this.alternativas = res.generar_alternativas ?? false;

          // Se almacena la configuración de referencia
          this.configuracionGuardada = {
            id_contexto: this.idContextoSeleccionado,
            id_tono: this.idTonoSeleccionado!,
            id_variante_regional: this.idVarianteSeleccionada,
            explicar_expresiones: this.modismos,
            generar_alternativas: this.alternativas,
          };
        }
      },
      error: () => {
        // Si no tiene configuracion registrada o da 404, se mantienen los valores por defecto
        this.configuracionGuardada = null;
      }
    });
  }

  guardarConfiguracion(): void {
    if (!this.idContextoSeleccionado) {
      this.mensaje.set('Por favor, selecciona un contexto.');
      return;
    }
    if (!this.idTonoSeleccionado) {
      this.mensaje.set('Por favor, selecciona un tono.');
      return;
    }

    this.guardandoConfiguracion.set(true);
    this.mensaje.set('');

    const payload: GuardarConfiguracionSolicitud = {
      id_contexto: this.idContextoSeleccionado,
      id_tono: this.idTonoSeleccionado,
      id_variante_regional: this.idVarianteSeleccionada !== null ? this.idVarianteSeleccionada : null,
      explicar_expresiones: this.modismos,
      generar_alternativas: this.alternativas
    };

    this.traduccionService.guardarConfiguracion(payload).subscribe({
      next: (respuesta) => {
        this.guardandoConfiguracion.set(false);
        this.mensaje.set(respuesta.mensaje || 'Configuracion guardada correctamente.');

        // Actualizamos la configuración guardada con los nuevos valores para deshabilitar el botón
        this.configuracionGuardada = {
          id_contexto: this.idContextoSeleccionado!,
          id_tono: this.idTonoSeleccionado!,
          id_variante_regional: this.idVarianteSeleccionada !== null ? this.idVarianteSeleccionada : null,
          explicar_expresiones: this.modismos,
          generar_alternativas: this.alternativas,
        };

        if (this.texto.trim()) {
          this.actualizarTexto(true);
        }
      },
      error: (error) => {
        this.guardandoConfiguracion.set(false);
        console.error('Error al guardar configuración:', error);
        const detalle = error?.error?.detail || 'No se pudo guardar la configuración.';
        this.mensaje.set(detalle);
      }
    });
  }

  seleccionarAlternativa(alt: AlternativaTraduccion): void {
    this.resultado = alt.traduccion;
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




