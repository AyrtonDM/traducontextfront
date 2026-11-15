import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HistorialService } from '../../../core/services/historial.service';
import { FiltrosHistorial, TraduccionHistorial } from '../../../core/models/historial.model';

@Component({
  selector: 'app-historial',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './historial.html',
  styleUrl: './historial.css',
})
export class Historial implements OnInit {

  private readonly historialService = inject(HistorialService);

  // ── Estado de carga ──────────────────────────────────────────────────────
  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);

  // ── Datos originales del backend ─────────────────────────────────────────
  readonly traducciones = signal<TraduccionHistorial[]>([]);

  // ── Item seleccionado para el panel de detalle ───────────────────────────
  readonly seleccionado = signal<TraduccionHistorial | null>(null);

  // ── Filtros ───────────────────────────────────────────────────────────────
  readonly filtros = signal<FiltrosHistorial>({
    busqueda: '',
    idiomaOrigen: '',
    idiomaDestino: '',
    contexto: '',
    periodo: 'todos',
  });

  // ── Computed: opciones únicas para los selects de filtro ─────────────────
  readonly idiomasOrigen = computed(() =>
    [...new Set(this.traducciones().map(t => t.idioma_origen))].sort()
  );

  readonly idiomasDestino = computed(() =>
    [...new Set(this.traducciones().map(t => t.idioma_destino))].sort()
  );

  readonly contextos = computed(() =>
    [...new Set(
      this.traducciones()
        .map(t => t.nombre_contexto)
        .filter((c): c is string => c !== null)
    )].sort()
  );

  // ── Computed: lista filtrada ──────────────────────────────────────────────
  readonly traduccionesFiltradas = computed(() => {
    const f = this.filtros();
    const ahora = new Date();
    return this.traducciones().filter(t => {
      // Búsqueda de texto libre
      if (f.busqueda.trim()) {
        const q = f.busqueda.toLowerCase();
        const coincide =
          t.texto_original.toLowerCase().includes(q) ||
          t.texto_traducido.toLowerCase().includes(q);
        if (!coincide) return false;
      }
      // Idioma origen
      if (f.idiomaOrigen && t.idioma_origen !== f.idiomaOrigen) return false;
      // Idioma destino
      if (f.idiomaDestino && t.idioma_destino !== f.idiomaDestino) return false;
      // Contexto
      if (f.contexto && t.nombre_contexto !== f.contexto) return false;
      // Período
      if (f.periodo !== 'todos') {
        const fecha = new Date(t.fecha_creacion);
        const diff = ahora.getTime() - fecha.getTime();
        const msHoy = ahora.setHours(0, 0, 0, 0) - new Date(fecha).setHours(0, 0, 0, 0);
        if (f.periodo === 'hoy' && msHoy !== 0) return false;
        if (f.periodo === 'semana' && diff > 7 * 86_400_000) return false;
        if (f.periodo === 'mes' && diff > 30 * 86_400_000) return false;
      }
      return true;
    });
  });

  readonly totalFiltradas = computed(() => this.traduccionesFiltradas().length);
  readonly hayFiltrosActivos = computed(() => {
    const f = this.filtros();
    return f.busqueda.trim() !== '' ||
      f.idiomaOrigen !== '' ||
      f.idiomaDestino !== '' ||
      f.contexto !== '' ||
      f.periodo !== 'todos';
  });

  // ─────────────────────────────────────────────────────────────────────────
  ngOnInit(): void {
    this.cargarHistorial();
  }

  cargarHistorial(): void {
    this.cargando.set(true);
    this.error.set(null);
    this.historialService.obtenerHistorial().subscribe({
      next: (respuesta) => {
        this.traducciones.set(respuesta.resultado ?? []);
        this.cargando.set(false);
      },
      error: (err) => {
        const msg = err?.error?.mensaje ?? 'No se pudo cargar el historial.';
        this.error.set(msg);
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
  }

  limpiarFiltros(): void {
    this.filtros.set({ busqueda: '', idiomaOrigen: '', idiomaDestino: '', contexto: '', periodo: 'todos' });
    this.seleccionado.set(null);
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

