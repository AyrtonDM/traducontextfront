import { Injectable, signal } from '@angular/core';

/**
 * Captura del audio de una reunion de Meet o Zoom (HU-37) desde el navegador.
 *
 * El usuario elige la pestaña de la reunion (o la pantalla completa) con "Compartir audio" mediante
 * getDisplayMedia. El audio se graba en fragmentos independientes (cada uno es un archivo webm
 * completo, porque se reinicia el MediaRecorder) y se entregan a `alFragmento`. Los fragmentos sin
 * sonido no se entregan, para no transcribir silencio.
 *
 * Nunca captura nada hasta que se llama a `conectar` (requiere el permiso del navegador) y `grabar`.
 */

export type ErrorCaptura =
  | 'sin_soporte'        // el navegador no permite capturar pantalla con audio
  | 'cancelada'          // el usuario cerro el selector o nego el permiso
  | 'sin_audio'          // se compartio sin marcar "Compartir audio"
  | 'conexion_perdida'   // se dejo de compartir o se cerro la pestaña de la reunion
  | 'desconocido';

export interface OpcionesCaptura {
  alFragmento: (audio: Blob) => void;
  alError: (error: ErrorCaptura) => void;
}

/** Duracion de cada fragmento: equilibrio entre latencia de los subtitulos y calidad de la transcripcion */
const DURACION_FRAGMENTO_MS = 7000;
/** Nivel RMS (0-1) por debajo del cual un fragmento se considera silencio */
const UMBRAL_SILENCIO = 0.01;
const TIPOS_PREFERIDOS = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus'];

@Injectable()
export class CapturaAudioService {
  /** Hay una pestaña o pantalla compartida con audio */
  readonly conectada = signal(false);
  /** Se esta grabando (servicio activo) */
  readonly grabando = signal(false);
  /** Nivel de audio aproximado (0-1) para el indicador visual */
  readonly nivel = signal(0);
  /** Nombre de lo que se compartio, si el navegador lo informa */
  readonly origen = signal('');

  private flujo: MediaStream | null = null;
  private flujoAudio: MediaStream | null = null;
  private grabadora: MediaRecorder | null = null;
  private temporizador: ReturnType<typeof setTimeout> | null = null;
  private contextoAudio: AudioContext | null = null;
  private analizador: AnalyserNode | null = null;
  private medidor: ReturnType<typeof setInterval> | null = null;
  private nivelMaximoFragmento = 0;
  private opciones: OpcionesCaptura | null = null;
  private tipoMime = '';

  get soportado(): boolean {
    return (
      typeof navigator !== 'undefined' &&
      !!navigator.mediaDevices?.getDisplayMedia &&
      typeof MediaRecorder !== 'undefined' &&
      TIPOS_PREFERIDOS.some((t) => MediaRecorder.isTypeSupported(t))
    );
  }

