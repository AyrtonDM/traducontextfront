import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Observable } from 'rxjs';
import { finalize, switchMap } from 'rxjs/operators';
import {
  GlosarioDetalle,
  GlosarioResumen,
  TerminoGlosario,
  TerminoGlosarioSolicitud,
} from '../../../core/models/glosario.model';
import { Idioma } from '../../../core/models/traduccion.model';
import { GlosarioService } from '../../../core/services/glosario.service';
import { TraduccionService } from '../../../core/services/traduccion.service';

type ReglaTermino = 'traducir' | 'conservar';
type CampoOrden = 'origen' | 'traduccion';

interface TerminoFormulario {
  id: number | null;
  origen: string;
  traduccion: string;
  regla: ReglaTermino;
  distinguirMayusculas: boolean;
  nota: string;
}

interface GlosarioFormulario {
  nombre: string;
  descripcion: string;
  idIdiomaOrigen: number | null;
  idIdiomaDestino: number | null;
}

const TERMINOS_POR_PAGINA = 5;

@Component({
  selector: 'app-glosarios',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './glosarios.html',
  styleUrl: './glosarios.css',
})
export class Glosarios {
  private readonly glosarioService = inject(GlosarioService);
  private readonly traduccionService = inject(TraduccionService);

  readonly glosarios = signal<GlosarioResumen[]>([]);
  readonly idiomas = signal<Idioma[]>([]);
  readonly idSeleccionado = signal<number | null>(null);
  readonly glosarioActual = signal<GlosarioDetalle | null>(null);

  readonly busqueda = signal('');
  readonly pagina = signal(1);
  readonly orden = signal<{ campo: CampoOrden; asc: boolean }>({ campo: 'origen', asc: true });
  readonly ayudaVisible = signal(false);
  readonly menuAbiertoId = signal<number | null>(null);

  readonly cargandoLista = signal(true);
  readonly cargandoDetalle = signal(false);
  readonly guardando = signal(false);
  readonly mensajeError = signal('');
  readonly mensajeExito = signal('');

  // Modal de glosario (crear / editar)
  readonly modalGlosario = signal<'crear' | 'editar' | null>(null);
  glosarioForm: GlosarioFormulario = this.glosarioVacio();

  // Modal de término (crear / editar)
  readonly modalTermino = signal<'crear' | 'editar' | null>(null);
  terminoForm: TerminoFormulario = this.terminoVacio();

  readonly errorModal = signal('');

  readonly glosariosFiltrados = computed(() => {
    const texto = this.busqueda().trim().toLowerCase();
    return texto
      ? this.glosarios().filter(
          (g) => g.nombre.toLowerCase().includes(texto) || g.par_idiomas.toLowerCase().includes(texto),
        )
      : this.glosarios();
  });

  readonly terminosOrdenados = computed(() => {
    const { campo, asc } = this.orden();
    const terminos = [...(this.glosarioActual()?.terminos ?? [])];
    const valor = (t: TerminoGlosario) =>
      campo === 'origen' ? t.termino_origen : this.textoTraduccion(t);
    return terminos.sort((a, b) => valor(a).localeCompare(valor(b), 'es') * (asc ? 1 : -1));
  });

  readonly totalPaginas = computed(() =>
    Math.max(1, Math.ceil(this.terminosOrdenados().length / TERMINOS_POR_PAGINA)),
  );

  readonly paginas = computed(() => Array.from({ length: this.totalPaginas() }, (_, i) => i + 1));

  readonly terminosPagina = computed(() => {
    const inicio = (this.pagina() - 1) * TERMINOS_POR_PAGINA;
    return this.terminosOrdenados().slice(inicio, inicio + TERMINOS_POR_PAGINA);
  });

  constructor() {
    this.cargarIdiomas();
    this.cargarGlosarios();
  }

  // ---------- Carga de datos ----------

  private cargarIdiomas(): void {
    this.traduccionService.obtenerIdiomas().subscribe({
      next: (respuesta) => this.idiomas.set(respuesta.resultado ?? []),
      error: (error) => this.mensajeError.set(this.extraerError(error, 'No se pudieron cargar los idiomas.')),
    });
  }

