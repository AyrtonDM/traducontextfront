import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import {
  ListaNotificacionesRespuesta,
  MarcarLeidasRespuesta,
  Notificacion,
  NotificacionRespuesta,
} from '../models/notificacion.model';

/** Notificaciones del usuario autenticado (bandeja del header). */
@Injectable({
  providedIn: 'root'
})
export class NotificacionesService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/notificaciones`;

  private static readonly TAMANO_PAGINA = 20;
  private static readonly INTERVALO_REFRESCO_MS = 60_000;

  readonly notificaciones = signal<Notificacion[]>([]);
  readonly noLeidas = signal(0);
  readonly cargando = signal(false);
  readonly error = signal<string | null>(null);
  readonly hayNoLeidas = computed(() => this.noLeidas() > 0);

  private temporizador: ReturnType<typeof setInterval> | null = null;
  private readonly pendientes = new Set<number>();

  /** Carga inicial + refresco periodico y al volver a la pestana. */
  iniciar(): void {
    this.cargar();
    if (this.temporizador) return;
    this.temporizador = setInterval(() => this.cargar(true), NotificacionesService.INTERVALO_REFRESCO_MS);
    document.addEventListener('visibilitychange', this.alCambiarVisibilidad);
  }

  detener(): void {
    if (this.temporizador) {
      clearInterval(this.temporizador);
      this.temporizador = null;
    }
    document.removeEventListener('visibilitychange', this.alCambiarVisibilidad);
    this.notificaciones.set([]);
    this.noLeidas.set(0);
    this.error.set(null);
  }

  /** @param silencioso no muestra el indicador de carga (refrescos en segundo plano). */
  cargar(silencioso = false): void {
    if (!localStorage.getItem('auth_token')) return;
    if (!silencioso) this.cargando.set(true);

    this.http
      .get<ListaNotificacionesRespuesta>(this.apiUrl, {
        params: { pagina: 1, tamano_pagina: NotificacionesService.TAMANO_PAGINA },
      })
      .subscribe({
        next: ({ resultado }) => {
          this.notificaciones.set(resultado.elementos);
          this.noLeidas.set(resultado.no_leidas);
          this.error.set(null);
          this.cargando.set(false);
        },
        error: (error: HttpErrorResponse) => {
          this.error.set(this.mensajeError(error, 'No se pudieron cargar las notificaciones.'));
          this.cargando.set(false);
        },
      });
  }

  marcarLeida(notificacion: Notificacion): void {
    const id = notificacion.id_notificacion;
    if (notificacion.leida || this.pendientes.has(id)) return;

    this.pendientes.add(id);
    this.aplicarLeida(id, true);
    this.http.patch<NotificacionRespuesta>(`${this.apiUrl}/${id}/leida`, {}).subscribe({
      next: ({ resultado }) => {
        this.notificaciones.update((lista) =>
          lista.map((n) => (n.id_notificacion === id ? resultado : n)),
        );
        this.pendientes.delete(id);
      },
      error: (error: HttpErrorResponse) => {
        this.aplicarLeida(id, false);
        this.pendientes.delete(id);
        this.error.set(this.mensajeError(error, 'No se pudo marcar la notificación como leída.'));
      },
    });
  }

  marcarTodas(): void {
    if (!this.hayNoLeidas()) return;

    const anteriores = this.notificaciones();
    const noLeidasAnteriores = this.noLeidas();
    this.notificaciones.update((lista) => lista.map((n) => ({ ...n, leida: true })));
    this.noLeidas.set(0);

    this.http.patch<MarcarLeidasRespuesta>(`${this.apiUrl}/leidas`, {}).subscribe({
      next: () => this.cargar(true),
      error: (error: HttpErrorResponse) => {
        this.notificaciones.set(anteriores);
        this.noLeidas.set(noLeidasAnteriores);
        this.error.set(this.mensajeError(error, 'No se pudieron marcar las notificaciones.'));
      },
    });
  }

  private aplicarLeida(id: number, leida: boolean): void {
    this.notificaciones.update((lista) =>
      lista.map((n) => (n.id_notificacion === id ? { ...n, leida } : n)),
    );
    this.noLeidas.update((total) => Math.max(0, total + (leida ? -1 : 1)));
  }

  private readonly alCambiarVisibilidad = (): void => {
    if (document.visibilityState === 'visible') this.cargar(true);
  };

  private mensajeError(error: HttpErrorResponse, porDefecto: string): string {
    if (error.status === 0) return 'No se pudo conectar con el servidor.';
    const mensaje = error.error?.mensaje;
    return typeof mensaje === 'string' ? mensaje : porDefecto;
  }
}
