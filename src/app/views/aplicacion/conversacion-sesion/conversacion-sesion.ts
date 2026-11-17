import {
  Component,
  DestroyRef,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { Intervencion, LONGITUD_MAXIMA_INTERVENCION } from '../../../core/models/intervencion.model';
import { VozService } from '../../../core/services/voz.service';
import {
  ActualizarConversacionSolicitud,
  Conversacion,
  ConversacionRespuesta,
  EntornoItem,
  EstadoConversacion,
  ParticipanteConversacion,
} from '../../../core/models/conversacion.model';
import { ContextoItem, Idioma, TonoItem } from '../../../core/models/traduccion.model';
import { ConversacionService } from '../../../core/services/conversacion.service';
import { TraduccionService } from '../../../core/services/traduccion.service';

type AccionEstado = 'pausar' | 'reanudar' | 'finalizar';

interface ConfiguracionFormulario {
  idIdiomaOrigen: number | null;
  idIdiomaDestino: number | null;
  idEntorno: number | null;
  idContexto: number | null;
  idTono: number | null;
  descripcionContexto: string;
  mantenerContexto: boolean;
  asistenciaConversacional: boolean;
}

/** Participante a mostrar: el real de la sesion o el que se creara al iniciar (solo lectura) */
interface ParticipanteVista {
  id_participante: number | null;
  nombre: string;
  orden: number;
  nombre_idioma: string;
}

const ETIQUETAS_ESTADO: Record<EstadoConversacion, string> = {
  activa: 'Activa',
  pausada: 'Pausada',
  finalizada: 'Finalizada',
};

const LONGITUD_MAXIMA_DESCRIPCION_CONTEXTO = 1000;

/** Distancia (px) al final de la lista para considerar que el usuario "esta abajo" */
const UMBRAL_SCROLL_FINAL = 40;

/**
 * Intervencion a mostrar. `temporal` marca el mensaje optimista que se pinta mientras el POST
 * esta en curso: tiene un id negativo y no admite voz ni reintento hasta recibir el id real.
 */
type IntervencionVista = Intervencion & { temporal?: true };

/**
 * Pantalla "Conversación en tiempo real" (HU-23, HU-24, HU-29 configuracion, HU-31 participantes).
 * /conversaciones/nueva: configura y crea la sesion. /conversaciones/:id: consulta y controla una sesion.
 */
@Component({
  selector: 'app-conversacion-sesion',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './conversacion-sesion.html',
  styleUrl: './conversacion-sesion.css',
})
export class ConversacionSesion {
  private readonly conversacionService = inject(ConversacionService);
  private readonly traduccionService = inject(TraduccionService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly injector = inject(Injector);
  readonly vozService = inject(VozService);

  /** null en /conversaciones/nueva */
  readonly idConversacion: number | null;
  readonly conversacion = signal<Conversacion | null>(null);

  readonly idiomas = signal<Idioma[]>([]);
  readonly contextos = signal<ContextoItem[]>([]);
  readonly tonos = signal<TonoItem[]>([]);
  readonly entornos = signal<EntornoItem[]>([]);

  readonly cargandoSesion = signal(false);
  readonly guardando = signal(false);
  readonly mensajeError = signal('');
  readonly mensajeExito = signal('');
  readonly ayudaVisible = signal(false);
  readonly participantesVisibles = signal(true);
  readonly confirmarFinalizar = signal(false);

  // Renombrar participante (HU-31)
  readonly idParticipanteEditando = signal<number | null>(null);
  nombreParticipante = '';

  formulario: ConfiguracionFormulario = this.formularioVacio();
  readonly longitudMaximaDescripcion = LONGITUD_MAXIMA_DESCRIPCION_CONTEXTO;

  readonly contextosActivos = computed(() => this.contextos().filter((c) => c.activo !== false));
  readonly tonosActivos = computed(() => this.tonos().filter((t) => t.activo !== false));

  // Intervenciones escritas (B4)
  readonly intervenciones = signal<IntervencionVista[]>([]);
  readonly cargandoIntervenciones = signal(false);
  readonly enviando = signal(false);
  readonly reintentando = signal<ReadonlySet<number>>(new Set());
  readonly textoIntervencion = signal('');
  readonly idParticipanteHablante = signal<number | null>(null);
  readonly errorIntervencion = signal('');
  readonly avisoVoz = signal('');
  readonly idReproduciendo = signal<number | null>(null);
  readonly longitudMaximaIntervencion = LONGITUD_MAXIMA_INTERVENCION;

  private readonly listaMensajes = viewChild<ElementRef<HTMLElement>>('listaMensajes');
  private readonly entradaTexto = viewChild<ElementRef<HTMLTextAreaElement>>('entradaTexto');
  private contadorTemporal = 0;

  readonly sesionActiva = computed(() => this.conversacion()?.estado === 'activa');

  readonly participantesSesion = computed(() =>
    [...(this.conversacion()?.participantes ?? [])].sort((a, b) => a.orden - b.orden),
  );

  readonly puedeEnviar = computed(
    () =>
      this.sesionActiva() &&
      !this.enviando() &&
      this.idParticipanteHablante() !== null &&
      this.textoIntervencion().trim().length > 0,
  );

  /** Aviso breve cuando la entrada esta deshabilitada por el estado de la sesion */
  readonly avisoEntrada = computed(() => {
    const estado = this.conversacion()?.estado;
    if (!estado) {
      return 'Inicia la conversación para escribir intervenciones.';
    }
    if (estado === 'pausada') {
      return 'La sesión está pausada. Reanúdala para escribir.';
    }
    if (estado === 'finalizada') {
      return 'La sesión está finalizada. Solo puedes consultar sus intervenciones.';
    }
    return '';
  });

  constructor() {
    inject(DestroyRef).onDestroy(() => this.vozService.detener());

    const parametro = this.route.snapshot.paramMap.get('id');
    this.idConversacion = parametro === null ? null : Number(parametro);

    const estado = this.router.getCurrentNavigation()?.extras.state as { mensaje?: string } | undefined;
    if (estado?.mensaje) {
      this.mensajeExito.set(estado.mensaje);
    }

    this.cargarCatalogos();
    if (this.idConversacion !== null) {
      this.cargarConversacion();
    }
  }

  // ---------- Estado de la pantalla ----------

  get esNueva(): boolean {
    return this.idConversacion === null;
  }

  /** Sesion finalizada: pantalla de solo lectura */
  get soloLectura(): boolean {
    return this.conversacion()?.estado === 'finalizada';
  }

  /** La configuracion se puede editar en /nueva o en una sesion cargada no finalizada */
  get configuracionEditable(): boolean {
    return this.esNueva || (!!this.conversacion() && !this.soloLectura);
  }

  get etiquetaInsignia(): string {
    const actual = this.conversacion();
    if (actual) {
      return ETIQUETAS_ESTADO[actual.estado] ?? actual.estado;
    }
    return this.esNueva ? 'Lista para iniciar' : '';
  }

  get claseInsignia(): string {
    const actual = this.conversacion();
    return actual ? `estado-${actual.estado}` : 'estado-lista';
  }

  /** "Conversación: <entorno> · <dominio>" (solo entorno si no hay contexto) */
  get tituloConversacion(): string {
    const actual = this.conversacion();
    const entorno = actual
      ? actual.nombre_entorno
      : this.entornos().find((e) => e.id_entorno === this.formulario.idEntorno)?.nombre;
    const dominio = actual
      ? actual.nombre_contexto
      : this.contextos().find((c) => c.id_contexto === this.formulario.idContexto)?.nombre;
    if (!entorno) {
      return 'Conversación';
    }
    return dominio ? `Conversación: ${entorno} · ${dominio}` : `Conversación: ${entorno}`;
  }

  get participantes(): ParticipanteVista[] {
    const actual = this.conversacion();
    if (actual) {
      return actual.participantes.map((p) => ({
        id_participante: p.id_participante,
        nombre: p.nombre,
        orden: p.orden,
        nombre_idioma: p.nombre_idioma || p.codigo_idioma || '',
      }));
    }
    // En /nueva se muestran los dos participantes que se crearan con los idiomas elegidos
    return [
      { id_participante: null, nombre: 'Participante 1', orden: 1, nombre_idioma: this.nombreIdioma(this.formulario.idIdiomaOrigen) },
      { id_participante: null, nombre: 'Participante 2', orden: 2, nombre_idioma: this.nombreIdioma(this.formulario.idIdiomaDestino) },
    ];
  }

  /** Cambios pendientes de la sesion cargada, solo con los campos que difieren */
  get cambiosPendientes(): ActualizarConversacionSolicitud {
    const actual = this.conversacion();
    const cambios: ActualizarConversacionSolicitud = {};
    if (!actual) {
      return cambios;
    }
    const f = this.formulario;
    if (f.idEntorno !== null && f.idEntorno !== actual.id_entorno) {
      cambios.id_entorno = f.idEntorno;
    }
    if (f.idContexto !== (actual.id_contexto ?? null)) {
      cambios.id_contexto = f.idContexto;
    }
    if (f.idTono !== (actual.id_tono ?? null)) {
      cambios.id_tono = f.idTono;
    }
    const descripcion = f.descripcionContexto.trim() || null;
    if (descripcion !== (actual.descripcion_contexto ?? null)) {
      cambios.descripcion_contexto = descripcion;
    }
    if (f.mantenerContexto !== actual.mantener_contexto) {
      cambios.mantener_contexto = f.mantenerContexto;
    }
    if (f.asistenciaConversacional !== actual.asistencia_conversacional) {
      cambios.asistencia_conversacional = f.asistenciaConversacional;
    }
    return cambios;
  }

  get hayCambios(): boolean {
    return !this.esNueva && !this.soloLectura && Object.keys(this.cambiosPendientes).length > 0;
  }

  // ---------- Carga de datos ----------

  private cargarCatalogos(): void {
    this.traduccionService.obtenerIdiomas().subscribe({
      next: (respuesta) => this.idiomas.set(respuesta.resultado ?? []),
      error: (error) => this.mensajeError.set(this.extraerError(error, 'No se pudieron cargar los idiomas.')),
    });
    this.traduccionService.obtenerContextos().subscribe({
      next: (respuesta) => this.contextos.set(respuesta.resultado ?? []),
      error: (error) => this.mensajeError.set(this.extraerError(error, 'No se pudieron cargar los contextos.')),
    });
    this.traduccionService.obtenerTonos().subscribe({
      next: (respuesta) => this.tonos.set(respuesta.resultado ?? []),
      error: (error) => this.mensajeError.set(this.extraerError(error, 'No se pudieron cargar los tonos.')),
    });
    this.conversacionService.listarEntornos().subscribe({
      next: (respuesta) => this.entornos.set(respuesta.resultado ?? []),
      error: (error) => this.mensajeError.set(this.extraerError(error, 'No se pudieron cargar los entornos.')),
    });
  }

  private cargarConversacion(): void {
    const id = this.idConversacion;
    if (id === null || !Number.isInteger(id) || id <= 0) {
      this.mensajeError.set('La conversación indicada no es válida.');
      return;
    }
    this.cargandoSesion.set(true);
    this.conversacionService
      .obtener(id)
      .pipe(finalize(() => this.cargandoSesion.set(false)))
      .subscribe({
        next: (respuesta) => {
          this.aplicarConversacion(respuesta.resultado);
          this.cargarIntervenciones(respuesta.resultado.id_conversacion);
        },
        error: (error) => {
          this.mensajeError.set(this.extraerError(error, 'No se pudo cargar la conversación.'));
          if (error?.status === 404) {
            this.conversacion.set(null);
          }
        },
      });
  }

  // ---------- Configuracion ----------

  intercambiarIdiomas(): void {
    if (!this.esNueva) {
      return;
    }
    const { idIdiomaOrigen, idIdiomaDestino } = this.formulario;
    this.formulario.idIdiomaOrigen = idIdiomaDestino;
    this.formulario.idIdiomaDestino = idIdiomaOrigen;
  }

  iniciarConversacion(): void {
    if (!this.esNueva || this.guardando()) {
      return;
    }
    const f = this.formulario;
    if (f.idIdiomaOrigen === null || f.idIdiomaDestino === null) {
      this.mostrarError('Selecciona los dos idiomas de la conversación.');
      return;
    }
    if (f.idIdiomaOrigen === f.idIdiomaDestino) {
      this.mostrarError('Los idiomas de la conversación deben ser distintos.');
      return;
    }
    if (f.idEntorno === null) {
      this.mostrarError('Selecciona el entorno de la conversación.');
      return;
    }

    this.limpiarMensajes();
    this.guardando.set(true);
    this.conversacionService
      .iniciar({
        id_idioma_origen: f.idIdiomaOrigen,
        id_idioma_destino: f.idIdiomaDestino,
        id_entorno: f.idEntorno,
        id_contexto: f.idContexto,
        id_tono: f.idTono,
        descripcion_contexto: f.descripcionContexto.trim() || null,
        mantener_contexto: f.mantenerContexto,
        asistencia_conversacional: f.asistenciaConversacional,
      })
      .pipe(finalize(() => this.guardando.set(false)))
      .subscribe({
        next: (respuesta) =>
          this.router.navigate(['/conversaciones', respuesta.resultado.id_conversacion], {
            replaceUrl: true,
            state: { mensaje: respuesta.mensaje || 'Conversación iniciada correctamente.' },
          }),
        error: (error) => this.mensajeError.set(this.extraerError(error, 'No se pudo iniciar la conversación.')),
      });
  }

  guardarCambios(): void {
    const actual = this.conversacion();
    const cambios = this.cambiosPendientes;
    if (!actual || !this.hayCambios || this.guardando()) {
      return;
    }
    this.limpiarMensajes();
    this.guardando.set(true);
    this.conversacionService
      .actualizar(actual.id_conversacion, cambios)
      .pipe(finalize(() => this.guardando.set(false)))
      .subscribe({
        next: (respuesta) => {
          this.aplicarConversacion(respuesta.resultado);
          this.mensajeExito.set(respuesta.mensaje);
        },
        error: (error) => {
          this.mensajeError.set(this.extraerError(error, 'No se pudieron guardar los cambios.'));
          this.manejarErrorSesion(error, actual.id_conversacion);
        },
      });
  }

  // ---------- Pausar / reanudar / finalizar ----------

  alternarPausa(): void {
    const actual = this.conversacion();
    if (actual?.estado === 'activa') {
      this.ejecutarAccion('pausar', 'No se pudo pausar la conversación.');
    } else if (actual?.estado === 'pausada') {
      this.ejecutarAccion('reanudar', 'No se pudo reanudar la conversación.');
    }
  }

  solicitarFinalizar(): void {
    if (this.conversacion() && !this.soloLectura) {
      this.confirmarFinalizar.set(true);
    }
  }

  cancelarFinalizar(): void {
    if (!this.guardando()) {
      this.confirmarFinalizar.set(false);
    }
  }

  finalizarConfirmado(): void {
    this.ejecutarAccion('finalizar', 'No se pudo finalizar la conversación.', () =>
      this.confirmarFinalizar.set(false),
    );
  }

  private ejecutarAccion(accion: AccionEstado, porDefecto: string, alTerminar?: () => void): void {
    const actual = this.conversacion();
    if (!actual || this.guardando()) {
      return;
    }
    const peticiones: Record<AccionEstado, (id: number) => Observable<ConversacionRespuesta>> = {
      pausar: (id) => this.conversacionService.pausar(id),
      reanudar: (id) => this.conversacionService.reanudar(id),
      finalizar: (id) => this.conversacionService.finalizar(id),
    };

    this.limpiarMensajes();
    this.guardando.set(true);
    peticiones[accion](actual.id_conversacion)
      .pipe(
        finalize(() => {
          this.guardando.set(false);
          alTerminar?.();
        }),
      )
      .subscribe({
        next: (respuesta) => {
          this.aplicarConversacion(respuesta.resultado);
          this.mensajeExito.set(respuesta.mensaje);
        },
        error: (error) => {
          this.mensajeError.set(this.extraerError(error, porDefecto));
          this.manejarErrorSesion(error, actual.id_conversacion);
        },
      });
  }

  // ---------- Participantes (HU-31) ----------

  editarParticipante(participante: ParticipanteVista): void {
    if (participante.id_participante === null || this.soloLectura) {
      return;
    }
    this.nombreParticipante = participante.nombre;
    this.idParticipanteEditando.set(participante.id_participante);
  }

  cancelarEdicionParticipante(): void {
    if (!this.guardando()) {
      this.idParticipanteEditando.set(null);
    }
  }

  guardarParticipante(): void {
    const actual = this.conversacion();
    const idParticipante = this.idParticipanteEditando();
    const nombre = this.nombreParticipante.trim();
    if (!actual || idParticipante === null || this.guardando()) {
      return;
    }
    if (!nombre) {
      this.mostrarError('El nombre del participante no puede estar vacío.');
      return;
    }
    this.limpiarMensajes();
    this.guardando.set(true);
    this.conversacionService
      .renombrarParticipante(actual.id_conversacion, idParticipante, nombre)
      .pipe(finalize(() => this.guardando.set(false)))
      .subscribe({
        next: (respuesta) => {
          this.reemplazarParticipante(respuesta.resultado);
          this.idParticipanteEditando.set(null);
          this.mensajeExito.set(respuesta.mensaje);
        },
        error: (error) => {
          this.mensajeError.set(this.extraerError(error, 'No se pudo actualizar el participante.'));
          this.manejarErrorSesion(error, actual.id_conversacion);
        },
      });
  }

  private reemplazarParticipante(participante: ParticipanteConversacion): void {
    this.conversacion.update((actual) =>
      actual
        ? {
            ...actual,
            participantes: actual.participantes.map((p) =>
              p.id_participante === participante.id_participante ? participante : p,
            ),
          }
        : actual,
    );
  }

  // ---------- Intervenciones escritas (B4) ----------

  /** Carga inicial: todas las intervenciones de la sesion y baja al final */
  private cargarIntervenciones(idConversacion: number): void {
    this.cargandoIntervenciones.set(true);
    this.conversacionService
      .listarIntervenciones(idConversacion)
      .pipe(finalize(() => this.cargandoIntervenciones.set(false)))
      .subscribe({
        next: (respuesta) => {
          this.intervenciones.set(this.ordenar(respuesta.resultado ?? []));
          this.bajarAlFinal(true);
        },
        error: (error) =>
          this.errorIntervencion.set(this.extraerError(error, 'No se pudieron cargar las intervenciones.')),
      });
  }

  /** Enter envia; Shift+Enter (o una composicion de acentos/IME en curso) inserta un salto de linea */
  alPulsarTecla(evento: KeyboardEvent): void {
    if (evento.key !== 'Enter' || evento.shiftKey || evento.isComposing) {
      return;
    }
    evento.preventDefault();
    this.enviarIntervencion();
  }

  enviarIntervencion(): void {
    const actual = this.conversacion();
    const idParticipante = this.idParticipanteHablante();
    const texto = this.textoIntervencion().trim();
    if (!actual || idParticipante === null || !this.puedeEnviar()) {
      return;
    }
    const temporal = this.crearTemporal(actual, idParticipante, texto);
    if (!temporal) {
      this.errorIntervencion.set('Selecciona quién habla.');
      return;
    }

    this.errorIntervencion.set('');
    this.avisoVoz.set('');
    this.enviando.set(true);
    this.agregar([temporal]);

    this.conversacionService
      .registrarIntervencion(actual.id_conversacion, { id_participante: idParticipante, texto })
      .subscribe({
        next: (respuesta) => {
          this.quitarTemporal(temporal.id);
          this.agregar([respuesta.resultado]);
          this.textoIntervencion.set('');
          this.terminarEnvio();
        },
        error: (error) => {
          this.quitarTemporal(temporal.id);
          this.errorIntervencion.set(this.extraerError(error, 'No se pudo enviar la intervención.'));
          if (error?.status === 0 || error?.status >= 500) {
            // El servidor pudo haberla guardado: se sincroniza antes de permitir otro envio
            this.sincronizarTrasFallo(actual.id_conversacion, idParticipante, texto);
            return;
          }
          this.manejarErrorSesion(error, actual.id_conversacion);
          this.terminarEnvio();
        },
      });
  }

  reintentarIntervencion(intervencion: IntervencionVista): void {
    const actual = this.conversacion();
    if (!actual || intervencion.temporal || this.reintentando().has(intervencion.id)) {
      return;
    }
    this.errorIntervencion.set('');
    this.marcarReintento(intervencion.id, true);
    this.conversacionService
      .reintentarIntervencion(actual.id_conversacion, intervencion.id)
      .pipe(finalize(() => this.marcarReintento(intervencion.id, false)))
      .subscribe({
        next: (respuesta) => this.agregar([respuesta.resultado]),
        error: (error) => {
          this.errorIntervencion.set(this.extraerError(error, 'No se pudo reintentar la traducción.'));
          this.manejarErrorSesion(error, actual.id_conversacion);
        },
      });
  }

  /** Reintento disponible en 'error' y en 'procesando' ya guardada (el backend decide si quedo interrumpida) */
  puedeReintentar(intervencion: IntervencionVista): boolean {
    return !intervencion.temporal && intervencion.estado !== 'traducida';
  }

  estaReintentando(intervencion: IntervencionVista): boolean {
    return this.reintentando().has(intervencion.id);
  }

  async reproducirVoz(intervencion: IntervencionVista): Promise<void> {
    if (intervencion.temporal || intervencion.estado !== 'traducida' || !intervencion.texto_traducido) {
      return;
    }
    if (this.idReproduciendo() === intervencion.id && this.vozService.reproduciendo()) {
      this.vozService.detener();
      this.idReproduciendo.set(null);
      return;
    }
    this.avisoVoz.set('');
    const resultado = await this.vozService.reproducir(
      intervencion.texto_traducido,
      intervencion.codigo_idioma_destino ?? '',
      this.conversacion()?.estado === 'activa',
    );
    if (resultado === 'reproduciendo') {
      this.idReproduciendo.set(intervencion.id);
    } else if (resultado === 'sin_soporte') {
      this.avisoVoz.set('Tu navegador no permite leer el texto en voz alta.');
    } else if (resultado === 'sin_voz') {
      const idioma = intervencion.nombre_idioma_destino || intervencion.codigo_idioma_destino || 'este idioma';
      this.avisoVoz.set(`No hay una voz disponible para ${idioma} en este navegador.`);
    } else if (resultado === 'deshabilitado') {
      this.avisoVoz.set('La reproducción por voz solo está disponible con la sesión activa.');
    }
  }

  estaReproduciendo(intervencion: IntervencionVista): boolean {
    return this.vozService.reproduciendo() && this.idReproduciendo() === intervencion.id;
  }

  /**
   * Tras un fallo de red/servidor se piden las intervenciones posteriores a la ultima conocida.
   * Si la enviada aparece, se limpia la caja para evitar un duplicado al reenviar.
   */
  private sincronizarTrasFallo(idConversacion: number, idParticipante: number, texto: string): void {
    const ultimoId = this.ultimoIdReal();
    this.conversacionService
      .listarIntervenciones(idConversacion, ultimoId)
      .pipe(finalize(() => this.terminarEnvio()))
      .subscribe({
        next: (respuesta) => {
          const nuevas = respuesta.resultado ?? [];
          this.agregar(nuevas);
          const registrada = nuevas.some(
            (i) => i.id_participante === idParticipante && i.texto_original.trim() === texto,
          );
          if (registrada) {
            this.textoIntervencion.set('');
            this.errorIntervencion.set('');
          }
        },
        // Sin conexion tampoco se puede sincronizar: se conserva el texto y el error original
        error: () => undefined,
      });
  }

  private terminarEnvio(): void {
    this.enviando.set(false);
    this.enfocarEntrada();
  }

  /** Mensaje optimista con los datos del participante; el destino es el idioma del otro participante */
  private crearTemporal(actual: Conversacion, idParticipante: number, texto: string): IntervencionVista | null {
    const habla = actual.participantes.find((p) => p.id_participante === idParticipante);
    const escucha = actual.participantes.find((p) => p.id_participante !== idParticipante);
    if (!habla || !escucha) {
      return null;
    }
    const id = -++this.contadorTemporal;
    return {
      id,
      id_intervencion: id,
      id_conversacion: actual.id_conversacion,
      id_participante: habla.id_participante,
      nombre_participante: habla.nombre,
      orden_participante: habla.orden,
      orden: Number.MAX_SAFE_INTEGER,
      texto_original: texto,
      texto_traducido: null,
      id_idioma_origen: habla.id_idioma,
      id_idioma_destino: escucha.id_idioma,
      codigo_idioma_origen: habla.codigo_idioma,
      codigo_idioma_destino: escucha.codigo_idioma,
      nombre_idioma_origen: habla.nombre_idioma,
      nombre_idioma_destino: escucha.nombre_idioma,
      estado: 'procesando',
      fecha_creacion: new Date().toISOString(),
      temporal: true,
    };
  }

  /** Inserta o reemplaza por id y mantiene el orden; solo baja si el usuario ya estaba al final */
  private agregar(nuevas: IntervencionVista[]): void {
    if (nuevas.length === 0) {
      return;
    }
    const estabaAbajo = this.estaAlFinal();
    this.intervenciones.update((lista) => {
      const porId = new Map(lista.map((i) => [i.id, i]));
      nuevas.forEach((i) => porId.set(i.id, i));
      return this.ordenar([...porId.values()]);
    });
    this.bajarAlFinal(estabaAbajo);
  }

  private quitarTemporal(id: number): void {
    this.intervenciones.update((lista) => lista.filter((i) => i.id !== id));
  }

  /** Las reales por su orden; las temporales siempre al final */
  private ordenar(lista: IntervencionVista[]): IntervencionVista[] {
    return [...lista].sort((a, b) => a.orden - b.orden || a.id - b.id);
  }

  private ultimoIdReal(): number | null {
    const reales = this.intervenciones().filter((i) => !i.temporal);
    return reales.length ? Math.max(...reales.map((i) => i.id)) : null;
  }

  private marcarReintento(id: number, activo: boolean): void {
    this.reintentando.update((actual) => {
      const copia = new Set(actual);
      if (activo) {
        copia.add(id);
      } else {
        copia.delete(id);
      }
      return copia;
    });
  }

  /** Sin lista (aun no hay mensajes) cuenta como "abajo" */
  private estaAlFinal(): boolean {
    const lista = this.listaMensajes()?.nativeElement;
    if (!lista) {
      return true;
    }
    return lista.scrollHeight - lista.scrollTop - lista.clientHeight < UMBRAL_SCROLL_FINAL;
  }

  private bajarAlFinal(debeBajar: boolean): void {
    if (!debeBajar) {
      return;
    }
    afterNextRender(
      {
        write: () => {
          const lista = this.listaMensajes()?.nativeElement;
          if (lista) {
            lista.scrollTop = lista.scrollHeight;
          }
        },
      },
      { injector: this.injector },
    );
  }

  private enfocarEntrada(): void {
    afterNextRender({ write: () => this.entradaTexto()?.nativeElement.focus() }, { injector: this.injector });
  }

  // ---------- Utilidades ----------

  /** Muestra la sesion y sincroniza el formulario con lo guardado */
  private aplicarConversacion(conversacion: Conversacion): void {
    this.conversacion.set(conversacion);
    this.formulario = {
      idIdiomaOrigen: conversacion.id_idioma_origen,
      idIdiomaDestino: conversacion.id_idioma_destino,
      idEntorno: conversacion.id_entorno,
      idContexto: conversacion.id_contexto ?? null,
      idTono: conversacion.id_tono ?? null,
      descripcionContexto: conversacion.descripcion_contexto ?? '',
      mantenerContexto: conversacion.mantener_contexto,
      asistenciaConversacional: conversacion.asistencia_conversacional,
    };
    if (conversacion.estado === 'finalizada') {
      this.idParticipanteEditando.set(null);
    }
    if (conversacion.estado !== 'activa' && this.idReproduciendo() !== null) {
      this.vozService.detener();
      this.idReproduciendo.set(null);
    }
    // Por defecto habla el Participante 1; se conserva la eleccion si sigue siendo valida
    const hablante = this.idParticipanteHablante();
    if (!conversacion.participantes.some((p) => p.id_participante === hablante)) {
      const primero = [...conversacion.participantes].sort((a, b) => a.orden - b.orden)[0];
      this.idParticipanteHablante.set(primero?.id_participante ?? null);
    }
  }

  /** 404: la sesion ya no existe o no es del usuario. 400: se recarga para reflejar el estado real. */
  private manejarErrorSesion(error: any, idConversacion: number): void {
    if (error?.status === 404) {
      this.conversacion.set(null);
      this.confirmarFinalizar.set(false);
      return;
    }
    if (error?.status === 400) {
      this.conversacionService.obtener(idConversacion).subscribe({
        next: (respuesta) => this.aplicarConversacion(respuesta.resultado),
        error: (errorRecarga) => {
          if (errorRecarga?.status === 404) {
            this.manejarErrorSesion(errorRecarga, idConversacion);
          }
        },
      });
    }
  }

  private nombreIdioma(idIdioma: number | null): string {
    return this.idiomas().find((i) => i.id === idIdioma)?.nombre ?? 'Sin seleccionar';
  }

  private formularioVacio(): ConfiguracionFormulario {
    return {
      idIdiomaOrigen: null,
      idIdiomaDestino: null,
      idEntorno: null,
      idContexto: null,
      idTono: null,
      descripcionContexto: '',
      mantenerContexto: true,
      asistenciaConversacional: false,
    };
  }

  private mostrarError(mensaje: string): void {
    this.mensajeExito.set('');
    this.mensajeError.set(mensaje);
  }

  private limpiarMensajes(): void {
    this.mensajeError.set('');
    this.mensajeExito.set('');
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
