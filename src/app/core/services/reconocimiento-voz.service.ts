import { Injectable, signal } from '@angular/core';

/** Motivo por el que no se puede reconocer el habla (HU-25) */
export type ErrorReconocimiento =
  | 'sin_soporte'          // el navegador no tiene SpeechRecognition
  | 'sin_permiso'          // el usuario o el sistema denegaron el microfono
  | 'sin_microfono'        // no hay un microfono disponible
  | 'sin_conexion'         // el servicio de reconocimiento no es accesible
  | 'sin_voz'              // no se detecto habla (no detiene la captura)
  | 'no_reconocido'        // hubo habla pero no se entendio (no detiene la captura)
  | 'sin_audio'            // la captura se corta una y otra vez sin recibir sonido
  | 'idioma_no_soportado'
  | 'desconocido';

/** Fase de la captura, para indicar al usuario si de verdad se le esta escuchando */
export type EstadoAudio = 'inactivo' | 'esperando' | 'audio' | 'voz';

export interface OyentesReconocimiento {
  /** Fragmento final reconocido (ya sin espacios sobrantes) */
  alFinal: (texto: string) => void;
  /** `codigo` es el error original del navegador, util para mensajes de errores no previstos */
  alError: (error: ErrorReconocimiento, codigo?: string) => void;
  /** Se llama con cada resultado (parcial o final) */
  alResultado?: () => void;
}