  /** Pide al navegador la pestaña de la reunion con su audio. Devuelve un error o null si se conecto. */
  async conectar(opciones: OpcionesCaptura): Promise<ErrorCaptura | null> {
    if (!this.soportado) {
      return 'sin_soporte';
    }
    this.desconectar();
    this.opciones = opciones;
    let flujo: MediaStream;
    try {
      // Chrome exige video para compartir una pestaña; solo se usa el audio
      flujo = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
        // Opciones de Chrome/Edge: ofrecer pestañas y el audio del sistema
        preferCurrentTab: false,
        selfBrowserSurface: 'exclude',
        systemAudio: 'include',
      } as DisplayMediaStreamOptions);
    } catch (error) {
      const nombre = (error as DOMException)?.name;
      return nombre === 'NotAllowedError' || nombre === 'AbortError' ? 'cancelada' : 'desconocido';
    }

    const pistasAudio = flujo.getAudioTracks();
    if (pistasAudio.length === 0) {
      flujo.getTracks().forEach((pista) => pista.stop());
      return 'sin_audio';
    }

    this.flujo = flujo;
    this.flujoAudio = new MediaStream(pistasAudio);
    this.tipoMime = TIPOS_PREFERIDOS.find((t) => MediaRecorder.isTypeSupported(t)) ?? '';
    this.origen.set(flujo.getVideoTracks()[0]?.label ?? pistasAudio[0].label ?? '');
    // Si el usuario deja de compartir o cierra la pestaña, se pierde la conexion con la reunion
    flujo.getTracks().forEach((pista) => pista.addEventListener('ended', () => this.perderConexion()));
    this.iniciarMedidor(this.flujoAudio);
    this.conectada.set(true);
    return null;
  }

  /** Empieza (o reanuda) a grabar fragmentos. Requiere estar conectada. */
  grabar(): void {
    if (!this.flujoAudio || this.grabando()) {
      return;
    }
    this.grabando.set(true);
    this.siguienteFragmento();
  }

  /** Deja de grabar (pausa). La pestaña sigue compartida para poder reanudar sin volver a elegirla. */
  detenerGrabacion(): void {
    this.grabando.set(false);
    this.limpiarTemporizador();
    if (this.grabadora && this.grabadora.state !== 'inactive') {
      // El fragmento en curso se entrega al detenerse (onstop)
      this.grabadora.stop();
    }
  }

  /** Detiene todo y deja de compartir la pestaña */
  desconectar(): void {
    this.detenerGrabacion();
    this.grabadora = null;
    this.flujo?.getTracks().forEach((pista) => pista.stop());
    this.flujo = null;
    this.flujoAudio = null;
    if (this.medidor) {
      clearInterval(this.medidor);
      this.medidor = null;
    }
    void this.contextoAudio?.close().catch(() => undefined);
    this.contextoAudio = null;
    this.analizador = null;
    this.nivel.set(0);
    this.conectada.set(false);
    this.origen.set('');
  }

  private siguienteFragmento(): void {
    if (!this.flujoAudio || !this.grabando()) {
      return;
    }
    const partes: Blob[] = [];
    const grabadora = new MediaRecorder(this.flujoAudio, this.tipoMime ? { mimeType: this.tipoMime } : undefined);
    this.grabadora = grabadora;
    this.nivelMaximoFragmento = 0;
    grabadora.ondataavailable = (evento) => {
      if (evento.data.size > 0) {
        partes.push(evento.data);
      }
    };
    grabadora.onstop = () => {
      // Sin medidor no se puede detectar silencio: se envian todos los fragmentos
      const conSonido = !this.analizador || this.nivelMaximoFragmento >= UMBRAL_SILENCIO;
      if (partes.length && conSonido) {
        this.opciones?.alFragmento(new Blob(partes, { type: grabadora.mimeType || this.tipoMime || 'audio/webm' }));
      }
      // Encadena el siguiente fragmento mientras siga activo
      if (this.grabando() && this.flujoAudio) {
        this.siguienteFragmento();
      }
    };
    grabadora.onerror = () => this.opciones?.alError('desconocido');
    grabadora.start();
    this.temporizador = setTimeout(() => {
      if (grabadora.state !== 'inactive') {
        grabadora.stop();
      }
    }, DURACION_FRAGMENTO_MS);
  }

  private iniciarMedidor(flujo: MediaStream): void {
    try {
      this.contextoAudio = new AudioContext();
      this.analizador = this.contextoAudio.createAnalyser();
      this.analizador.fftSize = 1024;
      this.contextoAudio.createMediaStreamSource(flujo).connect(this.analizador);
      const muestras = new Float32Array(this.analizador.fftSize);
      this.medidor = setInterval(() => {
        if (!this.analizador) {
          return;
        }
        this.analizador.getFloatTimeDomainData(muestras);
        let suma = 0;
        for (const valor of muestras) {
          suma += valor * valor;
        }
        const rms = Math.sqrt(suma / muestras.length);
        this.nivel.set(Math.min(1, rms * 8));
        if (this.grabando()) {
          this.nivelMaximoFragmento = Math.max(this.nivelMaximoFragmento, rms);
        }
      }, 150);
    } catch {
      // Sin medidor (onstop lo tiene en cuenta) se envian todos los fragmentos
      this.analizador = null;
    }
  }

  private perderConexion(): void {
    if (!this.conectada()) {
      return;
    }
    this.desconectar();
    this.opciones?.alError('conexion_perdida');
  }

  private limpiarTemporizador(): void {
    if (this.temporizador) {
      clearTimeout(this.temporizador);
      this.temporizador = null;
    }
  }
}
