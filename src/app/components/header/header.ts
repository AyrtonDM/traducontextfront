import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AutenticacionService } from '../../core/services/autenticacion.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './header.html',
  styleUrl: './header.css',
})
export class Header {

  private readonly router = inject(Router);
  private readonly authService = inject(AutenticacionService);

  cerrarSesion(): void {

    this.authService.cerrarSesion().subscribe({
      next: () => {
        this.finalizarSesion();
      },

      error: (error) => {
        console.error('Error al cerrar sesión:', error);

        // Aunque el backend falle, eliminamos el token local.
        this.finalizarSesion();
      }
    });
  }

  private finalizarSesion(): void {
    localStorage.removeItem('auth_token');
    this.router.navigate(['/login']);
  }
}