  private cargarGlosarios(): void {
    this.cargandoLista.set(true);
    this.glosarioService
      .listar()
      .pipe(finalize(() => this.cargandoLista.set(false)))
      .subscribe({
        next: (respuesta) => {
          const lista = respuesta.resultado ?? [];
          this.glosarios.set(lista);
          if (lista.length > 0) {
            this.seleccionar(lista[0].id_glosario);
          }
        },
        error: (error) =>
          this.mensajeError.set(this.extraerError(error, 'No se pudieron cargar los glosarios.')),
      });
  }

  private cargarDetalle(id: number): void {
    this.cargandoDetalle.set(true);
    this.glosarioService
      .obtener(id)
      .pipe(finalize(() => this.cargandoDetalle.set(false)))
      .subscribe({
        next: (respuesta) => {
          if (this.idSeleccionado() === id) {
            this.aplicarDetalle(respuesta.resultado);
          }
        },
        error: (error) =>
          this.mensajeError.set(this.extraerError(error, 'No se pudo cargar el glosario.')),
      });
  }

  /** Actualiza el detalle y su resumen en la lista sin volver a pedir todo */
  private aplicarDetalle(detalle: GlosarioDetalle): void {
    this.glosarioActual.set(detalle);
    const { terminos, ...resumen } = detalle;
    this.glosarios.update((lista) => {
      const existe = lista.some((g) => g.id_glosario === detalle.id_glosario);
      return existe
        ? lista.map((g) => (g.id_glosario === detalle.id_glosario ? resumen : g))
        : [resumen, ...lista];
    });
    this.irAPagina(this.pagina());
  }

  // ---------- Glosarios ----------

  seleccionar(id: number): void {
    this.menuAbiertoId.set(null);
    if (this.idSeleccionado() === id && this.glosarioActual()?.id_glosario === id) {
      return;
    }
    this.idSeleccionado.set(id);
    this.glosarioActual.set(null);
    this.pagina.set(1);
    this.cargarDetalle(id);
  }

  toggleMenu(id: number, evento: Event): void {
    evento.stopPropagation();
    this.menuAbiertoId.update((actual) => (actual === id ? null : id));
  }

  abrirCrearGlosario(): void {
    this.glosarioForm = this.glosarioVacio();
    this.limpiarMensajes();
    this.modalGlosario.set('crear');
  }

  abrirEditarGlosario(id: number): void {
    const glosario = this.glosarios().find((g) => g.id_glosario === id);
    if (!glosario) return;
    this.seleccionar(id);
    this.glosarioForm = {
      nombre: glosario.nombre,
      descripcion: glosario.descripcion ?? '',
      idIdiomaOrigen: glosario.id_idioma_origen,
      idIdiomaDestino: glosario.id_idioma_destino,
    };
    this.limpiarMensajes();
    this.modalGlosario.set('editar');
  }

  guardarGlosario(): void {
    if (this.guardando()) return;

    const nombre = this.glosarioForm.nombre.trim();
    const { idIdiomaOrigen, idIdiomaDestino } = this.glosarioForm;
    if (!nombre) {
      this.errorModal.set('El nombre del glosario es obligatorio.');
      return;
    }
    if (!idIdiomaOrigen || !idIdiomaDestino) {
      this.errorModal.set('Selecciona el idioma de origen y el de destino.');
      return;
    }
    if (idIdiomaOrigen === idIdiomaDestino) {
      this.errorModal.set('El idioma de origen y el de destino deben ser distintos.');
      return;
    }

    const datos = {
      nombre,
      descripcion: this.glosarioForm.descripcion.trim() || null,
      id_idioma_origen: idIdiomaOrigen,
      id_idioma_destino: idIdiomaDestino,
    };
    const id = this.idSeleccionado();
    const peticion = this.modalGlosario() === 'crear' || id === null
      ? this.glosarioService.crear(datos)
      : this.glosarioService.actualizar(id, datos);

    this.ejecutarEnModal(peticion, (respuesta) => {
      this.idSeleccionado.set(respuesta.resultado.id_glosario);
      this.pagina.set(1);
      this.aplicarDetalle(respuesta.resultado);
      this.mensajeExito.set(respuesta.mensaje);
    });
  }

