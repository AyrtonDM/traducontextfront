import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  EjemploTraduccion,
  Idioma,
  SolicitudTraduccionContextual,
  TraduccionHistorialItem,
} from '../../../core/models/traduccion.model';
import { TraduccionService } from '../../../core/services/traduccion.service';

@Component({
  selector: 'app-traduccion',
  imports: [FormsModule, RouterLink],
  templateUrl: './traduccion.html',
  styleUrl: './traduccion.css',
})
export class Traduccion implements OnInit {
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

  readonly cargando = signal(false);
  readonly mensaje = signal('');
  readonly esError = signal(false);
  readonly listaAlternativas = signal<string[]>([]);
  readonly explicacionModismos = signal<string | null>(null);

  idiomas: Idioma[] = [
    { id: 1, codigo: 'en', nombre: 'Inglés' },
    { id: 2, codigo: 'es', nombre: 'Español' },
    { id: 3, codigo: 'pt', nombre: 'Portugués' },
    { id: 4, codigo: 'fr', nombre: 'Francés' },
    { id: 5, codigo: 'de', nombre: 'Alemán' },
    { id: 6, codigo: 'it', nombre: 'Italiano' },
    { id: 7, codigo: 'ja', nombre: 'Japonés' },
    { id: 8, codigo: 'zh', nombre: 'Chino' },
  ];

  readonly ejemplos: EjemploTraduccion[] = [
    { nombre: 'Texto académico', texto: 'The study examines the impact of technology on education.' },
    { nombre: 'Correo profesional', texto: 'Please find attached the report for your review.' },
    { nombre: 'Documento legal', texto: 'The contract must be signed by both parties.' },
    { nombre: 'Conversación informal', texto: 'Hi! How has your day been?' },
    { nombre: 'Términos técnicos', texto: 'The server processes incoming requests.' },
    { nombre: 'Redes sociales', texto: 'Discover something new every day!' },
  ];

  recientes: TraduccionHistorialItem[] = [];

  ngOnInit(): void {
    this.cargarHistorial();
    this.cargarIdiomasBackend();
  }

  cargarHistorial(): void {
    this.traduccionService.obtenerRecientes().subscribe({
      next: (resp) => {
        if (resp && resp.resultado) {
          this.recientes = resp.resultado;
        }
      },
      error: () => {
        // Silencioso o sin interrumpir vista
      },
    });
  }

  cargarIdiomasBackend(): void {
    this.traduccionService.obtenerIdiomas().subscribe({
      next: (resp) => {
        if (resp && resp.resultado && resp.resultado.length > 0) {
          this.idiomas = resp.resultado;
        }
      },
      error: () => {
        // Conserva idiomas por defecto
      },
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
    this.esError.set(false);
    this.listaAlternativas.set([]);
    this.explicacionModismos.set(null);
  }

  cargarEjemplo(texto: string): void {
    this.texto = texto;
    this.origen = 'en';
    this.actualizarTexto();
  }

  cargarReciente(item: TraduccionHistorialItem): void {
    this.texto = item.texto_original;
    this.resultado = item.texto_traducido;
    if (item.codigo_idioma_origen) {
      this.origen = item.codigo_idioma_origen;
    }
    if (item.codigo_idioma_destino) {
      this.destino = item.codigo_idioma_destino;
    }
    if (item.contexto) {
      this.dominio = item.contexto;
    }
    this.mensaje.set('Traducción cargada desde el historial.');
    this.esError.set(false);
  }

  intercambiar(): void {
    [this.origen, this.destino] = [this.destino, this.origen];
    if (this.resultado) {
      this.texto = this.resultado;
      this.resultado = '';
    }
    this.actualizarTexto();
  }

  traducir(): void {
    const textoLimpio = this.texto.trim();
    if (!textoLimpio) {
      this.mensaje.set('Por favor ingresa un texto para traducir.');
      this.esError.set(true);
      return;
    }

    if (this.cargando()) {
      return;
    }

    this.cargando.set(true);
    this.mensaje.set('Traduciendo con contexto...');
    this.esError.set(false);
    this.listaAlternativas.set([]);
    this.explicacionModismos.set(null);

    const solicitud: SolicitudTraduccionContextual = {
      texto: textoLimpio,
      idioma_origen: this.origen,
      idioma_destino: this.destino,
      dominio: this.dominio,
      tono: this.tono,
      variante_regional: this.region,
      contexto_adicional: this.contexto.trim() || undefined,
      mostrar_alternativas: this.alternativas,
      explicar_modismos: this.modismos,
      adaptar_formato_local: this.formatoLocal,
    };

    this.traduccionService.traducir(solicitud).subscribe({
      next: (resp) => {
        this.cargando.set(false);
        if (resp && resp.resultado) {
          this.resultado = resp.resultado.texto_traducido;
          this.listaAlternativas.set(resp.resultado.alternativas || []);
          this.explicacionModismos.set(resp.resultado.explicacion_modismos || null);
          this.mensaje.set('Traducción completada con éxito.');
          this.esError.set(false);
          this.cargarHistorial();
        }
      },
      error: (err) => {
        this.cargando.set(false);
        this.esError.set(true);
        const detalle =
          err.error?.mensaje ||
          err.error?.detail ||
          'No se pudo completar la traducción. Verifica que el servidor esté activo.';
        this.mensaje.set(detalle);
      },
    });
  }

  seleccionarAlternativa(alt: string): void {
    this.resultado = alt;
    this.mensaje.set('Alternativa seleccionada.');
  }

  async copiar(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.resultado);
      this.mensaje.set('Traducción copiada.');
      this.esError.set(false);
    } catch {
      this.mensaje.set('No se pudo copiar. Selecciona el texto y cópialo manualmente.');
      this.esError.set(true);
    }
  }

  escuchar(): void {
    if (!('speechSynthesis' in window)) {
      this.mensaje.set('Tu navegador no permite leer el texto en voz alta.');
      this.esError.set(true);
      return;
    }
    window.speechSynthesis.cancel();
    const voz = new SpeechSynthesisUtterance(this.resultado);
    voz.lang = this.destino;
    window.speechSynthesis.speak(voz);
  }
}
