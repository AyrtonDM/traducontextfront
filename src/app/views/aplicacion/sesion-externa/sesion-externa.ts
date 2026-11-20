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
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { EntornoItem } from '../../../core/models/conversacion.model';
import { GlosarioResumen } from '../../../core/models/glosario.model';
import {
  ActualizarSesionExternaSolicitud,
  IntervencionExterna,
  ParticipanteExterno,
  Plataforma,
  PlataformaDetalle,
  SesionExterna,
} from '../../../core/models/integracion.model';
import { ContextoItem, Idioma, TonoItem } from '../../../core/models/traduccion.model';
import { CapturaAudioService, ErrorCaptura } from '../../../core/services/captura-audio.service';
import { ConversacionService } from '../../../core/services/conversacion.service';
import { GlosarioService } from '../../../core/services/glosario.service';
import { AccionServicio, IntegracionService } from '../../../core/services/integracion.service';
import { TraduccionService } from '../../../core/services/traduccion.service';
import { VozService } from '../../../core/services/voz.service';
import { ETIQUETAS_ESTADO_SESION } from '../integraciones/integraciones';

interface Formulario {
  plataforma: Plataforma | null;
  enlace: string;
  idIdiomaOrigen: number | null;
  idIdiomaDestino: number | null;
  idEntorno: number | null;
  idContexto: number | null;
  idTono: number | null;
  idGlosario: number | null;
  descripcion: string;
}

/** Fragmento capturado pendiente de envio, con el hablante elegido en ese momento */
interface Fragmento {
  audio: Blob;
  idParticipante: number | null;
}

type ModoSubtitulos = 'ambos' | 'traduccion';

const MENSAJES_CAPTURA: Record<ErrorCaptura, string> = {
  sin_soporte: 'Tu navegador no permite capturar el audio de otra pestaña. Usa Chrome o Edge en una computadora.',
  cancelada: 'No se compartió ninguna pestaña. Pulsa «Conectar audio» y elige la pestaña de la reunión.',
  sin_audio: 'Se compartió sin audio. Vuelve a conectar y marca «Compartir audio de la pestaña».',
  conexion_perdida: 'Se perdió la conexión con la reunión (se dejó de compartir o se cerró la pestaña). Vuelve a conectar el audio para continuar.',
  desconocido: 'Falló la captura del audio. Vuelve a conectar el audio de la reunión.',
};

/** Preferencias de visualizacion de los subtitulos (por navegador) */
const CLAVE_SUBTITULOS = 'traducontext.subtitulosReunion';
const TAMANO_MINIMO = 13;
const TAMANO_MAXIMO = 30;

function leerPreferenciasSubtitulos(): { modo: ModoSubtitulos; tamano: number; voz: boolean } {
  const porDefecto = { modo: 'ambos' as ModoSubtitulos, tamano: 16, voz: false };
  try {
    const guardado = JSON.parse(localStorage.getItem(CLAVE_SUBTITULOS) ?? 'null');
    if (!guardado) {
      return porDefecto;
    }
    return {
      modo: guardado.modo === 'traduccion' ? 'traduccion' : 'ambos',
      tamano: Math.min(TAMANO_MAXIMO, Math.max(TAMANO_MINIMO, Number(guardado.tamano) || 16)),
      voz: guardado.voz === true,
    };
  } catch {
    return porDefecto;
  }
}

/**
 * Sesion de traduccion de una reunion de Meet o Zoom:
 * HU-36 configuracion, HU-37 captura, HU-38 traduccion, HU-39 subtitulos y voz, HU-40 participantes
 * y HU-41 control del servicio (iniciar, pausar, reanudar y finalizar sin afectar la reunion).
 */
