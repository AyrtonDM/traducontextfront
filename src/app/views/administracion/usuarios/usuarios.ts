import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, finalize } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  EstadoUsuario,
  RolItem,
  UsuarioAdminDetalle,
  UsuarioAdminResumen,
} from '../../../core/models/usuarios.model';
import { UsuariosService } from '../../../core/services/usuarios.service';
import { AutenticacionService } from '../../../core/services/autenticacion.service';

const ETIQUETAS_ESTADO: Record<EstadoUsuario, string> = {
  ACTIVO: 'Activo',
  INACTIVO: 'Sin verificar',
  SUSPENDIDO: 'Suspendido',
};

type AccionPendiente = { tipo: 'suspender' | 'reactivar' | 'rol'; usuario: UsuarioAdminDetalle; idRol?: number };

/** Administracion de usuarios (HU-05): solo accesible con el permiso gestionar_usuarios. */
@Component({
  selector: 'app-usuarios',
  standalone: true,
  imports: [FormsModule, RouterLink, DatePipe],
  templateUrl: './usuarios.html',
  styleUrl: './usuarios.css',
})
export class Usuarios {
  private readonly usuariosService = inject(UsuariosService);
  private readonly autenticacionService = inject(AutenticacionService);

  readonly usuarios = signal<UsuarioAdminResumen[]>([]);
  readonly roles = signal<RolItem[]>([]);
  readonly total = signal(0);
  readonly totalPaginas = signal(0);
  readonly pagina = signal(1);
  readonly tamanoPagina = 10;

  // Filtros
  busqueda = '';
  idRolFiltro: number | null = null;
  estadoFiltro: EstadoUsuario | null = null;
  readonly opcionesEstado: { valor: EstadoUsuario | null; etiqueta: string }[] = [
    { valor: null, etiqueta: 'Todos los estados' },
    { valor: 'ACTIVO', etiqueta: ETIQUETAS_ESTADO.ACTIVO },
    { valor: 'SUSPENDIDO', etiqueta: ETIQUETAS_ESTADO.SUSPENDIDO },
    { valor: 'INACTIVO', etiqueta: ETIQUETAS_ESTADO.INACTIVO },
  ];

  // Detalle
  readonly detalle = signal<UsuarioAdminDetalle | null>(null);
  readonly cargandoDetalle = signal(false);
  idRolSeleccionado: number | null = null;

  // Confirmacion de acciones
  readonly accionPendiente = signal<AccionPendiente | null>(null);

  readonly cargandoLista = signal(true);
  readonly guardando = signal(false);
  readonly ayudaVisible = signal(false);
  readonly mensajeError = signal('');
  readonly mensajeExito = signal('');

  private readonly busqueda$ = new Subject<string>();
  private readonly correoActual = this.autenticacionService.obtenerUsuarioActual()?.correo?.toLowerCase() ?? '';

  constructor() {
    this.busqueda$
      .pipe(debounceTime(350), distinctUntilChanged(), takeUntilDestroyed())
      .subscribe(() => this.irAPagina(1));

    this.cargarRoles();
    this.cargarUsuarios();
  }

  // ---------- Utilidades de vista ----------

  etiquetaEstado(estado: EstadoUsuario): string {
    return ETIQUETAS_ESTADO[estado] ?? estado;
  }

  esCuentaPropia(usuario: { correo: string } | null): boolean {
    return !!usuario && usuario.correo.toLowerCase() === this.correoActual;
  }

  get paginasVisibles(): number[] {
    const totalPaginas = this.totalPaginas();
    const actual = this.pagina();
    const inicio = Math.max(1, Math.min(actual - 2, totalPaginas - 4));
    const fin = Math.min(totalPaginas, inicio + 4);
    return Array.from({ length: Math.max(0, fin - inicio + 1) }, (_, i) => inicio + i);
  }

  get hayFiltros(): boolean {
    return !!this.busqueda.trim() || this.idRolFiltro !== null || this.estadoFiltro !== null;
  }

  get rolSinCambios(): boolean {
    return this.idRolSeleccionado === null || this.idRolSeleccionado === this.detalle()?.rol.id;
  }

  // ---------- Listado ----------

  private cargarRoles(): void {
    this.usuariosService.listarRoles().subscribe({
      next: (respuesta) => this.roles.set(respuesta.resultado ?? []),
      error: (error) => this.mostrarError(this.extraerError(error, 'No se pudieron cargar los roles.')),
    });
  }

