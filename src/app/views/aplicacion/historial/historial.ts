import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HistorialService } from '../../../core/services/historial.service';
import { TraduccionService } from '../../../core/services/traduccion.service';
import { FiltrosHistorial, TraduccionHistorial } from '../../../core/models/historial.model';
import { Idioma } from '../../../core/models/traduccion.model';

const FILTROS_INICIALES: FiltrosHistorial = {
  busqueda: '',
  idiomaOrigen: '',
  idiomaDestino: '',
  fechaDesde: '',
  fechaHasta: '',
  soloFavoritos: false,
};

@Component({
  selector: 'app-historial',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './historial.html',
  styleUrl: './historial.css',
})
export class Historial implements OnInit, OnDestroy {

  private readonly historialService = inject(HistorialService);
  private readonly traduccionService = inject(TraduccionService);
  private temporizadorBusqueda: ReturnType<typeof setTimeout> | null = null;

  // ── Estado de carga ──────────────────────────────────────────────────────
  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);
  readonly mensajeExito = signal<string | null>(null);

  // ── Datos del backend (ya filtrados) ─────────────────────────────────────
  readonly traducciones = signal<TraduccionHistorial[]>([]);
  readonly idiomas = signal<Idioma[]>([]);

  // ── Item seleccionado para el panel de detalle ───────────────────────────
  readonly seleccionado = signal<TraduccionHistorial | null>(null);

  // ── Acciones en curso ────────────────────────────────────────────────────
  readonly actualizandoFavorito = signal<number | null>(null);
  readonly confirmarEliminar = signal<TraduccionHistorial | null>(null);
  readonly eliminando = signal(false);

  // ── Filtros ───────────────────────────────────────────────────────────────
  readonly filtros = signal<FiltrosHistorial>({ ...FILTROS_INICIALES });

  readonly totalResultados = computed(() => this.traducciones().length);
  readonly rangoFechasInvalido = computed(() => {
    const f = this.filtros();
    return !!f.fechaDesde && !!f.fechaHasta && f.fechaDesde > f.fechaHasta;
  });
  readonly hayFiltrosActivos = computed(() => {
    const f = this.filtros();
    return f.busqueda.trim() !== '' ||
      f.idiomaOrigen !== '' ||
      f.idiomaDestino !== '' ||
      f.fechaDesde !== '' ||
      f.fechaHasta !== '' ||
      f.soloFavoritos;
  });

  // ─────────────────────────────────────────────────────────────────────────
  ngOnInit(): void {
    this.cargarIdiomas();
    this.cargarHistorial();
  }

  ngOnDestroy(): void {
    if (this.temporizadorBusqueda) clearTimeout(this.temporizadorBusqueda);
  }

  cargarIdiomas(): void {
    this.traduccionService.obtenerIdiomas().subscribe({
      next: (respuesta) => this.idiomas.set(respuesta.resultado ?? []),
      error: () => this.idiomas.set([]),
    });
  }

  cargarHistorial(): void {
    if (this.rangoFechasInvalido()) {
      this.error.set('La fecha "desde" no puede ser mayor que la fecha "hasta".');
      this.traducciones.set([]);
      this.cargando.set(false);
      return;
    }
    this.cargando.set(true);
    this.error.set(null);
    this.historialService.obtenerHistorial(this.filtros()).subscribe({
      next: (respuesta) => {
        this.traducciones.set(respuesta.resultado ?? []);
        this.cargando.set(false);
      },
      error: (err) => {
        const msg = err?.error?.detail ?? err?.error?.mensaje;
        this.error.set(typeof msg === 'string' ? msg : 'No se pudo cargar el historial.');
        this.cargando.set(false);
      },
    });
  }

  // ── Filtros ───────────────────────────────────────────────────────────────
  actualizarFiltro<K extends keyof FiltrosHistorial>(
    campo: K,
    valor: FiltrosHistorial[K]
  ): void {
    this.filtros.update(f => ({ ...f, [campo]: valor }));
    // Cierra el detalle al refiltrar para evitar confusiones
    this.seleccionado.set(null);

    if (this.temporizadorBusqueda) clearTimeout(this.temporizadorBusqueda);
    if (campo === 'busqueda') {
      // Espera a que el usuario termine de escribir antes de consultar
      this.temporizadorBusqueda = setTimeout(() => this.cargarHistorial(), 350);
    } else {
      this.cargarHistorial();
    }
  }

  limpiarFiltros(): void {
    if (this.temporizadorBusqueda) clearTimeout(this.temporizadorBusqueda);
    this.filtros.set({ ...FILTROS_INICIALES });
    this.seleccionado.set(null);
    this.cargarHistorial();
  }

  // ── Detalle ───────────────────────────────────────────────────────────────
  verDetalle(item: TraduccionHistorial): void {
    this.seleccionado.update(actual =>
      actual?.id_traduccion === item.id_traduccion ? null : item
    );
  }

  cerrarDetalle(): void {
    this.seleccionado.set(null);
  }

  // ── Favoritos ─────────────────────────────────────────────────────────────
  alternarFavorito(item: TraduccionHistorial, evento?: Event): void {
    evento?.stopPropagation();
    if (this.actualizandoFavorito() !== null) return;

    this.actualizandoFavorito.set(item.id_traduccion);
    this.historialService.marcarFavorito(item.id_traduccion, !item.favorito).subscribe({
      next: (respuesta) => {
        const favorito = respuesta.resultado.favorito;
        if (this.filtros().soloFavoritos && !favorito) {
          // Con el filtro de favoritos activo, el registro deja de cumplirlo
          this.quitarDeLista(item.id_traduccion);
        } else {
          this.traducciones.update(lista =>
            lista.map(t => t.id_traduccion === item.id_traduccion ? { ...t, favorito } : t)
          );
          this.seleccionado.update(s =>
            s?.id_traduccion === item.id_traduccion ? { ...s, favorito } : s
          );
        }
        this.actualizandoFavorito.set(null);
      },
      error: (err) => {
        this.error.set(err?.error?.detail ?? 'No se pudo actualizar el favorito.');
        this.actualizandoFavorito.set(null);
      },
    });
  }

  // ── Eliminación ───────────────────────────────────────────────────────────
  solicitarEliminar(item: TraduccionHistorial, evento?: Event): void {
    evento?.stopPropagation();
    this.confirmarEliminar.set(item);
  }

  cancelarEliminar(): void {
    if (this.eliminando()) return;
    this.confirmarEliminar.set(null);
  }

  eliminarConfirmado(): void {
    const item = this.confirmarEliminar();
    if (!item || this.eliminando()) return;

    this.eliminando.set(true);
    this.historialService.eliminarTraduccion(item.id_traduccion).subscribe({
      next: (respuesta) => {
        this.quitarDeLista(item.id_traduccion);
        this.mensajeExito.set(respuesta.mensaje ?? 'Traducción eliminada del historial.');
        this.eliminando.set(false);
        this.confirmarEliminar.set(null);
      },
      error: (err) => {
        this.error.set(err?.error?.detail ?? 'No se pudo eliminar la traducción.');
        this.eliminando.set(false);
        this.confirmarEliminar.set(null);
      },
    });
  }

  private quitarDeLista(idTraduccion: number): void {
    this.traducciones.update(lista => lista.filter(t => t.id_traduccion !== idTraduccion));
    this.seleccionado.update(s => (s?.id_traduccion === idTraduccion ? null : s));
  }

  // ── Acciones ──────────────────────────────────────────────────────────────
  async copiarTexto(texto: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(texto);
    } catch {
      // Fallo silencioso en entornos sin permisos de portapapeles
    }
  }

  // ── Utilidades de presentación ────────────────────────────────────────────
  formatearFecha(iso: string): string {
    return new Date(iso).toLocaleDateString('es', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  }

  etiquetaIdioma(codigo: string): string {
    const idioma = this.idiomas().find(i => i.codigo === codigo);
    if (idioma) return idioma.nombre;
    const nombres: Record<string, string> = {
      es: 'Español', en: 'Inglés', fr: 'Francés', pt: 'Portugués',
      de: 'Alemán', it: 'Italiano', zh: 'Chino', ja: 'Japonés',
      ar: 'Árabe', ru: 'Ruso',
    };
    return nombres[codigo] ?? codigo.toUpperCase();
  }

  truncar(texto: string, max = 80): string {
    return texto.length > max ? texto.slice(0, max) + '…' : texto;
  }
}
