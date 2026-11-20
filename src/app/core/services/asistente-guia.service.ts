import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import {
  BienvenidaGuiaRespuesta,
  MensajeChatGuia,
  MensajeHistorialGuia,
  PreguntarGuiaRespuesta,
  PreguntarGuiaSolicitud,
} from '../models/asistente-guia.model';

@Injectable({
  providedIn: 'root'
})
export class AsistenteGuiaService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly apiUrl = environment.apiUrl;

  // Estado reactivo del chat
  readonly estaAbierto = signal<boolean>(false);
  readonly cargando = signal<boolean>(false);
  readonly mensajes = signal<MensajeChatGuia[]>([]);
  readonly sugerencias = signal<string[]>([]);
  readonly vistaActual = signal<string>('general');

  constructor() {
    this.vistaActual.set(this.detectarVistaActual(this.router.url));

    // Actualiza la vista actual automáticamente al navegar
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: any) => {
        const nuevaVista = this.detectarVistaActual(event.urlAfterRedirects || event.url);
        this.vistaActual.set(nuevaVista);
      });
  }

  /**
   * Detecta el módulo actual según la URL del Router
   */
  detectarVistaActual(url: string): string {
    const ruta = (url || '').toLowerCase();
    if (ruta.includes('traduccion')) return 'traduccion';
    if (ruta.includes('documento')) return 'documentos';
    if (ruta.includes('conversacion')) return 'conversaciones';
    if (ruta.includes('glosario')) return 'glosarios';
    if (ruta.includes('historial')) return 'historial';
    if (ruta.includes('perfil') || ruta.includes('preferencia')) return 'perfil';
    if (ruta.includes('chat')) return 'chats';
    if (ruta.includes('integracion')) return 'integraciones';
    if (ruta.includes('dashboard') || ruta.includes('reporte') || ruta.includes('usuario')) return 'dashboard';
    if (ruta.includes('inicio')) return 'dashboard';
    return 'general';
  }

  /**
   * Abre la ventana flotante del asistente.
   * Si se especifica una pregunta, la envía de inmediato una vez abierta la conversación.
   */
  abrirAsistente(preguntaOpcional?: string): void {
    this.estaAbierto.set(true);

    if (this.mensajes().length === 0) {
      this.cargarBienvenida(preguntaOpcional);
    } else if (preguntaOpcional && preguntaOpcional.trim()) {
      this.enviarPregunta(preguntaOpcional.trim());
    }
  }

  cerrarAsistente(): void {
    this.estaAbierto.set(false);
  }

  alternarAsistente(): void {
    const nuevoEstado = !this.estaAbierto();
    this.estaAbierto.set(nuevoEstado);

    if (nuevoEstado && this.mensajes().length === 0) {
      this.cargarBienvenida();
    }
  }

  reiniciarChat(): void {
    this.mensajes.set([]);
    this.sugerencias.set([]);
    this.cargarBienvenida();
  }

  /**
   * Consume GET {apiUrl}/asistente-guia/bienvenida?vista_actual={vista_actual}
   */
  cargarBienvenida(preguntaPosterior?: string): void {
    const vista = this.vistaActual();
    this.cargando.set(true);

    this.http.get<BienvenidaGuiaRespuesta>(`${this.apiUrl}/asistente-guia/bienvenida`, {
      params: { vista_actual: vista }
    }).subscribe({
      next: (resp) => {
        this.cargando.set(false);
        const resultado = resp?.resultado;
        if (resultado) {
          const saludoInicial: MensajeChatGuia = {
            rol: 'assistant',
            contenido: resultado.saludo || '¡Hola! Soy el Asistente Guía de TraduContext. ¿En qué puedo ayudarte?',
            fecha: new Date(),
          };
          this.mensajes.set([saludoInicial]);
          this.sugerencias.set(resultado.sugerencias_iniciales || []);
        }

        if (preguntaPosterior && preguntaPosterior.trim()) {
          this.enviarPregunta(preguntaPosterior.trim());
        }
      },
      error: (err) => {
        this.cargando.set(false);
        console.error('Error al obtener bienvenida del asistente guía:', err);
        const mensajeFallo: MensajeChatGuia = {
          rol: 'assistant',
          contenido: '¡Hola! Soy el Asistente Guía de TraduContext. ¿Tienes alguna duda sobre el uso del sistema?',
          fecha: new Date(),
        };
        this.mensajes.set([mensajeFallo]);
        this.sugerencias.set([
          '¿Cómo realizo una traducción de texto?',
          '¿Cómo traduzco documentos conservando formato?',
          '¿Cómo inicio una conversación en tiempo real?'
        ]);

        if (preguntaPosterior && preguntaPosterior.trim()) {
          this.enviarPregunta(preguntaPosterior.trim());
        }
      }
    });
  }

  /**
   * Consume POST {apiUrl}/asistente-guia/preguntar
   */
  enviarPregunta(preguntaTexto: string): void {
    const textoLimpio = preguntaTexto.trim();
    if (!textoLimpio || this.cargando()) return;

    // 1. Tomar el historial actual (antes de agregar la nueva pregunta)
    const historial: MensajeHistorialGuia[] = this.mensajes().map(m => ({
      rol: m.rol,
      contenido: m.contenido,
    }));

    // 2. Agregar inmediatamente la pregunta del usuario a la lista
    const mensajeUsuario: MensajeChatGuia = {
      rol: 'user',
      contenido: textoLimpio,
      fecha: new Date(),
    };
    this.mensajes.update(list => [...list, mensajeUsuario]);
    this.cargando.set(true);

    const solicitud: PreguntarGuiaSolicitud = {
      pregunta: textoLimpio,
      vista_actual: this.vistaActual(),
      historial,
    };

    // 3. Llamar al backend
    this.http.post<PreguntarGuiaRespuesta>(`${this.apiUrl}/asistente-guia/preguntar`, solicitud).subscribe({
      next: (resp) => {
        this.cargando.set(false);
        const resultado = resp?.resultado;
        if (resultado) {
          const mensajeAsistente: MensajeChatGuia = {
            rol: 'assistant',
            contenido: resultado.respuesta,
            fecha: new Date(),
          };
          this.mensajes.update(list => [...list, mensajeAsistente]);
          this.sugerencias.set(resultado.sugerencias || []);
        }
      },
      error: (err) => {
        this.cargando.set(false);
        console.error('Error al consultar al asistente guía:', err);
        const detalle = err?.error?.detail || err?.error?.mensaje || 'No pude conectar con el servicio en este momento. Por favor intenta de nuevo.';
        const mensajeError: MensajeChatGuia = {
          rol: 'assistant',
          contenido: `Lo siento, ocurrió un problema al procesar tu consulta: ${detalle}`,
          fecha: new Date(),
        };
        this.mensajes.update(list => [...list, mensajeError]);
      }
    });
  }
}
