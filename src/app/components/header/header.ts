import { Component, ElementRef, HostListener, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { UsuarioAutenticado } from '../../core/models/autenticacion.model';
import { Notificacion } from '../../core/models/notificacion.model';
import { AutenticacionService } from '../../core/services/autenticacion.service';
import { NotificacionesService } from '../../core/services/notificaciones.service';
import { PushWebService } from '../../core/services/push-web.service';

@Component({
  selector: 'app-header',
  standalone: true,
  templateUrl: './header.html',
  styleUrl: './header.css',
})
export class Header implements OnInit, OnDestroy {

  private readonly router = inject(Router);
  private readonly authService = inject(AutenticacionService);
  private readonly elemento = inject(ElementRef<HTMLElement>);
  readonly notificaciones = inject(NotificacionesService);
  readonly pushWeb = inject(PushWebService);

  readonly panelAbierto = signal(false);

  private readonly usuarioVacio: UsuarioAutenticado = {
    nombre: '',
    correo: '',
    rol: '',
    permisos: [],
  };

  get usuarioActual(): UsuarioAutenticado {
    return this.authService.usuarioActual() ?? this.usuarioVacio;
  }

  ngOnInit(): void {
    this.notificaciones.iniciar();
    void this.pushWeb.inicializar();

    if (this.authService.usuarioActual()?.nombre) {
      return;
    }

    this.cargarUsuarioActual();
  }

  ngOnDestroy(): void {
    this.notificaciones.detener();
  }

  get iniciales(): string {
    const nombre = this.usuarioActual.nombre.trim();

    if (!nombre) {
      return 'US';
    }

    const palabras = nombre.split(/\s+/).filter(Boolean).slice(0, 2);
    const iniciales = palabras.map((palabra) => palabra.charAt(0).toUpperCase());

    return iniciales.join('') || 'US';
  }

  get contadorTexto(): string {
    const total = this.notificaciones.noLeidas();
    return total > 99 ? '99+' : String(total);
  }

  alternarPanel(): void {
    const abrir = !this.panelAbierto();
    this.panelAbierto.set(abrir);
    if (abrir) this.notificaciones.cargar(true);
  }

  abrirNotificacion(notificacion: Notificacion): void {
    this.notificaciones.marcarLeida(notificacion);
  }

  activarPush(): void {
    void this.pushWeb.activar();
  }

  posponerPush(): void {
    this.pushWeb.posponerAviso();
  }

  fechaRelativa(fechaIso: string): string {
    const fecha = new Date(fechaIso);
    const segundos = Math.round((Date.now() - fecha.getTime()) / 1000);
    if (segundos < 60) return 'Hace un momento';
    const minutos = Math.round(segundos / 60);
    if (minutos < 60) return `Hace ${minutos} min`;
    const horas = Math.round(minutos / 60);
    if (horas < 24) return `Hace ${horas} h`;
    const dias = Math.round(horas / 24);
    if (dias < 7) return dias === 1 ? 'Ayer' : `Hace ${dias} días`;
    return fecha.toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  @HostListener('document:click', ['$event'])
  cerrarAlHacerClicFuera(evento: MouseEvent): void {
    if (this.panelAbierto() && !this.elemento.nativeElement.contains(evento.target as Node)) {
      this.panelAbierto.set(false);
    }
  }

  @HostListener('document:keydown.escape')
  cerrarConEscape(): void {
    this.panelAbierto.set(false);
  }

  cerrarSesion(): void {
    this.authService.cerrarSesion().subscribe({
      next: () => {
        this.finalizarSesion();
      },
      error: (error) => {
        console.error('Error al cerrar sesion:', error);
        this.finalizarSesion();
      }
    });
  }

  private cargarUsuarioActual(): void {
    this.authService.cargarYGuardarPerfil().subscribe({
      error: (error) => {
        console.error('Error al obtener el perfil del usuario:', error);
      }
    });
  }

  private finalizarSesion(): void {
    localStorage.removeItem('auth_token');
    this.authService.guardarUsuarioActual(null);
    this.router.navigate(['/login']);
  }
}
