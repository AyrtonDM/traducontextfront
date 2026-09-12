import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-traduccion',
  imports: [FormsModule, RouterLink],
  templateUrl: './traduccion.html',
  styleUrl: './traduccion.css',
})
export class Traduccion {
  texto = 'I went to the bank to open an account.';
  resultado = 'Fui al banco para abrir una cuenta.';
  origen = 'en';
  destino = 'es';
  dominio = 'General';
  tono = 'Neutral';
  region = 'Español (Latinoamérica)';
  contexto = '';
  alternativas = true;
  modismos = false;
  formatoLocal = false;
  favorito = false;
  ayuda = false;
  verTodo = false;
  readonly mensaje = signal('');
  readonly idiomas = [
    { valor: 'en', nombre: 'Inglés' },
    { valor: 'es', nombre: 'Español' },
    { valor: 'pt', nombre: 'Portugués' },
    { valor: 'fr', nombre: 'Francés' },
  ];
  readonly ejemplos = [
    { nombre: 'Texto académico', texto: 'The study examines the impact of technology on education.' },
    { nombre: 'Correo profesional', texto: 'Please find attached the report for your review.' },
    { nombre: 'Documento legal', texto: 'The contract must be signed.' },
    { nombre: 'Conversación informal', texto: 'Hi! How has your day been?' },
    { nombre: 'Términos técnicos', texto: 'The server processes incoming requests.' },
    { nombre: 'Redes sociales', texto: 'Discover something new every day!' },
  ];
  readonly recientes = [
    { texto: 'I went to the bank to open an account.', resultado: 'Fui al banco para abrir una cuenta.', tiempo: 'Hace 2 min' },
    { texto: 'The contract must be signed.', resultado: 'El contrato debe ser firmado.', tiempo: 'Hace 10 min' },
    { texto: 'Medical records are confidential.', resultado: 'Los registros médicos son confidenciales.', tiempo: 'Hace 1 hora' },
  ];

  limpiar(): void {
    this.texto = '';
    this.actualizarTexto();
  }

  actualizarTexto(): void {
    this.resultado = '';
    this.favorito = false;
    this.mensaje.set('');
  }

  intercambiar(): void {
    [this.origen, this.destino] = [this.destino, this.origen];
    this.texto = this.resultado;
    this.actualizarTexto();
  }

  cargarEjemplo(texto: string): void {
    this.texto = texto;
    this.origen = 'en';
    this.actualizarTexto();
  }

  cargarReciente(item: (typeof this.recientes)[number]): void {
    this.texto = item.texto;
    this.resultado = item.resultado;
    this.origen = 'en';
    this.destino = 'es';
    this.favorito = false;
    this.mensaje.set('Traducción de ejemplo.');
  }

  traducir(): void {
    this.mensaje.set('El servicio de traducción todavía no está disponible.');
  }

  async copiar(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.resultado);
      this.mensaje.set('Traducción copiada.');
    } catch {
      this.mensaje.set('No se pudo copiar. Selecciona el texto y cópialo manualmente.');
    }
  }

  escuchar(): void {
    if (!('speechSynthesis' in window)) {
      this.mensaje.set('Tu navegador no permite leer el texto en voz alta.');
      return;
    }
    window.speechSynthesis.cancel();
    const voz = new SpeechSynthesisUtterance(this.resultado);
    voz.lang = this.destino;
    window.speechSynthesis.speak(voz);
  }
}