  duplicarGlosario(id: number): void {
    this.menuAbiertoId.set(null);
    this.limpiarMensajes();
    this.guardando.set(true);

    this.glosarioService
      .obtener(id)
      .pipe(
        switchMap(({ resultado: original }) =>
          this.glosarioService.crear({
            nombre: this.nombreCopiaDisponible(original.nombre),
            descripcion: original.descripcion,
            id_idioma_origen: original.id_idioma_origen,
            id_idioma_destino: original.id_idioma_destino,
            terminos: original.terminos.map((t) => ({
              termino_origen: t.termino_origen,
              traduccion_preferida: t.traduccion_preferida,
              conservar_original: t.conservar_original,
              distinguir_mayusculas: t.distinguir_mayusculas,
              nota: t.nota,
            })),
          }),
        ),
        finalize(() => this.guardando.set(false)),
      )
      .subscribe({
        next: (respuesta) => {
          this.idSeleccionado.set(respuesta.resultado.id_glosario);
          this.pagina.set(1);
          this.aplicarDetalle(respuesta.resultado);
          this.mensajeExito.set('Glosario duplicado correctamente.');
        },
        error: (error) =>
          this.mensajeError.set(this.extraerError(error, 'No se pudo duplicar el glosario.')),
      });
  }

  eliminarGlosario(id: number): void {
    const glosario = this.glosarios().find((g) => g.id_glosario === id);
    this.menuAbiertoId.set(null);
    if (!glosario || !confirm(`¿Eliminar el glosario "${glosario.nombre}" y todos sus términos?`)) return;

    this.limpiarMensajes();
    this.guardando.set(true);
    this.glosarioService
      .eliminar(id)
      .pipe(finalize(() => this.guardando.set(false)))
      .subscribe({
        next: (respuesta) => {
          this.mensajeExito.set(respuesta.mensaje);
          const restantes = this.glosarios().filter((g) => g.id_glosario !== id);
          this.glosarios.set(restantes);
          if (this.idSeleccionado() === id) {
            this.idSeleccionado.set(null);
            this.glosarioActual.set(null);
            if (restantes.length > 0) {
              this.seleccionar(restantes[0].id_glosario);
            }
          }
        },
        error: (error) =>
          this.mensajeError.set(this.extraerError(error, 'No se pudo eliminar el glosario.')),
      });
  }

  // ---------- Términos ----------

  textoTraduccion(termino: TerminoGlosario): string {
    return termino.conservar_original ? termino.termino_origen : (termino.traduccion_preferida ?? '');
  }

  ordenarPor(campo: CampoOrden): void {
    this.orden.update((o) => ({ campo, asc: o.campo === campo ? !o.asc : true }));
    this.pagina.set(1);
  }

  iconoOrden(campo: CampoOrden): string {
    const o = this.orden();
    if (o.campo !== campo) return 'fa-sort';
    return o.asc ? 'fa-sort-asc' : 'fa-sort-desc';
  }

  irAPagina(pagina: number): void {
    this.pagina.set(Math.min(Math.max(1, pagina), this.totalPaginas()));
  }

  abrirCrearTermino(): void {
    this.terminoForm = this.terminoVacio();
    this.limpiarMensajes();
    this.modalTermino.set('crear');
  }

  abrirEditarTermino(termino: TerminoGlosario): void {
    this.terminoForm = {
      id: termino.id_termino_glosario,
      origen: termino.termino_origen,
      traduccion: termino.traduccion_preferida ?? '',
      regla: termino.conservar_original ? 'conservar' : 'traducir',
      distinguirMayusculas: termino.distinguir_mayusculas,
      nota: termino.nota ?? '',
    };
    this.limpiarMensajes();
    this.modalTermino.set('editar');
  }

