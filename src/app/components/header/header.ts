import { Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { UsuarioAutenticado } from '../../core/models/autenticacion.model';
import { AutenticacionService } from '../../core/services/autenticacion.service';

@Component({
  selector: 'app-header',
  standalone: true,
  templateUrl: './header.html',
  styleUrl: './header.css',
})
export class Header implements OnInit {

  private readonly router = inject(Router);
  private readonly authService = inject(AutenticacionService);

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
    if (this.authService.usuarioActual()?.nombre) {
      return;
    }

    this.cargarUsuarioActual();
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
