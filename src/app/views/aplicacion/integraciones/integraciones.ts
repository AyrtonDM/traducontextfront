import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs/operators';
import {
  EstadoSesionExterna,
  PlataformaDetalle,
  SesionExterna,
} from '../../../core/models/integracion.model';
import { IntegracionService } from '../../../core/services/integracion.service';

export const ETIQUETAS_ESTADO_SESION: Record<EstadoSesionExterna, string> = {
  configurada: 'Configurada',
  activa: 'Activa',
  pausada: 'Pausada',
  finalizada: 'Finalizada',
};

/**
 * Integraciones (HU-35): vincular y desvincular Google Meet y Zoom con OAuth, y el historial de
 * sesiones de traduccion de reuniones externas.
 */
@Component({
  selector: 'app-integraciones',
  standalone: true,
  imports: [FormsModule, RouterLink, DatePipe],
  templateUrl: './integraciones.html',
  styleUrl: './integraciones.css',
})
export class Integraciones {
  private readonly integracionService = inject(IntegracionService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly plataformas = signal<PlataformaDetalle[]>([]);
  readonly sesiones = signal<SesionExterna[]>([]);
  readonly cargando = signal(true);
  readonly cargandoSesiones = signal(true);
  readonly procesando = signal<string | null>(null);
  readonly mensaje = signal('');
  readonly error = signal('');

  /** Plataforma cuyos permisos se muestran antes de ir a la pantalla oficial de autorizacion */
  readonly porAutorizar = signal<PlataformaDetalle | null>(null);
  readonly porDesvincular = signal<PlataformaDetalle | null>(null);

  filtroEstado: EstadoSesionExterna | null = null;
  readonly etiquetasEstado = ETIQUETAS_ESTADO_SESION;
  readonly estados: EstadoSesionExterna[] = ['activa', 'pausada', 'configurada', 'finalizada'];

  readonly hayVinculadas = computed(() => this.plataformas().some((p) => p.estado === 'vinculada'));

  constructor() {
    this.leerResultadoAutorizacion();
    this.cargarPlataformas();
    this.cargarSesiones();
  }

  /** Al volver de Google o Zoom, el backend redirige aqui con el resultado */
  private leerResultadoAutorizacion(): void {
    const parametros = this.route.snapshot.queryParamMap;
    const resultado = parametros.get('resultado');
    const texto = parametros.get('mensaje');
    if (!resultado) {
      return;
    }
    if (resultado === 'vinculada') {
      this.mensaje.set(texto || 'La plataforma se vinculó correctamente.');
    } else {
      this.error.set(texto || 'No se vinculó la plataforma.');
    }
    // Se limpia la URL para que el aviso no se repita al recargar
    void this.router.navigate([], { queryParams: {}, replaceUrl: true });
  }

  cargarPlataformas(): void {
    this.cargando.set(true);
    this.integracionService
      .listarPlataformas()
      .pipe(finalize(() => this.cargando.set(false)))
      .subscribe({
        next: (r) => this.plataformas.set(r.resultado ?? []),
        error: (e) => this.error.set(this.extraerError(e, 'No se pudieron cargar las plataformas.')),
      });
  }

  cargarSesiones(): void {
    this.cargandoSesiones.set(true);
    this.integracionService
      .listarSesiones(this.filtroEstado)
      .pipe(finalize(() => this.cargandoSesiones.set(false)))
      .subscribe({
        next: (r) => this.sesiones.set(r.resultado ?? []),
        error: (e) => this.error.set(this.extraerError(e, 'No se pudieron cargar las sesiones.')),
      });
  }

  /** Lleva al usuario a la pantalla oficial de autorizacion (sale de la aplicacion y vuelve al terminar) */
  continuarAutorizacion(): void {
    const plataforma = this.porAutorizar();
    if (!plataforma) {
      return;
    }
    this.limpiarMensajes();
    this.procesando.set(plataforma.plataforma);
    this.integracionService.autorizar(plataforma.plataforma).subscribe({
      next: (r) => window.location.assign(r.resultado.url_autorizacion),
      error: (e) => {
        this.procesando.set(null);
        this.porAutorizar.set(null);
        this.error.set(this.extraerError(e, 'No se pudo iniciar la vinculación.'));
      },
    });
  }

  desvincularConfirmado(): void {
    const plataforma = this.porDesvincular();
    if (!plataforma) {
      return;
    }
    this.limpiarMensajes();
    this.procesando.set(plataforma.plataforma);
    this.integracionService
      .desvincular(plataforma.plataforma)
      .pipe(
        finalize(() => {
          this.procesando.set(null);
          this.porDesvincular.set(null);
        }),
      )
      .subscribe({
        next: (r) => {
          this.mensaje.set(r.mensaje);
          this.plataformas.update((lista) => lista.map((p) => (p.plataforma === r.resultado.plataforma ? r.resultado : p)));
        },
        error: (e) => {
          this.error.set(this.extraerError(e, 'No se pudo desvincular la plataforma.'));
          this.cargarPlataformas();
        },
      });
  }

  etiquetaConexion(plataforma: PlataformaDetalle): string {
    if (!plataforma.configurada) {
      return 'No disponible';
    }
    return { vinculada: 'Vinculada', no_vinculada: 'No vinculada', expirada: 'Expirada' }[plataforma.estado];
  }

  private limpiarMensajes(): void {
    this.mensaje.set('');
    this.error.set('');
  }

  private extraerError(error: any, porDefecto: string): string {
    if (error?.status === 0) {
      return 'No se pudo conectar con el servidor.';
    }
    return error?.error?.mensaje || error?.error?.detail || porDefecto;
  }
}
