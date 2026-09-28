import { Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { merge, of, Subject } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import {
  EjemploTraduccion,
  Idioma,
  RealizarTraduccionSolicitud,
  Traduccion as TraduccionModelo
} from '../../../core/models/traduccion.model';
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
  origen = '';
  destino = 'en';
  idiomaOrigenDetectado: string | null = null;
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
  readonly cargando = signal(false);
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

  private readonly debouncedTrigger$ = new Subject<string>();
  private readonly immediateTrigger$ = new Subject<string>();

  constructor() {
    this.cargarIdiomas();
    this.configurarTraduccionAutomatica();
  }

  private configurarTraduccionAutomatica(): void {
    merge(
      this.debouncedTrigger$.pipe(
        debounceTime(400),
        distinctUntilChanged()
      ),
      this.immediateTrigger$
    ).pipe(
      switchMap(() => {
        const textoLimpio = this.texto.trim();
        if (!textoLimpio) {
          this.resultado = '';
          this.cargando.set(false);
          return of(null);
        }

        if (!this.destino) {
          this.cargando.set(false);
          return of(null);
        }

        this.cargando.set(true);

        const solicitud: RealizarTraduccionSolicitud = {
          texto_a_traducir: textoLimpio,
          idioma_destino: this.destino,
          idioma_origen: this.origen ? this.origen : null,
          id_contexto: null
        };

        return this.traduccionService.traducir(solicitud).pipe(
          catchError((error) => {
            console.error('Error al traducir:', error);
            this.cargando.set(false);
            this.mensaje.set('Ocurrió un error al traducir el texto.');
            return of(null);
          })
        );
      }),
      takeUntilDestroyed()
    ).subscribe((respuesta) => {
      this.cargando.set(false);
      if (respuesta?.resultado) {
        this.resultado = respuesta.resultado.traduccion;
        this.idiomaOrigenDetectado = respuesta.resultado.idioma_origen;
      }
    });
  }

  private cargarIdiomas(): void {
    this.traduccionService.obtenerIdiomas().subscribe({
      next: (respuesta) => {
        this.idiomas.set(respuesta.resultado);
        if (respuesta.resultado.length > 0 && !this.destino) {
          this.destino = respuesta.resultado[0].codigo;
        }
      },
      error: () => this.mensaje.set('No se pudieron cargar los idiomas disponibles.'),
    });
  }

  limpiar(): void {
    this.texto = '';
    this.resultado = '';
    this.favorito = false;
    this.mensaje.set('');
    this.cargando.set(false);
  }

  actualizarTexto(inmediato: boolean = false): void {
    this.favorito = false;
    this.mensaje.set('');

    const textoLimpio = this.texto.trim();
    if (!textoLimpio) {
      this.resultado = '';
      this.cargando.set(false);
      return;
    }

    const clave = `${this.origen}->${this.destino}:${this.texto}`;
    if (inmediato) {
      this.immediateTrigger$.next(clave);
    } else {
      this.debouncedTrigger$.next(clave);
    }
  }

  cargarEjemplo(texto: string): void {
    this.texto = texto;
    this.actualizarTexto(true);
  }

  intercambiar(): void {
    const nuevoDestino = this.origen || this.idiomaOrigenDetectado;
    if (!nuevoDestino) {
      return;
    }
    const nuevoOrigen = this.destino;
    this.origen = nuevoOrigen;
    this.destino = nuevoDestino;
    this.texto = this.resultado;
    this.resultado = '';
    this.actualizarTexto(true);
  }

  traducir(): void {
    this.actualizarTexto(true);
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
