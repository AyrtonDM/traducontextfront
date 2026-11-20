import { Component, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { ContextoItem, Idioma } from '../../../core/models/traduccion.model';
import { FiltroReporte, FormatoExportacion, ReporteActividad, TipoServicio } from '../../../core/models/reporte.model';
import { ReportesService } from '../../../core/services/reportes.service';
import { TraduccionService } from '../../../core/services/traduccion.service';

const ETIQUETAS_TIPO: Record<TipoServicio, string> = {
  texto: 'Texto',
  documento: 'Documento',
  conversacion: 'Conversación',
  sesion_externa: 'Sesión externa',
};

const ICONOS_TIPO: Record<TipoServicio, string> = {
  texto: 'fa-language',
  documento: 'fa-file-text-o',
  conversacion: 'fa-comments-o',
  sesion_externa: 'fa-video-camera',
};

/**
 * Reportes administrativos (HU-47): actividad de la plataforma con filtros combinables.
 * Exportacion a PDF y Excel (HU-48) del reporte generado, con sus mismos filtros.
 */
@Component({
  selector: 'app-reportes',
  standalone: true,
  imports: [FormsModule, RouterLink, DatePipe, DecimalPipe],
  templateUrl: './reportes.html',
  styleUrl: './reportes.css',
})
export class Reportes {
  private readonly reportesService = inject(ReportesService);
  private readonly traduccionService = inject(TraduccionService);

  readonly tamanoPagina = 20;
  readonly hoy = this.formatearFecha(new Date());
  readonly tiposServicio: TipoServicio[] = ['texto', 'documento', 'conversacion', 'sesion_externa'];

  // Catalogos para los filtros
  readonly idiomas = signal<Idioma[]>([]);
  readonly contextos = signal<ContextoItem[]>([]);

  // Formulario de filtros
  fechaDesde = '';
  fechaHasta = '';
  tipoServicio: TipoServicio | null = null;
  idIdiomaOrigen: number | null = null;
  idIdiomaDestino: number | null = null;
  idContexto: number | null = null;

  // Reporte generado (los filtros aplicados quedan fijos al paginar)
  readonly reporte = signal<ReporteActividad | null>(null);
  private filtroAplicado: FiltroReporte | null = null;

  readonly generando = signal(false);
  readonly exportando = signal<FormatoExportacion | null>(null);
  readonly mensajeExito = signal('');
  readonly ayudaVisible = signal(false);
  readonly mensajeError = signal('');
  readonly mensajeInfo = signal('');

  private readonly zonaHoraria = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

  constructor() {
    this.restablecerFechas();
    this.traduccionService.obtenerIdiomas().subscribe({
      next: (respuesta) => this.idiomas.set(respuesta.resultado ?? []),
      error: () => this.mensajeError.set('No se pudieron cargar los idiomas.'),
    });
    this.traduccionService.obtenerContextos().subscribe({
      next: (respuesta) => this.contextos.set(respuesta.resultado ?? []),
      error: () => this.mensajeError.set('No se pudieron cargar los contextos.'),
    });
  }

  etiquetaTipo(tipo: TipoServicio): string {
    return ETIQUETAS_TIPO[tipo];
  }

  iconoTipo(tipo: TipoServicio): string {
    return ICONOS_TIPO[tipo];
  }

  totalPorTipo(tipo: TipoServicio): number {
    return this.reporte()?.totales[tipo] ?? 0;
  }

  // ---------- Filtros ----------

  generar(): void {
    if (!this.fechaDesde || !this.fechaHasta) {
      this.mostrarError('Selecciona la fecha inicial y la fecha final.');
      return;
    }
    if (this.fechaDesde > this.fechaHasta) {
      this.mostrarError('La fecha inicial no puede ser posterior a la fecha final.');
      return;
    }
    this.filtroAplicado = {
      fecha_desde: this.fechaDesde,
      fecha_hasta: this.fechaHasta,
      zona_horaria: this.zonaHoraria,
      tipo_servicio: this.tipoServicio,
      id_idioma_origen: this.idIdiomaOrigen,
      id_idioma_destino: this.idIdiomaDestino,
      id_contexto: this.idContexto,
      tamano_pagina: this.tamanoPagina,
    };
    this.consultar(1);
  }

  limpiarFiltros(): void {
    this.restablecerFechas();
    this.tipoServicio = null;
    this.idIdiomaOrigen = null;
    this.idIdiomaDestino = null;
    this.idContexto = null;
  }

  irAPagina(pagina: number): void {
    const reporte = this.reporte();
    if (!reporte || pagina < 1 || pagina > reporte.total_paginas || pagina === reporte.pagina) {
      return;
    }
    this.consultar(pagina);
  }

  get paginasVisibles(): number[] {
    const reporte = this.reporte();
    if (!reporte) {
      return [];
    }
    const inicio = Math.max(1, Math.min(reporte.pagina - 2, reporte.total_paginas - 4));
    const fin = Math.min(reporte.total_paginas, inicio + 4);
    return Array.from({ length: Math.max(0, fin - inicio + 1) }, (_, i) => inicio + i);
  }

  // ---------- Exportacion (HU-48) ----------

  /** Solo se exporta un reporte ya generado y con actividades */
  get puedeExportar(): boolean {
    return !!this.reporte()?.totales.total && !this.generando() && this.exportando() === null;
  }

  exportar(formato: FormatoExportacion): void {
    if (!this.filtroAplicado || !this.puedeExportar) {
      return;
    }
    this.exportando.set(formato);
    this.mensajeError.set('');
    this.mensajeExito.set('');
    this.reportesService
      .exportarActividad(this.filtroAplicado, formato)
      .pipe(finalize(() => this.exportando.set(null)))
      .subscribe({
        next: (respuesta) => {
          const nombre = this.nombreDesdeCabecera(respuesta.headers.get('Content-Disposition'))
            ?? `reporte_actividad_${this.hoy}.${formato}`;
          this.descargar(respuesta.body!, nombre);
          this.mensajeExito.set(`Reporte exportado: ${nombre}`);
        },
        error: async (error) => this.mostrarError(await this.mensajeErrorExportacion(error)),
      });
  }

  private descargar(contenido: Blob, nombre: string): void {
    const url = window.URL.createObjectURL(contenido);
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = nombre;
    document.body.appendChild(enlace);
    enlace.click();
    document.body.removeChild(enlace);
    window.URL.revokeObjectURL(url);
  }

  private nombreDesdeCabecera(cabecera: string | null): string | null {
    return cabecera?.match(/filename="?([^";]+)"?/)?.[1] ?? null;
  }

  /** Con responseType 'blob' el error del back tambien llega como Blob: se lee su JSON */
  private async mensajeErrorExportacion(error: any): Promise<string> {
    const porDefecto = 'Ocurrió un error al exportar el reporte. Inténtalo de nuevo.';
    if (error?.error instanceof Blob) {
      try {
        const cuerpo = JSON.parse(await error.error.text());
        return cuerpo?.mensaje || cuerpo?.detail || porDefecto;
      } catch {
        return porDefecto;
      }
    }
    return error?.error?.mensaje || porDefecto;
  }

  // ---------- Consulta ----------

  private consultar(pagina: number): void {
    if (!this.filtroAplicado) {
      return;
    }
    this.generando.set(true);
    this.mensajeError.set('');
    this.mensajeInfo.set('');
    this.mensajeExito.set('');
    this.reportesService
      .generarActividad({ ...this.filtroAplicado, pagina })
      .pipe(finalize(() => this.generando.set(false)))
      .subscribe({
        next: (respuesta) => {
          this.reporte.set(respuesta.resultado);
          if (!respuesta.resultado.totales.total) {
            this.mensajeInfo.set(respuesta.mensaje);
          }
        },
        error: (error) =>
          this.mostrarError(error?.error?.mensaje || error?.error?.detail || 'No se pudo generar el reporte.'),
      });
  }

  private mostrarError(mensaje: string): void {
    this.mensajeInfo.set('');
    this.mensajeExito.set('');
    this.mensajeError.set(mensaje);
  }

  private restablecerFechas(): void {
    const desde = new Date();
    desde.setDate(desde.getDate() - 29);
    this.fechaDesde = this.formatearFecha(desde);
    this.fechaHasta = this.hoy;
  }

  private formatearFecha(fecha: Date): string {
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');
    return `${fecha.getFullYear()}-${mes}-${dia}`;
  }
}
