import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { Conversacion, EstadoConversacion } from '../../../core/models/conversacion.model';
import { ConversacionService } from '../../../core/services/conversacion.service';

const ETIQUETAS_ESTADO: Record<EstadoConversacion, string> = {
  activa: 'Activa',
  pausada: 'Pausada',
  finalizada: 'Finalizada',
};

/** Lista de conversaciones del usuario (HU-23). La sesion se abre en /conversaciones/:id. */
@Component({
  selector: 'app-conversaciones',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './conversaciones.html',
  styleUrl: './conversaciones.css',
})
export class Conversaciones {
  private readonly conversacionService = inject(ConversacionService);

  readonly conversaciones = signal<Conversacion[]>([]);
  readonly filtroEstado = signal<EstadoConversacion | null>(null);
  readonly ayudaVisible = signal(false);

  readonly cargandoLista = signal(true);
  readonly guardando = signal(false);
  readonly mensajeError = signal('');
  readonly mensajeExito = signal('');

  // Modal confirmar finalizacion
  readonly confirmarFinalizar = signal<Conversacion | null>(null);

  readonly opcionesFiltro: { valor: EstadoConversacion | null; etiqueta: string }[] = [
    { valor: null, etiqueta: 'Todas' },
    { valor: 'activa', etiqueta: 'Activas' },
    { valor: 'pausada', etiqueta: 'Pausadas' },
    { valor: 'finalizada', etiqueta: 'Finalizadas' },
  ];

  constructor() {
    this.cargarConversaciones();
  }

  // ---------- Lista y filtro ----------

  private cargarConversaciones(): void {
    this.cargandoLista.set(true);
    this.conversacionService
      .listar(this.filtroEstado())
      .pipe(finalize(() => this.cargandoLista.set(false)))
      .subscribe({
        next: (respuesta) => this.conversaciones.set(respuesta.resultado ?? []),
        error: (error) =>
          this.mensajeError.set(this.extraerError(error, 'No se pudieron cargar las conversaciones.')),
      });
  }

  cambiarFiltro(estado: EstadoConversacion | null): void {
    if (this.filtroEstado() === estado) {
      return;
    }
    this.limpiarMensajes();
    this.filtroEstado.set(estado);
    this.cargarConversaciones();
  }

  // ---------- Finalizar ----------

  solicitarFinalizar(conversacion: Conversacion): void {
    this.limpiarMensajes();
    this.confirmarFinalizar.set(conversacion);
  }

  cancelarFinalizar(): void {
    if (!this.guardando()) {
      this.confirmarFinalizar.set(null);
    }
  }

  finalizarConfirmado(): void {
    const aFinalizar = this.confirmarFinalizar();
    if (!aFinalizar || this.guardando()) {
      return;
    }
    this.guardando.set(true);
    this.conversacionService
      .finalizar(aFinalizar.id_conversacion)
      .pipe(
        finalize(() => {
          this.guardando.set(false);
          this.confirmarFinalizar.set(null);
        }),
      )
      .subscribe({
        next: (respuesta) => {
          this.aplicarConversacion(respuesta.resultado);
          this.mensajeExito.set(respuesta.mensaje);
        },
        error: (error) => {
          this.mensajeError.set(this.extraerError(error, 'No se pudo finalizar la conversación.'));
          this.manejarErrorSesion(error, aFinalizar.id_conversacion);
        },
      });
  }

  // ---------- Utilidades ----------

  etiquetaEstado(estado: EstadoConversacion): string {
    return ETIQUETAS_ESTADO[estado] ?? estado;
  }

  parIdiomas(conversacion: Conversacion): string {
    const origen = (conversacion.codigo_idioma_origen || '?').toUpperCase();
    const destino = (conversacion.codigo_idioma_destino || '?').toUpperCase();
    return `${origen} → ${destino}`;
  }

  formatearFecha(fecha?: string | null): string {
    if (!fecha) {
      return '—';
    }
    const valor = new Date(fecha);
    return Number.isNaN(valor.getTime())
      ? fecha
      : valor.toLocaleString('es', { dateStyle: 'medium', timeStyle: 'short' });
  }

  /** Actualiza la sesion en la lista respetando el filtro activo */
  private aplicarConversacion(conversacion: Conversacion): void {
    const filtro = this.filtroEstado();
    this.conversaciones.update((lista) =>
      filtro !== null && conversacion.estado !== filtro
        ? lista.filter((c) => c.id_conversacion !== conversacion.id_conversacion)
        : lista.map((c) => (c.id_conversacion === conversacion.id_conversacion ? conversacion : c)),
    );
  }

  /** 404: la sesion ya no existe o no es del usuario. 400: se recarga para reflejar el estado real. */
  private manejarErrorSesion(error: any, idConversacion: number): void {
    if (error?.status === 404) {
      this.conversaciones.update((lista) => lista.filter((c) => c.id_conversacion !== idConversacion));
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