/** Subconjunto de la Web Speech API que se usa (no todos los navegadores la tipan en lib.dom) */
interface ResultadoVozNavegador {
  readonly isFinal: boolean;
  readonly 0: { transcript: string };
}
interface EventoResultadoVoz {
  readonly resultIndex: number;
  readonly results: ArrayLike<ResultadoVozNavegador>;
}
interface ReconocedorNavegador {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onstart: (() => void) | null;
  onaudiostart: (() => void) | null;
  onaudioend: (() => void) | null;
  onsoundstart: (() => void) | null;
  onspeechstart: (() => void) | null;
  onresult: ((evento: EventoResultadoVoz) => void) | null;
  onnomatch: (() => void) | null;
  onerror: ((evento: { error: string; message?: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  abort(): void;
}
type ConstructorReconocedor = new () => ReconocedorNavegador;

/** Codigos de error del navegador. `null`: no es un error para el usuario. */
const ERRORES_NAVEGADOR: Record<string, ErrorReconocimiento | null> = {
  'not-allowed': 'sin_permiso',
  'service-not-allowed': 'sin_permiso',
  'audio-capture': 'sin_microfono',
  network: 'sin_conexion',
  'no-speech': 'sin_voz',
  'language-not-supported': 'idioma_no_soportado',
  aborted: null, // lo provoca detener() o un reinicio
};

/** Errores tras los que se sigue escuchando */
const ERRORES_LEVES: ReadonlySet<ErrorReconocimiento> = new Set(['sin_voz', 'no_reconocido']);

/**
 * El reconocimiento necesita la region (es-ES, en-US...): con el codigo base ('es') algunos
 * navegadores no devuelven resultados. Se usa la region del navegador si coincide con el idioma.
 */
const REGION_POR_IDIOMA: Record<string, string> = {
  es: 'es-ES',
  en: 'en-US',
  fr: 'fr-FR',
  de: 'de-DE',
  it: 'it-IT',
  pt: 'pt-BR',
  ja: 'ja-JP',
  zh: 'zh-CN',
  ko: 'ko-KR',
  ru: 'ru-RU',
  ar: 'ar-SA',
  hi: 'hi-IN',
};

/** Reinicios seguidos sin sonido dentro de esta ventana: la captura no funciona y se detiene */
const MAXIMO_REINICIOS_SIN_SONIDO = 3;
const VENTANA_REINICIOS_MS = 10000;

/**
 * Transcripcion en tiempo real con el reconocimiento de voz del navegador (HU-25).
 * Emite resultados parciales en `textoParcial` y los finales por `alFinal`.
 * El navegador corta la captura tras un silencio: mientras el usuario no la detenga, se reinicia.
 */
@Injectable({
  providedIn: 'root'
})
export class ReconocimientoVozService {
  /** true mientras el microfono esta capturando */
  readonly escuchando = signal(false);
  /** Texto provisional de la frase en curso */
  readonly textoParcial = signal('');
  readonly estadoAudio = signal<EstadoAudio>('inactivo');
  /** Idioma con region con el que se esta reconociendo (ej. 'es-ES') */
  readonly idiomaActivo = signal('');

  private reconocedor: ReconocedorNavegador | null = null;
  private oyentes: OyentesReconocimiento | null = null;
  private reiniciosSinSonido: number[] = [];

  get soportado(): boolean {
    return this.constructorNavegador() !== null;
  }

  /**
   * Empieza a escuchar en el idioma indicado (codigo como 'es' o 'en-US').
   * Si ya se estaba escuchando, se reinicia con el nuevo idioma. Devuelve un error si no puede empezar.
   */
  iniciar(idioma: string, oyentes: OyentesReconocimiento): ErrorReconocimiento | null {
    const Reconocedor = this.constructorNavegador();
    if (!Reconocedor) {
      return 'sin_soporte';
    }
    const lang = this.resolverIdioma(idioma);
    if (!lang) {
      return 'idioma_no_soportado';
    }
    this.detener();

    const reconocedor = new Reconocedor();
    reconocedor.lang = lang;
    reconocedor.continuous = true;
    reconocedor.interimResults = true;
    reconocedor.maxAlternatives = 1;

    reconocedor.onstart = () => {
      console.debug('[voz] onstart', { lang });
      this.escuchando.set(true);
      this.estadoAudio.set('esperando');
    };
    reconocedor.onaudiostart = () => {
      console.debug('[voz] onaudiostart');
      this.estadoAudio.set('audio');
    };
    reconocedor.onaudioend = () => console.debug('[voz] onaudioend');
    reconocedor.onsoundstart = () => {
      console.debug('[voz] onsoundstart');
      this.reiniciosSinSonido = [];
    };
    reconocedor.onspeechstart = () => {
      console.debug('[voz] onspeechstart');
      this.estadoAudio.set('voz');
    };
    reconocedor.onresult = (evento) => this.procesarResultado(evento);
    reconocedor.onnomatch = () => {
      console.debug('[voz] onnomatch');
      this.oyentes?.alError('no_reconocido');
    };
    reconocedor.onerror = (evento) => {
      console.debug('[voz] onerror', { error: evento.error, message: evento.message });
      const error = evento.error in ERRORES_NAVEGADOR ? ERRORES_NAVEGADOR[evento.error] : 'desconocido';
      if (error === null) {
        return;
      }
      const avisar = this.oyentes?.alError;
      if (!ERRORES_LEVES.has(error)) {
        this.detener(); // error grave: no se reinicia
      }
      avisar?.(error, evento.error);
    };
    reconocedor.onend = () => {
      console.debug('[voz] onend');
      // Solo el reconocedor vigente reinicia (detener() desconecta los anteriores)
      if (this.reconocedor !== reconocedor) {
        return;
      }
      this.textoParcial.set('');
      this.estadoAudio.set('esperando');
      if (this.demasiadosReinicios()) {
        const avisar = this.oyentes?.alError;
        this.detener();
        avisar?.('sin_audio');
        return;
      }
      try {
        reconocedor.start();
      } catch (error) {
        console.debug('[voz] no se pudo reiniciar', error);
        const avisar = this.oyentes?.alError;
        this.detener();
        avisar?.('desconocido');
      }
    };

    this.reconocedor = reconocedor;
    this.oyentes = oyentes;
    this.reiniciosSinSonido = [];
    this.idiomaActivo.set(lang);
    try {
      reconocedor.start();
    } catch (error) {
      console.debug('[voz] no se pudo iniciar', error);
      this.detener();
      return 'desconocido';
    }
    return null;
  }

  detener(): void {
    const reconocedor = this.reconocedor;
    this.reconocedor = null;
    this.oyentes = null;
    if (reconocedor) {
      reconocedor.onstart = reconocedor.onaudiostart = reconocedor.onaudioend = null;
      reconocedor.onsoundstart = reconocedor.onspeechstart = reconocedor.onnomatch = null;
      reconocedor.onresult = reconocedor.onerror = reconocedor.onend = null;
      try {
        reconocedor.abort();
      } catch {
        // ya estaba detenido
      }
    }
    this.escuchando.set(false);
    this.textoParcial.set('');
    this.estadoAudio.set('inactivo');
    this.idiomaActivo.set('');
  }

  private procesarResultado(evento: EventoResultadoVoz): void {
    this.reiniciosSinSonido = [];
    let parcial = '';
    const finales: string[] = [];
    for (let i = evento.resultIndex; i < evento.results.length; i++) {
      const resultado = evento.results[i];
      const texto = resultado[0]?.transcript ?? '';
      if (resultado.isFinal) {
        const limpio = texto.trim();
        if (limpio) {
          finales.push(limpio);
        }
      } else {
        parcial += texto;
      }
    }
    console.debug('[voz] onresult', { parcial: parcial.trim(), finales });
    this.textoParcial.set(parcial.trim());
    this.oyentes?.alResultado?.();
    finales.forEach((texto) => this.oyentes?.alFinal(texto));
  }

  /** Registra un fin de captura sin sonido y dice si ya van demasiados seguidos */
  private demasiadosReinicios(): boolean {
    const ahora = Date.now();
    this.reiniciosSinSonido = [...this.reiniciosSinSonido, ahora].filter((t) => ahora - t < VENTANA_REINICIOS_MS);
    return this.reiniciosSinSonido.length > MAXIMO_REINICIOS_SIN_SONIDO;
  }

  /** 'es' → región del navegador si coincide (es-MX) o la de la tabla (es-ES); un codigo con region se respeta */
  private resolverIdioma(codigo: string): string {
    const limpio = (codigo || '').trim().replace('_', '-');
    if (!limpio) {
      return '';
    }
    if (limpio.includes('-')) {
      return limpio;
    }
    const base = limpio.toLowerCase();
    const delNavegador = typeof navigator !== 'undefined'
      ? navigator.languages?.find((l) => l.includes('-') && l.toLowerCase().split('-')[0] === base)
      : undefined;
    return delNavegador ?? REGION_POR_IDIOMA[base] ?? base;
  }

  private constructorNavegador(): ConstructorReconocedor | null {
    if (typeof window === 'undefined') {
      return null;
    }
    const ventana = window as unknown as {
      SpeechRecognition?: ConstructorReconocedor;
      webkitSpeechRecognition?: ConstructorReconocedor;
    };
    return ventana.SpeechRecognition ?? ventana.webkitSpeechRecognition ?? null;
  }
}
