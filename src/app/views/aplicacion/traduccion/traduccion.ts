import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DatePipe, PercentPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { merge, of, Subject } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import {
  AlternativaTraduccion,
  ConfiguracionTraduccionResultado,
  ContextoItem,
  EstadoRegion,
  ExplicacionExpresion,
  GuardarConfiguracionSolicitud,
  Idioma,
  RealizarTraduccionSolicitud,
  SugerenciaTraduccion,
  TonoItem,
  Traduccion as TraduccionModelo,
  VarianteRegionalItem
} from '../../../core/models/traduccion.model';
import { GlosarioResumen, TerminoAplicado } from '../../../core/models/glosario.model';
import { TipoCorreccion } from '../../../core/models/aprendizaje.model';
import { AprendizajeService } from '../../../core/services/aprendizaje.service';
import { GlosarioService } from '../../../core/services/glosario.service';
import { TraduccionService } from '../../../core/services/traduccion.service';
import { VozService } from '../../../core/services/voz.service';

@Component({
  selector: 'app-traduccion',
  imports: [FormsModule, RouterLink, DatePipe, PercentPipe],
  templateUrl: './traduccion.html',
  styleUrl: './traduccion.css',
})
export class Traduccion {
  private readonly traduccionService = inject(TraduccionService);
  private readonly glosarioService = inject(GlosarioService);
  private readonly aprendizajeService = inject(AprendizajeService);
  texto = '';
  resultado = '';
  origen = '';
  destino = 'en';
  idiomaOrigenDetectado: string | null = null;
  idContextoSeleccionado: number | null = null;
  idTonoSeleccionado: number | null = null;
  idVarianteSeleccionada: number | null = null;
  // Un solo glosario por traduccion; solo se ofrecen los del par de idiomas actual
  idGlosarioSeleccionado: number | null = null;
  alternativas = false;
  modismos = false;
  favorito = false;
  ayuda = false;
  verTodo = false;
  readonly cargando = signal(false);
  readonly guardandoConfiguracion = signal(false);
  readonly restableciendoConfiguracion = signal(false);
  readonly mensaje = signal('');
  readonly listaAlternativas = signal<AlternativaTraduccion[]>([]);
  readonly listaModismos = signal<ExplicacionExpresion[]>([]);
  // Historial (HU-42): la traduccion automatica no se guarda; se registra una vez al terminar
  private pendienteHistorial: {
    texto: string;
    idiomaOrigen: string;
    idiomaDestino: string;
    idGlosario: number | null;
  } | null = null;
  private guardarAlRecibir = false;
  readonly estadoHistorial = signal<'pendiente' | 'guardando' | 'guardado' | null>(null);

  // Reutilizacion de traducciones (HU-44)
  readonly sugerencias = signal<SugerenciaTraduccion[]>([]);
  readonly idSugerenciaUsada = signal<number | null>(null);

  // Aprendizaje de preferencias (HU-34)
  /** Ultima traduccion recibida del servidor (antes de elegir alternativas o corregir) */
  private ultimaTraduccion: { texto: string; generada: string; idiomaOrigen: string; idiomaDestino: string } | null = null;
  readonly editandoResultado = signal(false);
  textoEditado = '';
  readonly guardandoCorreccion = signal(false);
  readonly correccionesAplicadas = signal(0);

  // Preferencias guardadas del usuario (HU-33). Lo que se cambia en pantalla se aplica solo
  // a la traduccion actual hasta que el usuario lo guarde como preferencia.
  configuracionGuardada: {
    id_contexto: number;
    id_tono: number;
    id_variante_regional: number | null;
    explicar_expresiones: boolean;
    generar_alternativas: boolean;
    idioma_destino: string | null;
    id_glosario: number | null;
  } | null = null;
  readonly idiomas = signal<Idioma[]>([]);
  readonly contextos = signal<ContextoItem[]>([]);
  readonly tonos = signal<TonoItem[]>([]);
  readonly variantes = signal<VarianteRegionalItem[]>([]);
  readonly glosarios = signal<GlosarioResumen[]>([]);
  readonly terminosAplicados = signal<TerminoAplicado[]>([]);
  readonly estadoRegion = signal<EstadoRegion | null>(null);
  readonly explicacionesProcesadas = signal(false);
  readonly avisoVarianteLimpiada = signal('');

