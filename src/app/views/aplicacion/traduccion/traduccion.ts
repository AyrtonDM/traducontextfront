import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { EjemploTraduccion, Idioma, Traduccion as TraduccionModelo } from '../../../core/models/traduccion.model';
import { TraduccionService } from '../../../core/services/traduccion.service';

@Component({
  selector: 'app-traduccion',
  imports: [FormsModule, RouterLink],
  templateUrl: './traduccion.html',
  styleUrl: './traduccion.css',
})
export class Traduccion {
  private readonly traduccionService = inject(TraduccionService);
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
  readonly idiomas = signal<Idioma[]>([]);
  readonly ejemplos: EjemploTraduccion[] = [
    { nombre: 'Texto académico', texto: 'The study examines the impact of technology on education.' },
    { nombre: 'Correo profesional', texto: 'Please find attached the report for your review.' },
    { nombre: 'Documento legal', texto: 'The contract must be signed.' },
    { nombre: 'Conversación informal', texto: 'Hi! How has your day been?' },
    { nombre: 'Términos técnicos', texto: 'The server processes incoming requests.' },
    { nombre: 'Redes sociales', texto: 'Discover something new every day!' },
  ];
  readonly recientes: TraduccionModelo[] = [];

  constructor() {
    this.cargarIdiomas();
  }

  private cargarIdiomas(): void {
    this.traduccionService.obtenerIdiomas().subscribe({
      next: (respuesta) => this.idiomas.set(respuesta.resultado),
      error: () => this.mensaje.set('No se pudieron cargar los idiomas disponibles.'),
    });
  }

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
