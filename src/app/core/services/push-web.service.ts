import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import type { Messaging } from 'firebase/messaging';
import { environment } from '../../../environments/environment';
import { firebaseConfig, vapidKey } from '../../../environments/firebase';
import { RegistrarDispositivoSolicitud } from '../models/notificacion.model';
import { NotificacionesService } from './notificaciones.service';

export type EstadoPushWeb = 'no-soportado' | 'pendiente' | 'activado' | 'bloqueado' | 'error';

/**
 * Notificaciones push del navegador con Firebase Cloud Messaging.
 * El token FCM se registra en el backend (POST /dispositivos) y se elimina al cerrar sesion.
 */
@Injectable({
  providedIn: 'root'
})
export class PushWebService {
  private readonly http = inject(HttpClient);
  private readonly notificaciones = inject(NotificacionesService);
  private readonly apiUrl = `${environment.apiUrl}/dispositivos`;
  private static readonly CLAVE_TOKEN = 'fcm_token_web';

  readonly estado = signal<EstadoPushWeb>('pendiente');

  private messaging: Messaging | null = null;
  private escuchandoMensajes = false;

  /** Si el usuario ya dio permiso, registra el dispositivo sin preguntar. */
  async inicializar(): Promise<void> {
    if (!(await this.soportado())) {
      this.estado.set('no-soportado');
      return;
    }
    if (Notification.permission === 'denied') {
      this.estado.set('bloqueado');
      return;
    }
    if (Notification.permission === 'granted') {
      await this.registrar();
    }
  }

  /** Debe llamarse desde un clic del usuario (los navegadores bloquean el permiso sin gesto). */
  async activar(): Promise<void> {
    if (!(await this.soportado())) {
      this.estado.set('no-soportado');
      return;
    }
    const permiso = await Notification.requestPermission();
    if (permiso !== 'granted') {
      this.estado.set(permiso === 'denied' ? 'bloqueado' : 'pendiente');
      return;
    }
    await this.registrar();
  }

  /** Al cerrar sesion: el navegador deja de recibir push de esta cuenta. Nunca lanza. */
  async desregistrar(): Promise<void> {
    const token = localStorage.getItem(PushWebService.CLAVE_TOKEN);
    localStorage.removeItem(PushWebService.CLAVE_TOKEN);
    if (!token) return;
    try {
      await firstValueFrom(this.http.delete(`${this.apiUrl}/${encodeURIComponent(token)}`));
    } catch {
      // Ya no existia o no hay conexion: se sigue con el cierre de sesion.
    }
    try {
      if (this.messaging) {
        const { deleteToken } = await import('firebase/messaging');
        await deleteToken(this.messaging);
      }
    } catch {
      // Sin efecto si el token ya no era valido.
    }
    this.estado.set(Notification.permission === 'granted' ? 'pendiente' : this.estado());
  }

  private async registrar(): Promise<void> {
    try {
      const registro = await navigator.serviceWorker.register(this.urlServiceWorker(), { scope: '/' });
      const { getMessaging, getToken } = await import('firebase/messaging');
      this.messaging ??= getMessaging(await this.appFirebase());
      const token = await getToken(this.messaging, { vapidKey, serviceWorkerRegistration: registro });
      if (!token) {
        this.estado.set('error');
        return;
      }

      const solicitud: RegistrarDispositivoSolicitud = { token_fcm: token, plataforma: 'web' };
      await firstValueFrom(this.http.post(this.apiUrl, solicitud));
      localStorage.setItem(PushWebService.CLAVE_TOKEN, token);
      await this.escucharEnPrimerPlano();
      this.estado.set('activado');
    } catch {
      // No se registra el error completo: puede incluir el token del dispositivo.
      console.warn('No se pudieron activar las notificaciones del navegador.');
      this.estado.set('error');
    }
  }

  /** Con la pestana abierta FCM no muestra nada: se refresca la bandeja y se muestra el aviso. */
  private async escucharEnPrimerPlano(): Promise<void> {
    if (this.escuchandoMensajes || !this.messaging) return;
    this.escuchandoMensajes = true;
    const { onMessage } = await import('firebase/messaging');
    onMessage(this.messaging, async (mensaje) => {
      this.notificaciones.cargar(true);
      const titulo = mensaje.notification?.title ?? 'TraduContext';
      const registro = await navigator.serviceWorker.getRegistration('/');
      await registro?.showNotification(titulo, {
        body: mensaje.notification?.body ?? '',
        icon: '/favicon.ico',
        data: mensaje.data ?? {},
      });
    });
  }

  /** Firebase se carga bajo demanda para no inflar el bundle inicial. */
  private async appFirebase() {
    const { getApps, initializeApp } = await import('firebase/app');
    return getApps()[0] ?? initializeApp(firebaseConfig);
  }

  /** La configuracion viaja en la URL para no dejarla escrita en /public (que se versiona). */
  private urlServiceWorker(): string {
    const parametros = new URLSearchParams({ config: JSON.stringify(firebaseConfig) });
    return `/firebase-messaging-sw.js?${parametros.toString()}`;
  }

  private async soportado(): Promise<boolean> {
    try {
      if (!('Notification' in window) || !('serviceWorker' in navigator)) return false;
      const { isSupported } = await import('firebase/messaging');
      return await isSupported();
    } catch {
      return false;
    }
  }
}