  // Reproduccion por voz (HU-28)
  readonly vozService = inject(VozService);
  reproduccionAutomatica = false;
  readonly avisoVoz = signal('');

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
    this.cargarGlosarios();
    this.cargarConfiguracionGuardada();
    this.configurarTraduccionAutomatica();
    inject(DestroyRef).onDestroy(() => {
      this.vozService.detener();
      // Al salir de la pagina se guarda la ultima traduccion terminada
      this.guardarEnHistorial();
    });
  }

  /** Solo las variantes del idioma de destino actual; si no hay ninguna, la lista queda vacia */
  get variantesDisponibles(): VarianteRegionalItem[] {
    if (!this.destino) {
      return [];
    }
    const destino = this.destino.toLowerCase();
    const idIdiomaDestino = this.idiomas().find(i => i.codigo.toLowerCase() === destino)?.id;
    return this.variantes().filter(v => {
      if (v.activo === false) return false;
      if (idIdiomaDestino !== undefined && v.id_idioma !== undefined) {
        return v.id_idioma === idIdiomaDestino;
      }
      // Respaldo mientras cargan los idiomas: el codigo de la variante empieza por el del idioma (es-MX -> es)
      return v.codigo.toLowerCase().split('-')[0] === destino;
    });
  }

  /** Aviso breve sobre la localizacion cultural de la ultima traduccion */
  get avisoRegion(): string {
    switch (this.estadoRegion()) {
      case 'incompatible':
        return 'La región guardada no corresponde al idioma de destino; se tradujo sin localización.';
      case 'error_adaptacion':
        return 'No se pudo adaptar a la región en este momento; se muestra la traducción base.';
      default:
        return '';
    }
  }

  /** Idioma de origen efectivo: el elegido o, si es automatico, el detectado */
  get origenEfectivo(): string {
    return (this.origen || this.idiomaOrigenDetectado || '').toLowerCase();
  }

  get glosariosDisponibles(): GlosarioResumen[] {
    const destino = this.destino.toLowerCase();
    const origen = this.origenEfectivo;
    return this.glosarios().filter(g =>
      (g.codigo_idioma_destino ?? '').toLowerCase() === destino &&
      (!origen || (g.codigo_idioma_origen ?? '').toLowerCase() === origen)
    );
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
    const mismoDestino = (this.destino || null) === this.configuracionGuardada.idioma_destino;
    const mismoGlosario = (this.idGlosarioSeleccionado ?? null) === this.configuracionGuardada.id_glosario;

    return !(
      mismoContexto && mismoTono && mismaVariante && mismosModismos && mismasAlternativas &&
      mismoDestino && mismoGlosario
    );
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
          idioma_origen: this.origen ? this.origen : null,
          id_glosario: this.idGlosarioSeleccionado,
          guardar_en_historial: false,
          // Valores puntuales (HU-33): no modifican las preferencias guardadas
          ...(this.idContextoSeleccionado ? { id_contexto: this.idContextoSeleccionado } : {}),
          id_tono: this.idTonoSeleccionado,
          id_variante_regional: this.idVarianteSeleccionada,
          explicar_expresiones: this.modismos,
          generar_alternativas: this.alternativas
        };

        return this.traduccionService.traducir(solicitud).pipe(
          catchError((error) => {
            console.error('Error al traducir:', error);
            this.cargando.set(false);
            this.listaAlternativas.set([]);
            this.listaModismos.set([]);
            this.terminosAplicados.set([]);
            this.estadoRegion.set(null);
            this.explicacionesProcesadas.set(false);
            const detalle = error?.error?.mensaje || error?.error?.detail || 'Ocurrió un error al traducir el texto.';
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
        this.terminosAplicados.set(respuesta.resultado.terminos_glosario_aplicados ?? []);
        this.estadoRegion.set(respuesta.resultado.estado_region ?? null);
        this.explicacionesProcesadas.set(respuesta.resultado.explicaciones_procesadas ?? false);
        this.sugerencias.set(respuesta.resultado.sugerencias ?? []);
        this.idSugerenciaUsada.set(null);
        this.correccionesAplicadas.set(respuesta.resultado.correcciones_aplicadas ?? 0);
        this.editandoResultado.set(false);
        this.ultimaTraduccion = {
          texto: respuesta.resultado.texto_origen,
          generada: respuesta.resultado.traduccion,
          idiomaOrigen: respuesta.resultado.idioma_origen,
          idiomaDestino: respuesta.resultado.idioma_destino,
        };
        this.pendienteHistorial = {
          texto: respuesta.resultado.texto_origen,
          idiomaOrigen: respuesta.resultado.idioma_origen,
          idiomaDestino: respuesta.resultado.idioma_destino,
          idGlosario: respuesta.resultado.id_glosario ?? null,
        };
        this.estadoHistorial.set('pendiente');
        if (this.guardarAlRecibir) {
          this.guardarAlRecibir = false;
          this.guardarEnHistorial();
        }
        if (this.reproduccionAutomatica) {
          this.reproducirResultado();
        }
      } else {
        this.listaAlternativas.set([]);
        this.listaModismos.set([]);
        this.terminosAplicados.set([]);
        this.estadoRegion.set(null);
        this.explicacionesProcesadas.set(false);
        this.sugerencias.set([]);
        this.correccionesAplicadas.set(0);
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
        this.verificarVarianteValida();
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

  private cargarGlosarios(): void {
    this.glosarioService.listar().subscribe({
      next: (respuesta) => {
        this.glosarios.set(respuesta.resultado || []);
        this.verificarGlosarioValido();
      },
      error: () => this.glosarios.set([])
    });
  }

  onDestinoChange(nuevoDestino: string): void {
    this.destino = nuevoDestino;
    this.verificarVarianteValida();
    this.verificarGlosarioValido();
    this.actualizarTexto(true);
  }

  onOrigenChange(nuevoOrigen: string): void {
    this.origen = nuevoOrigen;
    this.verificarGlosarioValido();
    this.actualizarTexto(true);
  }

  onGlosarioChange(idGlosario: number | null): void {
    this.idGlosarioSeleccionado = idGlosario;
    this.actualizarTexto(true);
  }

  /** Quita el glosario seleccionado si ya no corresponde al par de idiomas actual */
  private verificarGlosarioValido(): void {
    if (
      this.idGlosarioSeleccionado !== null &&
      !this.glosariosDisponibles.some(g => g.id_glosario === this.idGlosarioSeleccionado)
    ) {
      this.idGlosarioSeleccionado = null;
      this.terminosAplicados.set([]);
    }
  }

  /** Quita la variante seleccionada si no corresponde al idioma de destino actual */
  private verificarVarianteValida(): void {
    // Sin catalogos cargados no se puede decidir; se vuelve a verificar cuando terminen de cargar
    if (this.idVarianteSeleccionada === null || !this.variantes().length || !this.idiomas().length) {
      return;
    }
    if (!this.variantesDisponibles.some(v => v.id_variante_regional === this.idVarianteSeleccionada)) {
      this.idVarianteSeleccionada = null;
      this.avisoVarianteLimpiada.set(
        'La región seleccionada no corresponde al idioma de destino actual; se traducirá sin región.'
      );
    }
  }

  onVarianteChange(idVariante: number | null): void {
    this.idVarianteSeleccionada = idVariante;
    this.avisoVarianteLimpiada.set('');
    this.actualizarTexto(true);
  }

  onContextoChange(valor: any): void {
    if (valor === 'NUEVO') {
      this.abrirModalNuevoContexto();
      return;
    }
    this.idContextoSeleccionado = valor;
    this.actualizarTexto(true);
  }

  onTonoChange(idTono: number | null): void {
    this.idTonoSeleccionado = idTono;
    this.actualizarTexto(true);
  }

  onAlternativasChange(valor: boolean): void {
    this.alternativas = valor;
    this.actualizarTexto(true);
  }

  onModismosChange(valor: boolean): void {
    this.modismos = valor;
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
    this.guardarEnHistorial();
    this.texto = '';
    this.resultado = '';
    this.listaAlternativas.set([]);
    this.listaModismos.set([]);
    this.terminosAplicados.set([]);
    this.estadoRegion.set(null);
    this.explicacionesProcesadas.set(false);
    this.sugerencias.set([]);
    this.idSugerenciaUsada.set(null);
    this.estadoHistorial.set(null);
    this.ultimaTraduccion = null;
    this.editandoResultado.set(false);
    this.correccionesAplicadas.set(0);
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

    const clave = `${this.origen}->${this.destino}:${this.idContextoSeleccionado}:${this.idTonoSeleccionado}:${this.idVarianteSeleccionada}:${this.idGlosarioSeleccionado}:${this.alternativas}:${this.modismos}:${this.texto}`;
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
    this.guardarEnHistorial();
    const nuevoOrigen = this.destino;
    this.origen = nuevoOrigen;
    this.destino = nuevoDestino;
    this.verificarVarianteValida();
    this.verificarGlosarioValido();
    this.texto = this.resultado;
    this.resultado = '';
    this.listaAlternativas.set([]);
    this.listaModismos.set([]);
    this.explicacionesProcesadas.set(false);
    this.actualizarTexto(true);
  }

  private cargarConfiguracionGuardada(): void {
    this.traduccionService.obtenerConfiguracion().subscribe({
      next: (resp) => {
        if (resp?.resultado) {
          this.aplicarPreferencias(resp.resultado);
        }
      },
      error: () => {
        // Si no tiene configuracion registrada o da 404, se mantienen los valores por defecto
        this.configuracionGuardada = null;
      }
    });
  }

  /** Carga las preferencias guardadas en el formulario y las toma como referencia (HU-33) */
  private aplicarPreferencias(res: ConfiguracionTraduccionResultado): void {
    this.idContextoSeleccionado = res.id_contexto;
    this.idTonoSeleccionado = res.id_tono ?? null;
    this.idVarianteSeleccionada = res.id_variante_regional ?? null;
    this.modismos = res.explicar_expresiones ?? false;
    this.alternativas = res.generar_alternativas ?? false;
    if (res.codigo_idioma_destino) {
      this.destino = res.codigo_idioma_destino;
    }
    this.idGlosarioSeleccionado = res.id_glosario ?? null;

    this.configuracionGuardada = {
      id_contexto: res.id_contexto,
      id_tono: res.id_tono!,
      id_variante_regional: this.idVarianteSeleccionada,
      explicar_expresiones: this.modismos,
      generar_alternativas: this.alternativas,
      idioma_destino: res.codigo_idioma_destino ?? null,
      id_glosario: this.idGlosarioSeleccionado,
    };
    this.avisoVarianteLimpiada.set('');
    this.verificarVarianteValida();
    // Solo se valida con los glosarios ya cargados; si aun no llegan, se valida al cargarlos
    if (this.glosarios().length) {
      this.verificarGlosarioValido();
    }
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
      generar_alternativas: this.alternativas,
      idioma_destino: this.destino || null,
      id_glosario: this.idGlosarioSeleccionado
    };

    this.traduccionService.guardarConfiguracion(payload).subscribe({
      next: (respuesta) => {
        this.guardandoConfiguracion.set(false);
        this.mensaje.set(respuesta.mensaje || 'Preferencias guardadas correctamente.');
        this.aplicarPreferencias(respuesta.resultado);
      },
      error: (error) => {
        this.guardandoConfiguracion.set(false);
        console.error('Error al guardar configuración:', error);
        const detalle = error?.error?.mensaje || error?.error?.detail || 'No se pudo guardar la configuración.';
        this.mensaje.set(detalle);
      }
    });
  }

  restablecerConfiguracion(): void {
    if (!confirm('¿Restablecer tus preferencias de traducción a los valores por defecto?')) {
      return;
    }
    this.restableciendoConfiguracion.set(true);
    this.mensaje.set('');

    this.traduccionService.restablecerConfiguracion().subscribe({
      next: (respuesta) => {
        this.restableciendoConfiguracion.set(false);
        this.mensaje.set(respuesta.mensaje || 'Preferencias restablecidas.');
        this.aplicarPreferencias(respuesta.resultado);
        this.actualizarTexto(true);
      },
      error: (error) => {
        this.restableciendoConfiguracion.set(false);
        const detalle = error?.error?.mensaje || error?.error?.detail || 'No se pudieron restablecer las preferencias.';
        this.mensaje.set(detalle);
      }
    });
  }

  seleccionarAlternativa(alt: AlternativaTraduccion): void {
    this.resultado = alt.traduccion;
    this.editandoResultado.set(false);
    // HU-34: la alternativa elegida se registra como preferencia (en segundo plano, sin avisos)
    this.registrarAprendizaje('alternativa', alt.traduccion, false);
    this.guardarEnHistorial();
  }

  // ---------- Aprendizaje de preferencias (HU-34) ----------

  /** Se puede corregir la traduccion recibida mientras el texto de origen no haya cambiado */
  get puedeEditarResultado(): boolean {
    return (
      !!this.resultado.trim() &&
      !!this.ultimaTraduccion &&
      this.ultimaTraduccion.texto === this.texto.trim() &&
      !this.cargando()
    );
  }

  editarResultado(): void {
    if (!this.puedeEditarResultado) {
      return;
    }
    this.textoEditado = this.resultado;
    this.editandoResultado.set(true);
  }

  cancelarEdicion(): void {
    this.editandoResultado.set(false);
  }

  /** Usa la version corregida como resultado, la registra para aprender y la guarda en el historial */
  guardarCorreccion(): void {
    const corregida = this.textoEditado.trim();
    if (!corregida || this.guardandoCorreccion()) {
      return;
    }
    this.editandoResultado.set(false);
    if (corregida === this.resultado.trim()) {
      return;
    }
    this.resultado = corregida;
    this.registrarAprendizaje('correccion', corregida, true);
    this.guardarEnHistorial();
  }

  private registrarAprendizaje(tipo: TipoCorreccion, corregida: string, avisar: boolean): void {
    const ultima = this.ultimaTraduccion;
    if (!ultima || ultima.texto !== this.texto.trim() || corregida.trim() === ultima.generada.trim()) {
      return;
    }
    if (avisar) {
      this.guardandoCorreccion.set(true);
    }
    this.aprendizajeService
      .registrarCorreccion({
        tipo,
        texto_original: ultima.texto,
        traduccion_generada: ultima.generada,
        traduccion_corregida: corregida,
        idioma_origen: ultima.idiomaOrigen,
        idioma_destino: ultima.idiomaDestino,
      })
      .subscribe({
        next: (respuesta) => {
          this.guardandoCorreccion.set(false);
          if (avisar) {
            this.mensaje.set(
              respuesta.resultado
                ? 'Corrección guardada. Se tendrá en cuenta en tus próximas traducciones.'
                : 'Se usó tu corrección. El aprendizaje está desactivado, así que no se registró (puedes activarlo en Preferencias).',
            );
          }
        },
        error: (error) => {
          this.guardandoCorreccion.set(false);
          if (avisar) {
            this.mensaje.set(error?.error?.mensaje || 'Se usó tu corrección, pero no se pudo registrar para el aprendizaje.');
          }
        },
      });
  }

  /** HU-44: usa una traduccion anterior como resultado */
  usarSugerencia(sugerencia: SugerenciaTraduccion): void {
    this.resultado = sugerencia.texto_traducido;
    this.idSugerenciaUsada.set(sugerencia.id_traduccion);
    this.mensaje.set('Se usó una traducción anterior como resultado.');
    this.guardarEnHistorial();
  }

  /** HU-44: descarta una sugerencia; no afecta al historial */
  ignorarSugerencia(sugerencia: SugerenciaTraduccion): void {
    this.sugerencias.update((lista) => lista.filter((s) => s.id_traduccion !== sugerencia.id_traduccion));
  }

  /** Boton Traducir o Ctrl+Enter: el usuario termino, se guarda en el historial */
  traducir(): void {
    if (this.pendienteHistorial && this.pendienteHistorial.texto === this.texto.trim() && !this.cargando()) {
      this.guardarEnHistorial();
      return;
    }
    this.guardarAlRecibir = true;
    this.actualizarTexto(true);
  }

  /** El boton "Guardar en historial" solo se habilita con una traduccion terminada sin guardar */
  get puedeGuardarEnHistorial(): boolean {
    return (
      this.estadoHistorial() === 'pendiente' &&
      !!this.pendienteHistorial &&
      this.pendienteHistorial.texto === this.texto.trim() &&
      !!this.resultado.trim() &&
      !this.cargando()
    );
  }

  /**
   * Registra la ultima traduccion terminada en el historial (una sola vez). Se guarda el
   * resultado que el usuario tiene en pantalla, que puede ser una alternativa o una sugerencia.
   * `explicito` indica que lo pidio el usuario con el boton: entonces se informa el resultado.
   */
  guardarEnHistorial(explicito = false): void {
    const pendiente = this.pendienteHistorial;
    const resultado = this.resultado.trim();
    if (!pendiente || !resultado || pendiente.texto !== this.texto.trim()) {
      return;
    }
    this.pendienteHistorial = null;
    this.estadoHistorial.set('guardando');
    this.traduccionService.registrarEnHistorial({
      texto_original: pendiente.texto,
      texto_traducido: resultado,
      idioma_origen: pendiente.idiomaOrigen,
      idioma_destino: pendiente.idiomaDestino,
      id_glosario: pendiente.idGlosario,
    }).subscribe({
      next: () => {
        // Si mientras tanto llego otra traduccion, su estado ('pendiente') no se pisa
        if (this.estadoHistorial() === 'guardando') {
          this.estadoHistorial.set('guardado');
        }
        if (explicito) {
          this.mensaje.set('Traducción guardada en el historial.');
        }
      },
      error: (error) => {
        console.error('No se pudo guardar la traducción en el historial:', error);
        if (this.estadoHistorial() === 'guardando') {
          // Se deja pendiente para poder reintentar con el boton
          this.pendienteHistorial = pendiente;
          this.estadoHistorial.set('pendiente');
        }
        if (explicito) {
          this.mensaje.set(error?.error?.mensaje || 'No se pudo guardar la traducción en el historial.');
        }
      },
    });
  }

  async copiar(): Promise<void> {
    this.guardarEnHistorial();
    try {
      await navigator.clipboard.writeText(this.resultado);
      this.mensaje.set('Traducción copiada.');
    } catch {
      this.mensaje.set('No se pudo copiar. Selecciona el texto y cópialo manualmente.');
    }
  }

  /** Boton escuchar: el usuario termino, se guarda y se reproduce */
  async escuchar(): Promise<void> {
    this.guardarEnHistorial();
    await this.reproducirResultado();
  }

  private async reproducirResultado(): Promise<void> {
    this.avisoVoz.set('');
    const estado = await this.vozService.reproducir(this.resultado, this.destino);
    if (estado === 'sin_soporte') {
      this.mensaje.set('Tu navegador no permite leer el texto en voz alta.');
    } else if (estado === 'sin_voz') {
      const nombre = this.idiomas().find(i => i.codigo === this.destino)?.nombre || this.destino;
      this.avisoVoz.set(`No hay una voz disponible para ${nombre} en este navegador.`);
    }
  }

  detenerVoz(): void {
    this.vozService.detener();
  }
}




