import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { DocumentosService } from '../../../core/services/documentos.service';
import { TraduccionService } from '../../../core/services/traduccion.service';
import {
  DocumentoCargado,
  DocumentoTraducido,
  TraducirDocumentoSolicitud,
} from '../../../core/models/documentos.model';
import {
  ContextoItem,
  GuardarConfiguracionSolicitud,
  Idioma,
  TonoItem,
  VarianteRegionalItem,
} from '../../../core/models/traduccion.model';

@Component({
  selector: 'app-documentos',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './documentos.html',
  styleUrl: './documentos.css',
})
export class Documentos implements OnInit {
  private readonly documentosService = inject(DocumentosService);
  private readonly traduccionService = inject(TraduccionService);

  // Listas de datos
  readonly documentosCargados = signal<DocumentoCargado[]>([]);
  readonly documentosTraducidos = signal<DocumentoTraducido[]>([]);
  readonly idiomas = signal<Idioma[]>([]);
  readonly contextos = signal<ContextoItem[]>([]);
  readonly tonos = signal<TonoItem[]>([]);
  readonly variantes = signal<VarianteRegionalItem[]>([]);

  // Estados de carga e interfaz
  readonly cargandoCargados = signal(false);
  readonly cargandoTraducidos = signal(false);
  readonly subiendo = signal(false);
  readonly isDragging = signal(false);
  ayuda = false;
  readonly mensaje = signal<string | null>(null);
  readonly tipoMensaje = signal<'exito' | 'error' | 'info'>('info');

  // Configuración de traducción
  idContextoSeleccionado: number | null = null;
  idTonoSeleccionado: number | null = null;
  idVarianteSeleccionada: number | null = null;
  readonly guardandoConfiguracion = signal(false);
  configuracionGuardada: {
    id_contexto: number;
    id_tono: number;
    id_variante_regional: number | null;
  } | null = null;

  // Modal nuevo contexto
  readonly modalNuevoContextoAbierto = signal(false);
  nombreNuevoContexto = '';
  descripcionNuevoContexto = '';
  readonly guardandoContexto = signal(false);
  readonly errorModal = signal('');

  ngOnInit(): void {
    this.cargarDocumentosCargados();
    this.cargarDocumentosTraducidos();
    this.cargarIdiomas();
    this.cargarContextos();
    this.cargarTonos();
    this.cargarVariantes();
    this.cargarConfiguracionGuardada();
  }

  get variantesDisponibles(): VarianteRegionalItem[] {
    return this.variantes().filter(v => v.activo !== false);
  }

  get hayCambiosEnConfiguracion(): boolean {
    if (!this.idContextoSeleccionado || !this.idTonoSeleccionado) {
      return false;
    }

    if (!this.configuracionGuardada) {
      return true;
    }

    const mismoContexto = this.idContextoSeleccionado === this.configuracionGuardada.id_contexto;
    const mismoTono = this.idTonoSeleccionado === this.configuracionGuardada.id_tono;
    const mismaVariante = (this.idVarianteSeleccionada ?? null) === (this.configuracionGuardada.id_variante_regional ?? null);

    return !(mismoContexto && mismoTono && mismaVariante);
  }

  get todosCargadosSeleccionados(): boolean {
    const lista = this.documentosCargados();
    return lista.length > 0 && lista.every(d => d.seleccionado);
  }

  get todosTraducidosSeleccionados(): boolean {
    const lista = this.documentosTraducidos();
    return lista.length > 0 && lista.every(d => d.seleccionado);
  }

  toggleTodosCargados(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.documentosCargados.update(lista =>
      lista.map(d => ({ ...d, seleccionado: checked }))
    );
  }

  toggleTodosTraducidos(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.documentosTraducidos.update(lista =>
      lista.map(d => ({ ...d, seleccionado: checked }))
    );
  }

  // Cargas iniciales
  cargarDocumentosCargados(): void {
    this.cargandoCargados.set(true);
    this.documentosService.obtenerDocumentosCargados().subscribe({
      next: (resp) => {
        this.cargandoCargados.set(false);
        const lista = (resp.resultado || []).map(doc => ({
          ...doc,
          seleccionado: false,
          idioma_origen_seleccionado: doc.codigo_idioma_origen || 'es',
          idioma_destino_seleccionado: 'en',
          traduciendo: false,
        }));
        this.documentosCargados.set(lista);
      },
      error: (err) => {
        this.cargandoCargados.set(false);
        console.error('Error al cargar documentos subidos:', err);
      }
    });
  }

