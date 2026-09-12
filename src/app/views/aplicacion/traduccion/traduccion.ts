import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { EjemploTraduccion, Idioma, Traduccion as TraduccionModelo } from '../../../core/models/traduccion.model';

@Component({
  selector: 'app-traduccion',
  imports: [FormsModule, RouterLink],
  templateUrl: './traduccion.html',
  styleUrl: './traduccion.css',
})
export class Traduccion {
  texto = '';
  resultado = '';
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
  readonly idiomas: Idioma[] = [
    { id: 1, codigo: 'en', nombre: 'Inglés' },
    { id: 2, codigo: 'es', nombre: 'Español' },
    { id: 3, codigo: 'pt', nombre: 'Portugués' },
    { id: 4, codigo: 'fr', nombre: 'Francés' },
  ];
  readonly ejemplos: EjemploTraduccion[] = [
    { nombre: 'Texto académico', texto: 'The study examines the impact of technology on education.' },
    { nombre: 'Correo profesional', texto: 'Please find attached the report for your review.' },
    { nombre: 'Documento legal', texto: 'The contract must be signed.' },
    { nombre: 'Conversación informal', texto: 'Hi! How has your day been?' },
    { nombre: 'Términos técnicos', texto: 'The server processes incoming requests.' },
    { nombre: 'Redes sociales', texto: 'Discover something new every day!' },
  ];
  readonly recientes: TraduccionModelo[] = [];

  limpiar(): void {
    this.texto = '';
    this.actualizarTexto();
  }

  actualizarTexto(): void {
    this.resultado = '';
    this.favorito = false;
    this.mensaje.set('');
  }

  cargarEjemplo(texto: string): void {
    this.texto = texto;
    this.origen = 'en';
    this.actualizarTexto();
  }

  intercambiar(): void {
    [this.origen, this.destino] = [this.destino, this.origen];
    this.texto = this.resultado;
    this.actualizarTexto();
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
