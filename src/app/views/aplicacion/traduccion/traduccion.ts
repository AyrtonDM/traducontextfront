import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import {
  EjemploTraduccion,
  Idioma,
  ResultadoDeteccionIdioma,
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
export class Traduccion implements OnInit, OnDestroy {
  private readonly traduccionService = inject(TraduccionService);
  private readonly textoSubject = new Subject<string>();
  private textoSub?: Subscription;
  private recognition: any = null;
  private _cambioProgramatico = false;

  texto = '';
  resultado = '';
  origen = 'auto';
  idiomasBase: import('../../../core/models/traduccion.model').Idioma[] = [];
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
  deteccionActiva = false;

  readonly cargando = signal(false);
  readonly dictando = signal(false);
  readonly detectandoIdioma = signal(false);
  readonly idiomaDetectado = signal<ResultadoDeteccionIdioma | null>(null);
  readonly mensaje = signal('');
  readonly esError = signal(false);
  readonly listaAlternativas = signal<string[]>([]);
  readonly explicacionModismos = signal<string | null>(null);

  idiomas: Idioma[] = [
    { id: 1, codigo: 'es', nombre: 'Español' },
    { id: 2, codigo: 'en', nombre: 'Inglés' },
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

    // Detección automática de idioma al escribir (con debounce)
    this.textoSub = this.textoSubject
      .pipe(
        debounceTime(350),
        distinctUntilChanged()
      )
      .subscribe((texto) => {
        this.ejecutarDeteccion(texto);
      });
  }

  ngOnDestroy(): void {
    this.textoSub?.unsubscribe();
    this.detenerDictado();
  }

  cargarHistorial(): void {
    this.traduccionService.obtenerRecientes().subscribe({
      next: (resp) => {
        if (resp && resp.resultado) {
          this.recientes = resp.resultado;
        }
      },
      error: () => {},
    });
  }

  cargarIdiomasBackend(): void {
    this.traduccionService.obtenerIdiomas().subscribe({
      next: (resp) => {
        if (resp && resp.resultado && resp.resultado.length > 0) {
          this.idiomas = resp.resultado;
          this.idiomasBase = [...resp.resultado];
        }
      },
      error: () => {},
    });
  }

  onTextoChange(nuevoTexto: string): void {
    this.texto = nuevoTexto;
    this.actualizarTexto();
    this.textoSubject.next(nuevoTexto);
  }

  onOrigenChange(nuevoCodigo: string): void {
    // Ignorar cambios programáticos (ej: cuando la detección automática asigna el idioma)
    if (this._cambioProgramatico) {
      return;
    }
    // El usuario cambió manualmente el idioma de origen
    // Desactivar detección automática para respetar la selección manual
    this.deteccionActiva = false;
    this.actualizarTexto();
  }

  limpiar(): void {
    this.texto = '';
    this.idiomaDetectado.set(null);
    this.deteccionActiva = false;
    this.origen = 'auto';
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

  ejecutarDeteccion(texto: string): void {
    const limpio = texto.trim();
    if (limpio.length < 3) {
      this.idiomaDetectado.set(null);
      if (this.deteccionActiva) {
        // Solo resetear a 'auto' si veníamos de detección automática
        this.origen = 'auto';
        this.deteccionActiva = false;
      }
      return;
    }

    this.detectandoIdioma.set(true);
    this.traduccionService.detectarIdioma(limpio).subscribe({
      next: (resp) => {
        this.detectandoIdioma.set(false);
        if (resp && resp.resultado) {
          const codigoDetectado = resp.resultado.codigo;

          // Si el backend no pudo detectar con suficiente confianza, no cambiar el selector
          if (codigoDetectado === 'desconocido' || !codigoDetectado) {
            this.idiomaDetectado.set(null);
            return;
          }

          this.idiomaDetectado.set(resp.resultado);

          // Seleccionar automáticamente el idioma detectado en el selector de origen
          if (this.origen === 'auto' || this.deteccionActiva) {
            this.deteccionActiva = true;

            // Solo seleccionar si el idioma detectado está en la lista de idiomas soportados
            const existeEnLista = this.idiomas.some(i => i.codigo === codigoDetectado);
            if (!existeEnLista) {
              // El idioma no está soportado en el sistema, no cambiar el selector
              return;
            }

            // Si el destino ya es el idioma detectado, elegir otro
            if (this.destino === codigoDetectado) {
              this.destino = codigoDetectado === 'es' ? 'en' : 'es';
            }

            // Forzar cambio en Angular: asignar vacío primero para que detecte el cambio
            this._cambioProgramatico = true;
            this.origen = '';
            setTimeout(() => {
              this.origen = codigoDetectado;
              this._cambioProgramatico = false;
            }, 0);
          }
        }
      },
      error: () => {
        this.detectandoIdioma.set(false);
      },
    });
  }

  cargarEjemplo(texto: string): void {
    this.texto = texto;
    this.origen = 'auto';
    this.deteccionActiva = false; // Resetear para que la deteccion lo cambie al detectado
    this.actualizarTexto();
    this.ejecutarDeteccion(texto);
  }

  cargarReciente(item: TraduccionHistorialItem): void {
    this.texto = item.texto_original;
    this.resultado = item.texto_traducido;
    if (item.codigo_idioma_origen) {
      this.origen = item.codigo_idioma_origen;
      this.deteccionActiva = false; // Idioma ya conocido, no sobrescribir
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
    const idiomaOrigenReal = this.origen === 'auto'
      ? (this.idiomaDetectado()?.codigo || 'es')
      : this.origen;

    this.origen = this.destino;
    this.destino = idiomaOrigenReal;
    // Al intercambiar manualmente, desactivar deteccion automatica
    this.deteccionActiva = false;

    if (this.resultado) {
      this.texto = this.resultado;
      this.resultado = '';
    }
    this.actualizarTexto();
    if (this.texto) {
      this.ejecutarDeteccion(this.texto);
    }
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

    // Resolver idioma de origen si está en 'auto'
    const origenFinal = this.origen === 'auto'
      ? (this.idiomaDetectado()?.codigo || 'en')
      : this.origen;

    const solicitud: SolicitudTraduccionContextual = {
      texto: textoLimpio,
      idioma_origen: origenFinal,
      idioma_destino: this.destino,
      dominio: this.dominio,
      tono: this.tono,
      variante_regional: this.region,
      contexto_adicional: this.dominio === 'Personalizado' ? (this.contexto.trim() || undefined) : undefined,
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

  alternarDictado(): void {
    if (this.dictando()) {
      this.detenerDictado();
    } else {
      this.iniciarDictado();
    }
  }

  iniciarDictado(): void {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      this.mensaje.set(
        'El reconocimiento de voz no está soportado en este navegador. Utiliza Google Chrome o Microsoft Edge.'
      );
      this.esError.set(true);
      return;
    }

    try {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;

      const langMap: Record<string, string> = {
        es: 'es-ES',
        en: 'en-US',
        fr: 'fr-FR',
        pt: 'pt-BR',
        de: 'de-DE',
        it: 'it-IT',
        ja: 'ja-JP',
        zh: 'zh-CN',
        auto: 'es-ES',
      };

      const codigoLang = this.origen === 'auto'
        ? (this.idiomaDetectado()?.codigo || 'es')
        : this.origen;

      this.recognition.lang = langMap[codigoLang] || 'es-ES';

      this.recognition.onstart = () => {
        this.dictando.set(true);
        this.mensaje.set('Escuchando... puedes hablar al micrófono.');
        this.esError.set(false);
      };

      this.recognition.onresult = (event: any) => {
        let transcripcion = '';
        for (let i = 0; i < event.results.length; i++) {
          transcripcion += event.results[i][0].transcript;
        }
        if (transcripcion) {
          this.texto = transcripcion;
          this.onTextoChange(this.texto);
        }
      };

      this.recognition.onerror = (event: any) => {
        this.dictando.set(false);
        if (event.error === 'not-allowed') {
          this.mensaje.set('Acceso al micrófono denegado. Permite el uso del micrófono en tu navegador.');
          this.esError.set(true);
        } else if (event.error !== 'no-speech') {
          this.mensaje.set(`Error en dictado: ${event.error}`);
          this.esError.set(true);
        }
      };

      this.recognition.onend = () => {
        this.dictando.set(false);
      };

      this.recognition.start();
    } catch {
      this.dictando.set(false);
      this.mensaje.set('No se pudo inicializar el micrófono.');
      this.esError.set(true);
    }
  }

  detenerDictado(): void {
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch {}
      this.recognition = null;
    }
    this.dictando.set(false);
    this.mensaje.set('Dictado detenido.');
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