  cargarDocumentosTraducidos(): void {
    this.cargandoTraducidos.set(true);
    this.documentosService.obtenerDocumentosTraducidos().subscribe({
      next: (resp) => {
        this.cargandoTraducidos.set(false);
        const lista = (resp.resultado || []).map(doc => ({
          ...doc,
          seleccionado: false,
          descargando: false,
        }));
        this.documentosTraducidos.set(lista);
      },
      error: (err) => {
        this.cargandoTraducidos.set(false);
        console.error('Error al cargar documentos traducidos:', err);
      }
    });
  }

  private cargarIdiomas(): void {
    this.traduccionService.obtenerIdiomas().subscribe({
      next: (resp) => {
        this.idiomas.set(resp.resultado || []);
      },
      error: (err) => console.error('Error al cargar idiomas:', err)
    });
  }

  private cargarContextos(): void {
    this.traduccionService.obtenerContextos().subscribe({
      next: (resp) => {
        const lista = resp.resultado || [];
        this.contextos.set(lista);
        if (lista.length > 0 && !this.idContextoSeleccionado) {
          this.idContextoSeleccionado = lista[0].id_contexto;
        }
      },
      error: (err) => console.error('Error al cargar contextos:', err)
    });
  }

  private cargarTonos(): void {
    this.traduccionService.obtenerTonos().subscribe({
      next: (resp) => {
        const lista = resp.resultado || [];
        this.tonos.set(lista);
        if (lista.length > 0 && !this.idTonoSeleccionado) {
          this.idTonoSeleccionado = lista[0].id_tono;
        }
      },
      error: (err) => console.error('Error al cargar tonos:', err)
    });
  }

  private cargarVariantes(): void {
    this.traduccionService.obtenerVariantesRegionales().subscribe({
      next: (resp) => {
        this.variantes.set(resp.resultado || []);
      },
      error: (err) => console.error('Error al cargar variantes regionales:', err)
    });
  }

  private cargarConfiguracionGuardada(): void {
    this.traduccionService.obtenerConfiguracion().subscribe({
      next: (resp) => {
        if (resp?.resultado) {
          const res = resp.resultado;
          this.idContextoSeleccionado = res.id_contexto;
          this.idTonoSeleccionado = res.id_tono ?? null;
          this.idVarianteSeleccionada = res.id_variante_regional ?? null;
          this.configuracionGuardada = {
            id_contexto: res.id_contexto,
            id_tono: res.id_tono!,
            id_variante_regional: res.id_variante_regional ?? null,
          };
        }
      },
      error: () => {
        this.configuracionGuardada = null;
      }
    });
  }

  guardarConfiguracion(): void {
    if (!this.idContextoSeleccionado) {
      this.mostrarMensaje('Por favor, selecciona un contexto.', 'error');
      return;
    }
    if (!this.idTonoSeleccionado) {
      this.mostrarMensaje('Por favor, selecciona un tono.', 'error');
      return;
    }

    this.guardandoConfiguracion.set(true);

    const payload: GuardarConfiguracionSolicitud = {
      id_contexto: this.idContextoSeleccionado,
      id_tono: this.idTonoSeleccionado,
      id_variante_regional: this.idVarianteSeleccionada !== null ? this.idVarianteSeleccionada : null,
      explicar_expresiones: false,
      generar_alternativas: false,
    };

    this.traduccionService.guardarConfiguracion(payload).subscribe({
      next: (respuesta) => {
        this.guardandoConfiguracion.set(false);
        this.mostrarMensaje(respuesta.mensaje || 'Configuración guardada correctamente.', 'exito');

        this.configuracionGuardada = {
          id_contexto: this.idContextoSeleccionado!,
          id_tono: this.idTonoSeleccionado!,
          id_variante_regional: this.idVarianteSeleccionada !== null ? this.idVarianteSeleccionada : null,
        };
      },
      error: (error) => {
        this.guardandoConfiguracion.set(false);
        console.error('Error al guardar configuración:', error);
        const detalle = error?.error?.detail || error?.error?.mensaje || 'No se pudo guardar la configuración.';
        this.mostrarMensaje(detalle, 'error');
      }
    });
  }

