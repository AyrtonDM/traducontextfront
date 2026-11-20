import {
  Component,
  ElementRef,
  ViewChild,
  effect,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AsistenteGuiaService } from '../../core/services/asistente-guia.service';
import { MensajeChatGuia } from '../../core/models/asistente-guia.model';

@Component({
  selector: 'app-asistente-guia',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './asistente-guia.html',
  styleUrl: './asistente-guia.css',
})
export class AsistenteGuia {
  readonly asistenteService = inject(AsistenteGuiaService);

  @ViewChild('messagesScroll') private messagesScroll?: ElementRef<HTMLDivElement>;
  @ViewChild('inputPregunta') private inputPregunta?: ElementRef<HTMLInputElement>;

  textoPregunta = '';

  constructor() {
    // Hace scroll automático al fondo cada vez que cambian los mensajes o el estado de carga
    effect(() => {
      this.asistenteService.mensajes();
      this.asistenteService.sugerencias();
      this.asistenteService.cargando();
      this.scrollToBottom();
    });

    // Hace foco en el input cuando se abre el chat
    effect(() => {
      if (this.asistenteService.estaAbierto()) {
        setTimeout(() => {
          this.inputPregunta?.nativeElement?.focus();
          this.scrollToBottom();
        }, 150);
      }
    });
  }

  get mensajes(): MensajeChatGuia[] {
    return this.asistenteService.mensajes();
  }

  get sugerencias(): string[] {
    return this.asistenteService.sugerencias();
  }

  get cargando(): boolean {
    return this.asistenteService.cargando();
  }

  get estaAbierto(): boolean {
    return this.asistenteService.estaAbierto();
  }

  get vistaActual(): string {
    return this.asistenteService.vistaActual();
  }

  alternarChat(): void {
    this.asistenteService.alternarAsistente();
  }

  cerrarChat(): void {
    this.asistenteService.cerrarAsistente();
  }

  reiniciarChat(): void {
    this.asistenteService.reiniciarChat();
  }

  enviarTexto(): void {
    const texto = this.textoPregunta.trim();
    if (!texto || this.cargando) return;

    this.textoPregunta = '';
    this.asistenteService.enviarPregunta(texto);
  }

  seleccionarSugerencia(sugerencia: string): void {
    if (this.cargando) return;
    this.asistenteService.enviarPregunta(sugerencia);
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.enviarTexto();
    }
  }

  /**
   * Formatea texto Markdown básico (negritas, cursivas, saltos de línea) de manera segura
   */
  formatearMarkdown(texto: string): string {
    if (!texto) return '';

    // 1. Escapar HTML para evitar inyecciones
    let seguro = texto
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // 2. Negritas **texto** -> <strong>texto</strong>
    seguro = seguro.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    // 3. Cursivas *texto* -> <em>texto</em>
    seguro = seguro.replace(/\*(.*?)\*/g, '<em>$1</em>');

    // 4. Listas numeradas y viñetas
    seguro = seguro.replace(/^(\d+\.)\s+(.+)$/gm, '<span class="md-list-item"><strong class="md-num">$1</strong> $2</span>');
    seguro = seguro.replace(/^[-*•]\s+(.+)$/gm, '<span class="md-bullet-item"><span class="md-bullet">•</span> $1</span>');

    // 5. Saltos de línea
    seguro = seguro.replace(/\n/g, '<br>');

    return seguro;
  }

  obtenerEtiquetaVista(vista: string): string {
    switch (vista) {
      case 'traduccion': return 'Traducción';
      case 'documentos': return 'Documentos';
      case 'conversaciones': return 'Conversaciones';
      case 'glosarios': return 'Glosarios';
      case 'historial': return 'Historial';
      case 'perfil': return 'Mi Perfil';
      case 'chats': return 'Chats';
      case 'integraciones': return 'Integraciones';
      case 'dashboard': return 'Dashboard';
      default: return 'General';
    }
  }

  private scrollToBottom(): void {
    setTimeout(() => {
      if (this.messagesScroll?.nativeElement) {
        this.messagesScroll.nativeElement.scrollTop = this.messagesScroll.nativeElement.scrollHeight;
      }
    }, 50);
  }
}
