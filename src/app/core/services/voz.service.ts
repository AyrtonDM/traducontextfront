import { Injectable, signal } from '@angular/core';

/** Resultado de un intento de reproduccion por voz (HU-28) */
export type ResultadoVoz =
  | 'reproduciendo'
  | 'sin_soporte'      // el navegador no tiene speechSynthesis
  | 'sin_voz'          // no hay ninguna voz para el idioma pedido
  | 'deshabilitado'    // el llamador no permite reproducir (p. ej. conversacion pausada o finalizada)
  | 'sin_texto';

/** Tiempo maximo (ms) para esperar a que el navegador cargue sus voces */
const ESPERA_MAXIMA_VOCES_MS = 2000;

@Injectable({
  providedIn: 'root'
})
export class VozService {
  /** true mientras se esta reproduciendo una traduccion */
  readonly reproduciendo = signal(false);

  private voces: SpeechSynthesisVoice[] = [];
  private cargaVoces: Promise<SpeechSynthesisVoice[]> | null = null;
  private enunciadoActual: SpeechSynthesisUtterance | null = null;

  get soportado(): boolean {
    return typeof window !== 'undefined' && 'speechSynthesis' in window;
  }

  /**
   * Reproduce el texto con una voz del idioma indicado (codigo como 'es' o 'en-US').
   * `habilitado` permite al llamador bloquear la reproduccion (sesion pausada o finalizada).
   */
  async reproducir(texto: string, idioma: string, habilitado = true): Promise<ResultadoVoz> {
    if (!habilitado) {
      return 'deshabilitado';
    }
    if (!this.soportado) {
      return 'sin_soporte';
    }
    const contenido = texto?.trim();
    if (!contenido) {
      return 'sin_texto';
    }

    const voz = this.buscarVoz(await this.obtenerVoces(), idioma);
    if (!voz) {
      return 'sin_voz';
    }

    this.detener();
    const enunciado = new SpeechSynthesisUtterance(contenido);
    enunciado.voice = voz;
    enunciado.lang = voz.lang;
    const finalizar = () => {
      // Solo el enunciado vigente cambia el estado (cancel() dispara eventos del anterior)
      if (this.enunciadoActual === enunciado) {
        this.enunciadoActual = null;
        this.reproduciendo.set(false);
      }
    };
    enunciado.onend = finalizar;
    enunciado.onerror = finalizar;

    this.enunciadoActual = enunciado;
    this.reproduciendo.set(true);
    window.speechSynthesis.speak(enunciado);
    return 'reproduciendo';
  }

  detener(): void {
    if (!this.soportado) {
      return;
    }
    this.enunciadoActual = null;
    this.reproduciendo.set(false);
    window.speechSynthesis.cancel();
  }

  /** Las voces se cargan de forma asincrona: se espera al evento 'voiceschanged' (con limite). */
  private obtenerVoces(): Promise<SpeechSynthesisVoice[]> {
    const sintesis = window.speechSynthesis;
    const disponibles = sintesis.getVoices();
    if (disponibles.length > 0) {
      this.voces = disponibles;
      return Promise.resolve(disponibles);
    }
    if (this.voces.length > 0) {
      return Promise.resolve(this.voces);
    }
    if (!this.cargaVoces) {
      this.cargaVoces = new Promise<SpeechSynthesisVoice[]>((resolver) => {
        const terminar = () => {
          sintesis.removeEventListener('voiceschanged', terminar);
          clearTimeout(limite);
          this.voces = sintesis.getVoices();
          this.cargaVoces = null;
          resolver(this.voces);
        };
        const limite = setTimeout(terminar, ESPERA_MAXIMA_VOCES_MS);
        sintesis.addEventListener('voiceschanged', terminar);
      });
    }
    return this.cargaVoces;
  }

  /** Prioriza la coincidencia exacta (es-MX) y luego el idioma base (es); prefiere voces locales. */
  private buscarVoz(voces: SpeechSynthesisVoice[], idioma: string): SpeechSynthesisVoice | null {
    const normalizar = (codigo: string) => (codigo || '').toLowerCase().replace('_', '-');
    const pedido = normalizar(idioma);
    if (!pedido) {
      return null;
    }
    const base = pedido.split('-')[0];
    const ordenar = (lista: SpeechSynthesisVoice[]) =>
      [...lista].sort((a, b) => Number(b.localService) - Number(a.localService));

    const exactas = voces.filter(v => normalizar(v.lang) === pedido);
    if (exactas.length) {
      return ordenar(exactas)[0];
    }
    const mismoIdioma = voces.filter(v => normalizar(v.lang).split('-')[0] === base);
    return mismoIdioma.length ? ordenar(mismoIdioma)[0] : null;
  }
}