  // Manejo de Drag & Drop y Subida de Archivos
  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(true);
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.validarYSubir(files[0]);
    }
  }

  onArchivoSeleccionado(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.validarYSubir(input.files[0]);
      input.value = '';
    }
  }

  private validarYSubir(file: File): void {
    const nombre = file.name.toLowerCase();
    const esValido = nombre.endsWith('.pdf') || nombre.endsWith('.doc') || nombre.endsWith('.docx');

    if (!esValido) {
      this.mostrarMensaje('Formato no permitido. Solo se aceptan archivos PDF y Word (.doc, .docx).', 'error');
      return;
    }

    const maxBytes = 20 * 1024 * 1024;
    if (file.size > maxBytes) {
      this.mostrarMensaje('El tamaño del archivo supera el límite permitido de 20 MB.', 'error');
      return;
    }

    this.subiendo.set(true);
    this.documentosService.subirDocumento(file).subscribe({
      next: (resp) => {
        this.subiendo.set(false);
        this.mostrarMensaje(resp.mensaje || 'Documento subido y registrado correctamente.', 'exito');
        this.cargarDocumentosCargados();
      },
      error: (err) => {
        this.subiendo.set(false);
        console.error('Error al subir documento:', err);
        const detalle = err?.error?.detail || err?.error?.mensaje || 'Error al subir el documento.';
        this.mostrarMensaje(detalle, 'error');
      }
    });
  }

  // Traducción de documentos
  traducirDocumento(doc: DocumentoCargado): void {
    if (doc.traduciendo) return;
    doc.traduciendo = true;

    const idiomaDestino = doc.idioma_destino_seleccionado || 'en';
    const idiomaOrigen = doc.idioma_origen_seleccionado || doc.codigo_idioma_origen || 'es';

    const solicitud: TraducirDocumentoSolicitud = {
      id_documento: doc.id_documento,
      idioma_destino: idiomaDestino,
      idioma_origen: idiomaOrigen,
    };

    this.documentosService.traducirDocumento(solicitud).subscribe({
      next: (resp) => {
        doc.traduciendo = false;
        this.mostrarMensaje(resp.mensaje || 'Documento traducido correctamente.', 'exito');
        this.cargarDocumentosTraducidos();
      },
      error: (err) => {
        doc.traduciendo = false;
        console.error('Error al traducir documento:', err);
        const detalle = err?.error?.detail || err?.error?.mensaje || 'Error al traducir el documento.';
        this.mostrarMensaje(detalle, 'error');
      }
    });
  }

  // Descarga de documentos traducidos
  descargarDocumento(doc: DocumentoTraducido): void {
    if (doc.descargando) return;
    doc.descargando = true;

    const url = this.documentosService.obtenerUrlDescarga(doc);

    this.documentosService.descargarArchivo(url).subscribe({
      next: (blob) => {
        doc.descargando = false;
        const blobUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = doc.nombre || 'documento_traducido';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(blobUrl);
        this.mostrarMensaje('Descarga iniciada con éxito.', 'exito');
      },
      error: (err) => {
        doc.descargando = false;
        console.warn('Descarga por blob no disponible, abriendo enlace directo:', err);
        window.open(url, '_blank');
      }
    });
  }

  // Acciones de eliminación con backend
  eliminarDocumentoCargado(doc: DocumentoCargado): void {
    if (doc.eliminando) return;
    doc.eliminando = true;

    this.documentosService.eliminarDocumentoCargado(doc.id_documento).subscribe({
      next: (resp) => {
        doc.eliminando = false;
        this.mostrarMensaje(resp.mensaje || 'Documento original y sus archivos físicos eliminados correctamente.', 'exito');
        this.documentosCargados.update(lista =>
          lista.filter(d => d.id_documento !== doc.id_documento)
        );
      },
      error: (err) => {
        doc.eliminando = false;
        console.error('Error al eliminar documento cargado:', err);
        const detalle = err?.error?.detail || err?.error?.mensaje || 'Error al eliminar el documento.';
        this.mostrarMensaje(detalle, 'error');
      }
    });
  }

  eliminarDocumentoTraducido(doc: DocumentoTraducido): void {
    if (doc.eliminando) return;
    doc.eliminando = true;

    this.documentosService.eliminarDocumentoTraducido(doc.id_traduccion_documento).subscribe({
      next: (resp) => {
        doc.eliminando = false;
        this.mostrarMensaje(resp.mensaje || 'Documento traducido y su archivo físico eliminados correctamente.', 'exito');
        this.documentosTraducidos.update(lista =>
          lista.filter(d => d.id_traduccion_documento !== doc.id_traduccion_documento)
        );
      },
      error: (err) => {
        doc.eliminando = false;
        console.error('Error al eliminar documento traducido:', err);
        const detalle = err?.error?.detail || err?.error?.mensaje || 'Error al eliminar el documento traducido.';
        this.mostrarMensaje(detalle, 'error');
      }
    });
  }

  // Modal Nuevo Contexto
  onContextoChange(valor: any): void {
    if (valor === 'NUEVO') {
      this.abrirModalNuevoContexto();
      return;
    }
    this.idContextoSeleccionado = valor;
  }

  abrirModalNuevoContexto(): void {
    this.nombreNuevoContexto = '';
    this.descripcionNuevoContexto = '';
    this.errorModal.set('');
    this.guardandoContexto.set(false);
    this.modalNuevoContextoAbierto.set(true);
  }

  cancelarModalContexto(): void {
    this.modalNuevoContextoAbierto.set(false);
    const lista = this.contextos();
    if (lista.length > 0) {
      this.idContextoSeleccionado = lista[0].id_contexto;
    } else {
      this.idContextoSeleccionado = null;
    }
  }

  guardarModalContexto(): void {
    const nombre = this.nombreNuevoContexto.trim();
    const descripcion = this.descripcionNuevoContexto.trim();

    if (!nombre) {
      this.errorModal.set('El nombre del contexto es obligatorio.');
      return;
    }
    if (!descripcion) {
      this.errorModal.set('La descripción del contexto es obligatoria.');
      return;
    }

    this.guardandoContexto.set(true);
    this.errorModal.set('');

    this.traduccionService.crearContexto({ nombre, descripcion }).subscribe({
      next: (resp) => {
        this.guardandoContexto.set(false);
        this.modalNuevoContextoAbierto.set(false);
        this.mostrarMensaje(resp.mensaje || 'Contexto creado correctamente.', 'exito');
        this.traduccionService.obtenerContextos().subscribe({
          next: (cResp) => {
            const lista = cResp.resultado || [];
            this.contextos.set(lista);
            const nuevo = lista.find(c => c.nombre.toLowerCase() === nombre.toLowerCase());
            this.idContextoSeleccionado = nuevo ? nuevo.id_contexto : (lista[0]?.id_contexto ?? null);
          }
        });
      },
      error: (err) => {
        this.guardandoContexto.set(false);
        this.errorModal.set(err?.error?.detail || err?.error?.mensaje || 'No se pudo crear el contexto.');
      }
    });
  }

  // Métodos auxiliares de formato y tipos
  esWord(extension?: string, nombre?: string): boolean {
    const ext = (extension || (nombre ? nombre.split('.').pop() : '') || '').toLowerCase();
    return ext === 'doc' || ext === 'docx';
  }

  esPdf(extension?: string, nombre?: string): boolean {
    const ext = (extension || (nombre ? nombre.split('.').pop() : '') || '').toLowerCase();
    return ext === 'pdf';
  }

  obtenerTipoDocumento(extension?: string, nombre?: string): string {
    if (this.esWord(extension, nombre)) return 'Word';
    if (this.esPdf(extension, nombre)) return 'PDF';
    const ext = (extension || (nombre ? nombre.split('.').pop() : '') || '').toUpperCase();
    return ext || 'Doc';
  }

  formatearTamano(bytes: number | string): string {
    if (typeof bytes === 'string') {
      if (bytes.includes('KB') || bytes.includes('MB') || bytes.includes('B')) {
        return bytes;
      }
      bytes = parseFloat(bytes);
    }
    if (!bytes || isNaN(bytes)) return '0 KB';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  formatearFecha(fechaStr: string): string {
    if (!fechaStr) return '';
    const d = new Date(fechaStr);
    if (isNaN(d.getTime())) return fechaStr;

    const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    const dia = d.getDate();
    const mes = meses[d.getMonth()];
    const anio = d.getFullYear();
    const horas = d.getHours().toString().padStart(2, '0');
    const minutos = d.getMinutes().toString().padStart(2, '0');

    return `${dia} ${mes} ${anio} - ${horas}:${minutos}`;
  }

  mostrarMensaje(texto: string, tipo: 'exito' | 'error' | 'info' = 'info'): void {
    this.mensaje.set(texto);
    this.tipoMensaje.set(tipo);
    setTimeout(() => {
      if (this.mensaje() === texto) {
        this.mensaje.set(null);
      }
    }, 6000);
  }
}
