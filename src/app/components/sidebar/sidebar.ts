import { Component, inject, OnInit } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AutenticacionService } from '../../core/services/autenticacion.service';
import { UsuarioAutenticado } from '../../core/models/autenticacion.model';

@Component({
    selector: 'app-sidebar',
    standalone: true,
    imports: [RouterLink, RouterLinkActive],
    templateUrl: './sidebar.html',
    styleUrl: './sidebar.css',
})
export class Sidebar implements OnInit {

    private readonly router = inject(Router);
    private readonly authService = inject(AutenticacionService);

    usuarioActual: UsuarioAutenticado | null = null;

    ngOnInit(): void {
        this.usuarioActual = this.authService.obtenerUsuarioActual();
    }

    tienePermiso(permiso: string): boolean {
        return this.usuarioActual?.permisos?.includes(permiso) ?? false;
    }

    cerrarSesion(): void {

        this.authService.cerrarSesion().subscribe({
            next: () => {
                this.finalizarSesion();
            },

            error: (error) => {
                console.error('Error al cerrar sesion:', error);

                // Aunque el backend falle, eliminamos el token local.
                this.finalizarSesion();
            }
        });
    }

    private finalizarSesion(): void {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('usuario_actual');
        this.router.navigate(['/login']);
    }
}