  guardarTermino(): void {
    const actual = this.glosarioActual();
    if (!actual || this.guardando()) return;

    const origen = this.terminoForm.origen.trim();
    const conservar = this.terminoForm.regla === 'conservar';
    const traduccion = this.terminoForm.traduccion.trim();

    if (!origen) {
      this.errorModal.set('El término de origen es obligatorio.');
      return;
    }
    if (!conservar && !traduccion) {
      this.errorModal.set('Indica la traducción preferida o marca el término para conservarlo.');
      return;
    }
    const repetido = actual.terminos.some(
      (t) =>
        t.termino_origen.toLowerCase() === origen.toLowerCase() &&
        t.id_termino_glosario !== this.terminoForm.id,
    );
    if (repetido) {
      this.errorModal.set('Ese término ya existe en el glosario.');
      return;
    }

    const datos: TerminoGlosarioSolicitud = {
      termino_origen: origen,
      traduccion_preferida: conservar ? null : traduccion,
      conservar_original: conservar,
      distinguir_mayusculas: this.terminoForm.distinguirMayusculas,
      nota: this.terminoForm.nota.trim() || null,
    };
    const idTermino = this.terminoForm.id;
    const peticion = idTermino === null
      ? this.glosarioService.agregarTermino(actual.id_glosario, datos)
      : this.glosarioService.actualizarTermino(actual.id_glosario, idTermino, datos);

    this.ejecutarEnModal(peticion, (respuesta) => {
      this.mensajeExito.set(respuesta.mensaje);
      this.recargarActual();
    });
  }

  eliminarTermino(termino: TerminoGlosario): void {
    const actual = this.glosarioActual();
    if (!actual || !confirm(`¿Eliminar el término "${termino.termino_origen}"?`)) return;

    this.limpiarMensajes();
    this.guardando.set(true);
    this.glosarioService
      .eliminarTermino(actual.id_glosario, termino.id_termino_glosario)
      .pipe(finalize(() => this.guardando.set(false)))
      .subscribe({
        next: (respuesta) => {
          this.mensajeExito.set(respuesta.mensaje);
          this.recargarActual();
        },
        error: (error) =>
          this.mensajeError.set(this.extraerError(error, 'No se pudo eliminar el término.')),
      });
  }

  cerrarModales(): void {
    if (this.guardando()) return;
    this.modalGlosario.set(null);
    this.modalTermino.set(null);
    this.errorModal.set('');
  }

  // ---------- Utilidades ----------

  private recargarActual(): void {
    const id = this.idSeleccionado();
    if (id === null) return;
    this.glosarioService.obtener(id).subscribe({
      next: (respuesta) => this.aplicarDetalle(respuesta.resultado),
      error: (error) =>
        this.mensajeError.set(this.extraerError(error, 'No se pudo actualizar el glosario.')),
    });
  }

  /** Ejecuta una petición desde un modal: muestra errores dentro del modal y lo cierra al terminar */
  private ejecutarEnModal<T>(peticion: Observable<T>, alTerminar: (respuesta: T) => void): void {
    this.errorModal.set('');
    this.guardando.set(true);
    peticion.pipe(finalize(() => this.guardando.set(false))).subscribe({
      next: (respuesta) => {
        this.modalGlosario.set(null);
        this.modalTermino.set(null);
        alTerminar(respuesta);
      },
      error: (error) => this.errorModal.set(this.extraerError(error, 'No se pudieron guardar los cambios.')),
    });
  }

  private nombreCopiaDisponible(nombre: string): string {
    const usados = new Set(this.glosarios().map((g) => g.nombre.toLowerCase()));
    let candidato = `${nombre} (copia)`.slice(0, 100);
    for (let i = 2; usados.has(candidato.toLowerCase()); i++) {
      candidato = `${nombre} (copia ${i})`.slice(0, 100);
    }
    return candidato;
  }

  private limpiarMensajes(): void {
    this.errorModal.set('');
    this.mensajeError.set('');
    this.mensajeExito.set('');
  }

  private glosarioVacio(): GlosarioFormulario {
    return { nombre: '', descripcion: '', idIdiomaOrigen: null, idIdiomaDestino: null };
  }

  private terminoVacio(): TerminoFormulario {
    return { id: null, origen: '', traduccion: '', regla: 'traducir', distinguirMayusculas: false, nota: '' };
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
