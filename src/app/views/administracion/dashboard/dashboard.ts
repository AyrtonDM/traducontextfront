import { Component, DestroyRef, ElementRef, effect, inject, signal, viewChild } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { Chart, registerables } from 'chart.js';
import { DashboardResultado, FiltroDashboard } from '../../../core/models/dashboard.model';
import { DashboardService } from '../../../core/services/dashboard.service';

Chart.register(...registerables);

type PeriodoRapido = 7 | 30 | 90 | 'personalizado';

/** Dashboard administrativo (HU-46): indicadores de uso calculados con los datos de la plataforma. */
@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [FormsModule, RouterLink, DatePipe, DecimalPipe],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard {
  private readonly dashboardService = inject(DashboardService);
  private readonly host = inject(ElementRef<HTMLElement>);

  readonly opcionesPeriodo: { valor: PeriodoRapido; etiqueta: string }[] = [
    { valor: 7, etiqueta: 'Últimos 7 días' },
    { valor: 30, etiqueta: 'Últimos 30 días' },
    { valor: 90, etiqueta: 'Últimos 90 días' },
    { valor: 'personalizado', etiqueta: 'Personalizado' },
  ];
  readonly periodoSeleccionado = signal<PeriodoRapido>(30);
  fechaDesde = '';
  fechaHasta = '';
  readonly hoy = this.formatearFecha(new Date());

  readonly datos = signal<DashboardResultado | null>(null);
  readonly cargando = signal(false);
  readonly mensajeError = signal('');
  readonly ayudaVisible = signal(false);

  private readonly zonaHoraria = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  private readonly lienzo = viewChild<ElementRef<HTMLCanvasElement>>('graficoEvolucion');
  private grafico: Chart | null = null;

  constructor() {
    this.aplicarPeriodoRapido(30);

    // El canvas solo existe cuando hay datos; se (re)dibuja cuando cambian los datos o aparece el canvas
    effect(() => {
      const datos = this.datos();
      const lienzo = this.lienzo();
      if (datos && lienzo) {
        this.dibujarGrafico(datos, lienzo.nativeElement);
      }
    });

    inject(DestroyRef).onDestroy(() => this.grafico?.destroy());
  }

  // ---------- Periodo ----------

  seleccionarPeriodo(valor: PeriodoRapido): void {
    if (valor === 'personalizado') {
      this.periodoSeleccionado.set(valor);
      this.mensajeError.set('');
      return;
    }
    this.aplicarPeriodoRapido(valor);
  }

  private aplicarPeriodoRapido(dias: 7 | 30 | 90): void {
    const hasta = new Date();
    const desde = new Date();
    desde.setDate(hasta.getDate() - (dias - 1));
    this.periodoSeleccionado.set(dias);
    this.fechaDesde = this.formatearFecha(desde);
    this.fechaHasta = this.formatearFecha(hasta);
    this.cargar();
  }

  aplicarPersonalizado(): void {
    if (!this.fechaDesde || !this.fechaHasta) {
      this.mensajeError.set('Selecciona la fecha inicial y la fecha final.');
      return;
    }
    if (this.fechaDesde > this.fechaHasta) {
      this.mensajeError.set('La fecha inicial no puede ser posterior a la fecha final.');
      return;
    }
    this.cargar();
  }

  // ---------- Datos ----------

  cargar(): void {
    const filtro: FiltroDashboard = {
      fecha_desde: this.fechaDesde,
      fecha_hasta: this.fechaHasta,
      zona_horaria: this.zonaHoraria,
    };
    this.cargando.set(true);
    this.mensajeError.set('');
    this.dashboardService
      .obtener(filtro)
      .pipe(finalize(() => this.cargando.set(false)))
      .subscribe({
        next: (respuesta) => this.datos.set(respuesta.resultado),
        error: (error) =>
          this.mensajeError.set(error?.error?.mensaje || error?.error?.detail || 'No se pudieron cargar los indicadores.'),
      });
  }

  get totalTraducciones(): number {
    const evolucion = this.datos()?.evolucion ?? [];
    return evolucion.reduce((suma, p) => suma + p.traducciones_texto + p.documentos + p.conversaciones, 0);
  }

  /** Porcentaje relativo al primero del ranking, para el ancho de las barras */
  porcentaje(total: number, lista: { total: number }[]): number {
    const maximo = lista[0]?.total ?? 0;
    return maximo ? Math.max(4, Math.round((total / maximo) * 100)) : 0;
  }

  // ---------- Grafico ----------

  private dibujarGrafico(datos: DashboardResultado, canvas: HTMLCanvasElement): void {
    const estilos = getComputedStyle(this.host.nativeElement);
    const color = (variable: string, respaldo: string) => estilos.getPropertyValue(variable).trim() || respaldo;
    const mensual = datos.periodo.agrupacion === 'mes';
    const etiquetas = datos.evolucion.map((p) => this.etiquetaFecha(p.fecha, mensual));

    const series = [
      { label: 'Texto', clave: 'traducciones_texto' as const, color: color('--color-primario', '#42149A') },
      { label: 'Documentos', clave: 'documentos' as const, color: color('--color-secundario', '#3583BE') },
      { label: 'Conversaciones', clave: 'conversaciones' as const, color: color('--color-acento', '#09A7C4') },
    ];

    this.grafico?.destroy();
    this.grafico = new Chart(canvas, {
      type: 'line',
      data: {
        labels: etiquetas,
        datasets: series.map((serie) => ({
          label: serie.label,
          data: datos.evolucion.map((p) => p[serie.clave]),
          borderColor: serie.color,
          backgroundColor: serie.color,
          borderWidth: 2,
          pointRadius: datos.evolucion.length > 45 ? 0 : 3,
          pointHoverRadius: 5,
          tension: 0.3,
        })),
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { position: 'bottom', labels: { usePointStyle: true, boxWidth: 8 } },
        },
        scales: {
          y: { beginAtZero: true, ticks: { precision: 0 } },
          x: { grid: { display: false }, ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 12 } },
        },
      },
    });
  }

  private etiquetaFecha(fechaIso: string, mensual: boolean): string {
    const [anio, mes, dia] = fechaIso.split('-').map(Number);
    const fecha = new Date(anio, mes - 1, dia);
    return mensual
      ? fecha.toLocaleDateString('es', { month: 'short', year: 'numeric' })
      : fecha.toLocaleDateString('es', { day: '2-digit', month: 'short' });
  }

  private formatearFecha(fecha: Date): string {
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');
    return `${fecha.getFullYear()}-${mes}-${dia}`;
  }
}