  cargarUsuarios(): void {
    this.cargandoLista.set(true);
    this.usuariosService
      .listar({
        pagina: this.pagina(),
        tamano_pagina: this.tamanoPagina,
        busqueda: this.busqueda,
        id_rol: this.idRolFiltro,
        estado: this.estadoFiltro,
      })
      .pipe(finalize(() => this.cargandoLista.set(false)))
      .subscribe({
        next: (respuesta) => {
          const resultado = respuesta.resultado;
          this.usuarios.set(resultado.elementos ?? []);
          this.total.set(resultado.total);
          this.totalPaginas.set(resultado.total_paginas);
        },
        error: (error) => this.mostrarError(this.extraerError(error, 'No se pudieron cargar los usuarios.')),
      });
  }

  onBusquedaChange(valor: string): void {
    this.busqueda = valor;
    this.busqueda$.next(valor.trim());
  }

  onFiltroChange(): void {
    this.irAPagina(1);
  }

  limpiarFiltros(): void {
    this.busqueda = '';
    this.idRolFiltro = null;
    this.estadoFiltro = null;
    this.busqueda$.next('');
    this.irAPagina(1);
  }

  irAPagina(pagina: number): void {
    if (pagina < 1 || (this.totalPaginas() && pagina > this.totalPaginas())) {
      return;
    }
    this.pagina.set(pagina);
    this.cargarUsuarios();
  }

  // ---------- Detalle ----------

  verDetalle(idUsuario: number): void {
    this.cargandoDetalle.set(true);
    this.limpiarMensajes();
    this.usuariosService
      .obtener(idUsuario)
      .pipe(finalize(() => this.cargandoDetalle.set(false)))
      .subscribe({
        next: (respuesta) => this.mostrarDetalle(respuesta.resultado),
        error: (error) => this.mostrarError(this.extraerError(error, 'No se pudo obtener el detalle del usuario.')),
      });
  }

  cerrarDetalle(): void {
    this.detalle.set(null);
    this.idRolSeleccionado = null;
  }

  private mostrarDetalle(usuario: UsuarioAdminDetalle): void {
    this.detalle.set(usuario);
    this.idRolSeleccionado = usuario.rol.id;
  }

  // ---------- Acciones con confirmacion ----------

  solicitarSuspension(): void {
    const usuario = this.detalle();
    if (usuario && !this.esCuentaPropia(usuario)) {
      this.accionPendiente.set({ tipo: 'suspender', usuario });
    }
  }

  solicitarReactivacion(): void {
    const usuario = this.detalle();
    if (usuario) {
      this.accionPendiente.set({ tipo: 'reactivar', usuario });
    }
  }

  solicitarCambioRol(): void {
    const usuario = this.detalle();
    if (usuario && this.idRolSeleccionado !== null && !this.rolSinCambios) {
      this.accionPendiente.set({ tipo: 'rol', usuario, idRol: this.idRolSeleccionado });
    }
  }

  nombreRol(idRol: number | undefined): string {
    return this.roles().find((r) => r.id === idRol)?.nombre ?? '';
  }

  cancelarAccion(): void {
    const accion = this.accionPendiente();
    if (accion?.tipo === 'rol') {
      this.idRolSeleccionado = accion.usuario.rol.id;
    }
    this.accionPendiente.set(null);
  }

  confirmarAccion(): void {
    const accion = this.accionPendiente();
    if (!accion || this.guardando()) {
      return;
    }
    const id = accion.usuario.id;
    const peticion =
      accion.tipo === 'suspender'
        ? this.usuariosService.suspender(id)
        : accion.tipo === 'reactivar'
          ? this.usuariosService.reactivar(id)
          : this.usuariosService.cambiarRol(id, accion.idRol!);

    this.guardando.set(true);
    this.limpiarMensajes();
    peticion.pipe(finalize(() => this.guardando.set(false))).subscribe({
      next: (respuesta) => {
        this.accionPendiente.set(null);
        this.mostrarDetalle(respuesta.resultado);
        this.mensajeExito.set(respuesta.mensaje);
        this.cargarUsuarios();
      },
      error: (error) => {
        this.cancelarAccion();
        this.mostrarError(this.extraerError(error, 'No se pudo completar la acción.'));
      },
    });
  }

  // ---------- Mensajes ----------

  private limpiarMensajes(): void {
    this.mensajeError.set('');
    this.mensajeExito.set('');
  }

  private mostrarError(mensaje: string): void {
    this.mensajeExito.set('');
    this.mensajeError.set(mensaje);
  }

  private extraerError(error: any, porDefecto: string): string {
    return error?.error?.mensaje || error?.error?.detail || porDefecto;
  }
}