@Component({
  selector: 'app-sesion-externa',
  standalone: true,
  imports: [FormsModule, RouterLink, DatePipe],
  providers: [CapturaAudioService],
  templateUrl: './sesion-externa.html',
  styleUrl: './sesion-externa.css',
})
export class SesionExternaVista {
  private readonly integracionService = inject(IntegracionService);
  private readonly traduccionService = inject(TraduccionService);
  private readonly conversacionService = inject(ConversacionService);
  private readonly glosarioService = inject(GlosarioService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly injector = inject(Injector);
  readonly captura = inject(CapturaAudioService);
  readonly vozService = inject(VozService);

  readonly idSesion: number | null;
  readonly sesion = signal<SesionExterna | null>(null);

  // Catalogos
  readonly plataformas = signal<PlataformaDetalle[]>([]);
  readonly idiomas = signal<Idioma[]>([]);
  readonly entornos = signal<EntornoItem[]>([]);
  readonly contextos = signal<ContextoItem[]>([]);
  readonly tonos = signal<TonoItem[]>([]);
  readonly glosarios = signal<GlosarioResumen[]>([]);

  formulario: Formulario = {
    plataforma: null, enlace: '', idIdiomaOrigen: null, idIdiomaDestino: null, idEntorno: null,
    idContexto: null, idTono: null, idGlosario: null, descripcion: '',
  };

  readonly cargando = signal(false);
  readonly guardando = signal(false);
  readonly mensaje = signal('');
  readonly error = signal('');
  readonly confirmarFinalizar = signal(false);

  // Captura (HU-37)
  readonly errorCaptura = signal('');
  readonly conectandoCaptura = signal(false);
  readonly fragmentosPendientes = signal(0);
  private cola: Fragmento[] = [];
  private enviandoFragmento = false;

  // Subtitulos (HU-39)
  readonly intervenciones = signal<IntervencionExterna[]>([]);
  private readonly preferencias = leerPreferenciasSubtitulos();
  readonly modoSubtitulos = signal<ModoSubtitulos>(this.preferencias.modo);
  readonly tamanoTexto = signal(this.preferencias.tamano);
  readonly vozAutomatica = signal(this.preferencias.voz);
  readonly idLeyendo = signal<number | null>(null);
  readonly reintentando = signal<number | null>(null);
  private readonly listaSubtitulos = viewChild<ElementRef<HTMLElement>>('listaSubtitulos');

  // Participantes (HU-40)
  readonly hablanteActual = signal<number | null>(null);
  readonly idEditando = signal<number | null>(null);
  nombreEditado = '';
  readonly sincronizando = signal(false);
  readonly avisoParticipantes = signal('');

  readonly etiquetasEstado = ETIQUETAS_ESTADO_SESION;
  readonly tamanoMinimo = TAMANO_MINIMO;
  readonly tamanoMaximo = TAMANO_MAXIMO;

  readonly estado = computed(() => this.sesion()?.estado ?? null);
  readonly activa = computed(() => this.estado() === 'activa');
  readonly finalizada = computed(() => this.estado() === 'finalizada');
  readonly participantes = computed(() => this.sesion()?.participantes ?? []);
  readonly plataformasVinculadas = computed(() => this.plataformas().filter((p) => p.estado === 'vinculada'));

  /** Texto del indicador de captura (HU-37: el usuario debe saber que la captura esta activa) */
  readonly estadoCaptura = computed(() => {
    if (this.finalizada()) {
      return 'Servicio finalizado';
    }
    if (!this.captura.conectada()) {
      return this.activa() ? 'Audio de la reunión sin conectar' : 'Captura apagada';
    }
    if (this.captura.grabando()) {
      return 'Capturando el audio de la reunión';
    }
    return this.estado() === 'pausada' ? 'Captura en pausa' : 'Audio conectado, esperando inicio';
  });

  constructor() {
    const parametro = this.route.snapshot.paramMap.get('id');
    this.idSesion = parametro === null ? null : Number(parametro);
    const estadoNavegacion = this.router.getCurrentNavigation()?.extras.state as { mensaje?: string } | undefined;
    if (estadoNavegacion?.mensaje) {
      this.mensaje.set(estadoNavegacion.mensaje);
    }

    inject(DestroyRef).onDestroy(() => {
      this.captura.desconectar();
      this.vozService.detener();
    });

    this.cargarCatalogos();
    if (this.idSesion === null) {
      this.cargarPreferencias();
    } else {
      this.cargarSesion();
    }
  }

  get esNueva(): boolean {
    return this.idSesion === null;
  }

  /** Enlace e idiomas solo se editan antes de iniciar el servicio */
  get edicionInicial(): boolean {
    return this.esNueva || this.estado() === 'configurada';
  }

  get configuracionEditable(): boolean {
    return this.esNueva || (!!this.sesion() && !this.finalizada());
  }

  /** Glosarios del par de idiomas, en cualquier sentido (se aplican solo en el suyo) */
  get glosariosDisponibles(): GlosarioResumen[] {
    const { idIdiomaOrigen: a, idIdiomaDestino: b } = this.formulario;
    if (a === null || b === null) {
      return [];
    }
    return this.glosarios().filter(
      (g) => (g.id_idioma_origen === a && g.id_idioma_destino === b) || (g.id_idioma_origen === b && g.id_idioma_destino === a),
    );
  }

  get glosarioSeleccionado(): GlosarioResumen | null {
    return this.glosariosDisponibles.find((g) => g.id_glosario === this.formulario.idGlosario) ?? null;
  }

  get cambiosPendientes(): ActualizarSesionExternaSolicitud {
    const s = this.sesion();
    const f = this.formulario;
    const cambios: ActualizarSesionExternaSolicitud = {};
    if (!s) {
      return cambios;
    }
    if (this.edicionInicial) {
      if (f.enlace.trim() && f.enlace.trim() !== s.enlace_reunion) cambios.enlace_reunion = f.enlace.trim();
      if (f.idIdiomaOrigen !== null && f.idIdiomaOrigen !== s.id_idioma_origen) cambios.id_idioma_origen = f.idIdiomaOrigen;
      if (f.idIdiomaDestino !== null && f.idIdiomaDestino !== s.id_idioma_destino) cambios.id_idioma_destino = f.idIdiomaDestino;
    }
    if (f.idEntorno !== null && f.idEntorno !== s.id_entorno) cambios.id_entorno = f.idEntorno;
    if (f.idContexto !== s.id_contexto) cambios.id_contexto = f.idContexto;
    if (f.idTono !== s.id_tono) cambios.id_tono = f.idTono;
    const glosario = this.glosarioSeleccionado?.id_glosario ?? null;
    if (glosario !== s.id_glosario) cambios.id_glosario = glosario;
    const descripcion = f.descripcion.trim() || null;
    if (descripcion !== s.descripcion_contexto) cambios.descripcion_contexto = descripcion;
    return cambios;
  }

  get hayCambios(): boolean {
    return !this.esNueva && this.configuracionEditable && Object.keys(this.cambiosPendientes).length > 0;
  }

  // ---------- Carga ----------

  private cargarCatalogos(): void {
    this.integracionService.listarPlataformas().subscribe({
      next: (r) => {
        this.plataformas.set(r.resultado ?? []);
        const vinculadas = this.plataformasVinculadas();
        if (this.esNueva && this.formulario.plataforma === null && vinculadas.length > 0) {
          this.formulario.plataforma = vinculadas[0].plataforma;
        }
      },
      error: () => this.plataformas.set([]),
    });
    this.traduccionService.obtenerIdiomas().subscribe({ next: (r) => this.idiomas.set(r.resultado ?? []) });
    this.conversacionService.listarEntornos().subscribe({ next: (r) => this.entornos.set(r.resultado ?? []) });
    this.traduccionService.obtenerContextos().subscribe({
      next: (r) => this.contextos.set((r.resultado ?? []).filter((c) => c.activo !== false)),
    });
    this.traduccionService.obtenerTonos().subscribe({
      next: (r) => this.tonos.set((r.resultado ?? []).filter((t) => t.activo !== false)),
    });
    this.glosarioService.listar().subscribe({ next: (r) => this.glosarios.set(r.resultado ?? []), error: () => undefined });
  }

  /** HU-36: la configuracion de una sesion nueva parte de las preferencias guardadas (HU-33) */
  private cargarPreferencias(): void {
    this.traduccionService.obtenerConfiguracion().subscribe({
      next: (r) => {
        const pref = r?.resultado;
        if (!pref) {
          return;
        }
        const f = this.formulario;
        f.idIdiomaDestino ??= pref.id_idioma_destino ?? null;
        f.idContexto ??= pref.id_contexto ?? null;
        f.idTono ??= pref.id_tono ?? null;
        f.idGlosario ??= pref.id_glosario ?? null;
      },
      error: () => undefined,
    });
  }

  private cargarSesion(): void {
    const id = this.idSesion;
    if (id === null || !Number.isInteger(id) || id <= 0) {
      this.error.set('La sesión indicada no es válida.');
      return;
    }
    this.cargando.set(true);
    this.integracionService
      .obtenerSesion(id)
      .pipe(finalize(() => this.cargando.set(false)))
      .subscribe({
        next: (r) => {
          this.aplicarSesion(r.resultado);
          this.cargarIntervenciones(id);
        },
        error: (e) => this.error.set(this.extraerError(e, 'No se pudo cargar la sesión.')),
      });
  }

  private cargarIntervenciones(id: number): void {
    this.integracionService.listarIntervenciones(id).subscribe({
      next: (r) => {
        this.intervenciones.set(r.resultado ?? []);
        this.bajarAlFinal(true);
      },
      error: (e) => this.error.set(this.extraerError(e, 'No se pudieron cargar los subtítulos.')),
    });
  }

  private aplicarSesion(s: SesionExterna): void {
    this.sesion.set(s);
    this.formulario = {
      plataforma: s.plataforma,
      enlace: s.enlace_reunion,
      idIdiomaOrigen: s.id_idioma_origen,
      idIdiomaDestino: s.id_idioma_destino,
      idEntorno: s.id_entorno,
      idContexto: s.id_contexto,
      idTono: s.id_tono,
      idGlosario: s.id_glosario,
      descripcion: s.descripcion_contexto ?? '',
    };
    if (this.hablanteActual() !== null && !s.participantes.some((p) => p.id_participante === this.hablanteActual())) {
      this.hablanteActual.set(null);
    }
    // La captura sigue al estado real del servicio
    if (s.estado !== 'activa') {
      this.captura.detenerGrabacion();
    }
    if (s.estado === 'finalizada') {
      this.captura.desconectar();
    }
  }

  // ---------- Configuracion (HU-36) ----------

  intercambiarIdiomas(): void {
    if (!this.edicionInicial) {
      return;
    }
    const { idIdiomaOrigen, idIdiomaDestino } = this.formulario;
    this.formulario.idIdiomaOrigen = idIdiomaDestino;
    this.formulario.idIdiomaDestino = idIdiomaOrigen;
  }

  crear(): void {
    const f = this.formulario;
    if (!f.plataforma) {
      this.mostrarError('Elige una plataforma vinculada.');
      return;
    }
    if (!f.enlace.trim()) {
      this.mostrarError('Indica el enlace o el identificador de la reunión.');
      return;
    }
    if (f.idIdiomaOrigen === null || f.idIdiomaDestino === null || f.idIdiomaOrigen === f.idIdiomaDestino) {
      this.mostrarError('Elige dos idiomas distintos para los participantes.');
      return;
    }
    if (f.idEntorno === null) {
      this.mostrarError('Elige el entorno de la reunión.');
      return;
    }
    this.limpiarMensajes();
    this.guardando.set(true);
    this.integracionService
      .crearSesion({
        plataforma: f.plataforma,
        enlace_reunion: f.enlace.trim(),
        id_idioma_origen: f.idIdiomaOrigen,
        id_idioma_destino: f.idIdiomaDestino,
        id_entorno: f.idEntorno,
        id_contexto: f.idContexto,
        id_tono: f.idTono,
        id_glosario: this.glosarioSeleccionado?.id_glosario ?? null,
        descripcion_contexto: f.descripcion.trim() || null,
      })
      .pipe(finalize(() => this.guardando.set(false)))
      .subscribe({
        next: (r) =>
          this.router.navigate(['/integraciones/sesiones', r.resultado.id_sesion_externa], {
            replaceUrl: true,
            state: { mensaje: 'Sesión configurada. Abre la reunión en otra pestaña y pulsa «Iniciar traducción».' },
          }),
        error: (e) => this.mostrarError(this.extraerError(e, 'No se pudo configurar la sesión.')),
      });
  }

  guardarCambios(): void {
    const s = this.sesion();
    if (!s || !this.hayCambios || this.guardando()) {
      return;
    }
    this.limpiarMensajes();
    this.guardando.set(true);
    this.integracionService
      .actualizarSesion(s.id_sesion_externa, this.cambiosPendientes)
      .pipe(finalize(() => this.guardando.set(false)))
      .subscribe({
        next: (r) => {
          this.aplicarSesion(r.resultado);
          this.mensaje.set(r.mensaje);
        },
        error: (e) => this.mostrarError(this.extraerError(e, 'No se pudieron guardar los cambios.')),
      });
  }

  // ---------- Control del servicio (HU-41) ----------

  /** Inicia el servicio y pide el audio de la reunion (no se captura nada antes) */
  iniciar(): void {
    this.ejecutar('iniciar', () => void this.conectarCaptura());
  }

  pausar(): void {
    // Se deja de capturar en el acto, sin esperar la respuesta
    this.captura.detenerGrabacion();
    this.ejecutar('pausar');
  }

  reanudar(): void {
    this.ejecutar('reanudar', () => {
      if (this.captura.conectada()) {
        this.captura.grabar();
      } else {
        void this.conectarCaptura();
      }
    });
  }

  finalizarConfirmado(): void {
    this.captura.detenerGrabacion();
    this.ejecutar('finalizar', () => {
      this.captura.desconectar();
      this.confirmarFinalizar.set(false);
    });
  }

  private ejecutar(accion: AccionServicio, alTerminar?: () => void): void {
    const s = this.sesion();
    if (!s || this.guardando()) {
      return;
    }
    this.limpiarMensajes();
    this.guardando.set(true);
    this.integracionService
      .cambiarServicio(s.id_sesion_externa, accion)
      .pipe(finalize(() => this.guardando.set(false)))
      .subscribe({
        next: (r) => {
          this.aplicarSesion(r.resultado);
          this.mensaje.set(r.mensaje);
          alTerminar?.();
        },
        error: (e) => {
          this.mostrarError(this.extraerError(e, 'No se pudo cambiar el estado del servicio.'));
          this.confirmarFinalizar.set(false);
          this.recargarEstado();
        },
      });
  }

  private recargarEstado(): void {
    const s = this.sesion();
    if (s) {
      this.integracionService.obtenerSesion(s.id_sesion_externa).subscribe({ next: (r) => this.aplicarSesion(r.resultado) });
    }
  }

  // ---------- Captura (HU-37) ----------

  async conectarCaptura(): Promise<void> {
    if (!this.activa() && this.estado() !== 'pausada') {
      return;
    }
    this.errorCaptura.set('');
    this.conectandoCaptura.set(true);
    const error = await this.captura.conectar({
      alFragmento: (audio) => this.encolar(audio),
      alError: (fallo) => this.errorCaptura.set(MENSAJES_CAPTURA[fallo]),
    });
    this.conectandoCaptura.set(false);
    if (error) {
      this.errorCaptura.set(MENSAJES_CAPTURA[error]);
      return;
    }
    if (this.activa()) {
      this.captura.grabar();
    }
  }

  private encolar(audio: Blob): void {
    // Solo con el servicio activo (en pausa el fragmento en curso se descarta)
    if (!this.activa()) {
      return;
    }
    this.cola.push({ audio, idParticipante: this.hablanteActual() });
    this.fragmentosPendientes.set(this.cola.length + (this.enviandoFragmento ? 1 : 0));
    this.procesarCola();
  }

  /** Envio secuencial: los subtitulos llegan en el orden en que se hablo */
  private procesarCola(): void {
    const s = this.sesion();
    if (this.enviandoFragmento || !s) {
      return;
    }
    const siguiente = this.cola.shift();
    if (!siguiente) {
      this.fragmentosPendientes.set(0);
      return;
    }
    this.enviandoFragmento = true;
    this.integracionService.enviarAudio(s.id_sesion_externa, siguiente.audio, siguiente.idParticipante).subscribe({
      next: (r) => {
        if (r.resultado) {
          this.agregar(r.resultado);
          this.leerAutomatico(r.resultado);
        }
        this.errorCaptura.set('');
        this.terminarFragmento();
      },
      error: (e) => {
        if (e?.status === 409) {
          // El servicio ya no esta activo: se deja de capturar y se muestra el estado real
          this.cola = [];
          this.captura.detenerGrabacion();
          this.recargarEstado();
        } else {
          this.errorCaptura.set(this.extraerError(e, 'No se pudo procesar un fragmento de la reunión. La captura continúa.'));
        }
        this.terminarFragmento();
      },
    });
  }

  private terminarFragmento(): void {
    this.enviandoFragmento = false;
    this.fragmentosPendientes.set(this.cola.length);
    this.procesarCola();
  }

  // ---------- Subtitulos (HU-38, HU-39) ----------

  private agregar(intervencion: IntervencionExterna): void {
    const abajo = this.estaAlFinal();
    this.intervenciones.update((lista) => {
      const porId = new Map(lista.map((i) => [i.id_intervencion, i]));
      porId.set(intervencion.id_intervencion, intervencion);
      return [...porId.values()].sort((a, b) => a.orden - b.orden);
    });
    this.bajarAlFinal(abajo);
  }

  reintentar(intervencion: IntervencionExterna): void {
    const s = this.sesion();
    if (!s || this.reintentando() !== null) {
      return;
    }
    this.reintentando.set(intervencion.id_intervencion);
    this.integracionService
      .reintentarIntervencion(s.id_sesion_externa, intervencion.id_intervencion)
      .pipe(finalize(() => this.reintentando.set(null)))
      .subscribe({
        next: (r) => r.resultado && this.agregar(r.resultado),
        error: (e) => this.mostrarError(this.extraerError(e, 'No se pudo volver a traducir.')),
      });
  }

  cambiarModo(modo: ModoSubtitulos): void {
    this.modoSubtitulos.set(modo);
    this.guardarPreferenciasSubtitulos();
  }

  cambiarTamano(delta: number): void {
    this.tamanoTexto.update((t) => Math.min(TAMANO_MAXIMO, Math.max(TAMANO_MINIMO, t + delta)));
    this.guardarPreferenciasSubtitulos();
  }

  alternarVoz(activa: boolean): void {
    this.vozAutomatica.set(activa);
    if (!activa) {
      this.vozService.detener();
      this.idLeyendo.set(null);
    }
    this.guardarPreferenciasSubtitulos();
  }

  /** Lectura en voz de una traduccion (manual) */
  async leer(intervencion: IntervencionExterna): Promise<void> {
    if (this.idLeyendo() === intervencion.id_intervencion && this.vozService.reproduciendo()) {
      this.vozService.detener();
      this.idLeyendo.set(null);
      return;
    }
    await this.reproducir(intervencion);
  }

  private leerAutomatico(intervencion: IntervencionExterna): void {
    if (this.vozAutomatica() && this.activa() && intervencion.estado === 'traducida') {
      void this.reproducir(intervencion);
    }
  }

  private async reproducir(intervencion: IntervencionExterna): Promise<void> {
    if (!intervencion.texto_traducido) {
      return;
    }
    const resultado = await this.vozService.reproducir(intervencion.texto_traducido, intervencion.codigo_idioma_destino ?? '');
    if (resultado === 'reproduciendo') {
      this.idLeyendo.set(intervencion.id_intervencion);
    } else if (resultado === 'sin_voz') {
      this.errorCaptura.set(`No hay una voz disponible para ${intervencion.nombre_idioma_destino || 'ese idioma'} en este navegador.`);
    } else if (resultado === 'sin_soporte') {
      this.errorCaptura.set('Tu navegador no permite leer el texto en voz alta.');
    }
  }

  private guardarPreferenciasSubtitulos(): void {
    try {
      localStorage.setItem(
        CLAVE_SUBTITULOS,
        JSON.stringify({ modo: this.modoSubtitulos(), tamano: this.tamanoTexto(), voz: this.vozAutomatica() }),
      );
    } catch {
      // Sin almacenamiento la preferencia dura mientras la pantalla este abierta
    }
  }

  private estaAlFinal(): boolean {
    const lista = this.listaSubtitulos()?.nativeElement;
    return !lista || lista.scrollHeight - lista.scrollTop - lista.clientHeight < 60;
  }

  private bajarAlFinal(debe: boolean): void {
    if (!debe) {
      return;
    }
    afterNextRender(
      {
        write: () => {
          const lista = this.listaSubtitulos()?.nativeElement;
          if (lista) {
            lista.scrollTop = lista.scrollHeight;
          }
        },
      },
      { injector: this.injector },
    );
  }

  // ---------- Participantes (HU-40) ----------

  agregarParticipante(): void {
    const s = this.sesion();
    if (!s) {
      return;
    }
    this.integracionService.agregarParticipante(s.id_sesion_externa).subscribe({
      next: () => this.recargarEstado(),
      error: (e) => this.mostrarError(this.extraerError(e, 'No se pudo agregar el participante.')),
    });
  }

  editarParticipante(p: ParticipanteExterno): void {
    if (!p.generico || this.finalizada()) {
      return;
    }
    this.nombreEditado = p.nombre;
    this.idEditando.set(p.id_participante);
  }

  guardarParticipante(): void {
    const s = this.sesion();
    const id = this.idEditando();
    const nombre = this.nombreEditado.trim();
    if (!s || id === null || !nombre) {
      return;
    }
    this.integracionService.renombrarParticipante(s.id_sesion_externa, id, nombre).subscribe({
      next: (r) => {
        this.idEditando.set(null);
        this.sesion.update((actual) =>
          actual ? { ...actual, participantes: actual.participantes.map((p) => (p.id_participante === id ? r.resultado : p)) } : actual,
        );
        this.intervenciones.update((lista) => lista.map((i) => (i.id_participante === id ? { ...i, nombre_participante: nombre } : i)));
      },
      error: (e) => this.mostrarError(this.extraerError(e, 'No se pudo renombrar el participante.')),
    });
  }

  sincronizarParticipantes(): void {
    const s = this.sesion();
    if (!s || this.sincronizando()) {
      return;
    }
    this.avisoParticipantes.set('');
    this.sincronizando.set(true);
    this.integracionService
      .sincronizarParticipantes(s.id_sesion_externa)
      .pipe(finalize(() => this.sincronizando.set(false)))
      .subscribe({
        next: (r) => {
          this.sesion.update((actual) => (actual ? { ...actual, participantes: r.resultado.participantes } : actual));
          this.avisoParticipantes.set(r.resultado.aviso ?? r.mensaje);
        },
        error: (e) => this.avisoParticipantes.set(this.extraerError(e, 'No se pudieron obtener los participantes.')),
      });
  }

  /** Corrige quien hablo en una intervencion ya traducida */
  asignarHablante(intervencion: IntervencionExterna, idParticipante: number | null): void {
    const s = this.sesion();
    if (!s) {
      return;
    }
    this.integracionService.asignarParticipante(s.id_sesion_externa, intervencion.id_intervencion, idParticipante).subscribe({
      next: (r) => r.resultado && this.agregar(r.resultado),
      error: (e) => this.mostrarError(this.extraerError(e, 'No se pudo asignar el participante.')),
    });
  }

  // ---------- Utilidades ----------

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
