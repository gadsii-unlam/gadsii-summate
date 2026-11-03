/**
 * Controlador de pantalla: une el reductor puro con el historial del navegador, los recientes,
 * la indicación de primer uso y el pedido automático de la ruta (design.md, D5, D6, D8 y D9).
 *
 * Reglas del historial:
 * - Avanzar a otra vista hace `pushState` (`history.state = { dq: 1, vista, profundidad }`).
 * - Volver siempre es `history.back()`: la vista anterior se restaura en `popstate`, así el botón
 *   de la interfaz, el de Android y el gesto de iOS se comportan igual.
 * - `✕` hace `history.go(-profundidad)` hasta el inicio.
 * - La fase "ruta" no tiene entrada propia y cambiar la altura de la hoja no crea entradas.
 */
import { agregarReciente, esListaRecientes, recientesConocidos } from '../../busqueda/index.ts'
import type { Reciente } from '../../busqueda/index.ts'
import { CLAVES, esBooleano, esTexto } from './almacen.ts'
import type { Almacen } from './almacen.ts'
import {
  INICIO,
  enComoLlegar,
  esVista,
  estadoInicial,
  faseComoLlegar,
  hashDeVista,
  reducir,
  vistaDeHash,
} from './pantalla.ts'
import type {
  EstadoPantalla,
  EventoPantalla,
  FaseComoLlegar,
  Seleccion,
  Vista,
} from './pantalla.ts'

/** Pedido de ruta entre dos lugares del catálogo (ids de `Lugar`, no de nodos del grafo). */
export interface PedidoRuta {
  origen: string
  destino: string
  /** Se aborta cuando la selección cambia o queda incompleta, o al salir de "Cómo llegar". */
  signal: AbortSignal
}

/**
 * Punto de integración con `calcular-ruta-astar` y `mostrar-ruta-e-indicaciones`. Se llama una
 * sola vez por combinación de origen y destino válidos y distintos.
 */
export type SolicitarRuta = (pedido: PedidoRuta) => void

export interface Instantanea {
  pantalla: EstadoPantalla
  fase: FaseComoLlegar
  /** Ids de los destinos recientes, del más nuevo al más viejo (solo los que existen). */
  recientes: string[]
  primerUsoCerrado: boolean
  /** Pedido de ruta vigente (el que se mandó por última vez y no se canceló). */
  pedido: { origen: string; destino: string } | null
}

interface EstadoHistorial {
  dq: 1
  vista: Vista
  profundidad: number
  /** Texto de la búsqueda al salir de ella (para volver con "121" todavía escrito). */
  consulta?: string
}

function esEstadoHistorial(valor: unknown): valor is EstadoHistorial {
  return (
    typeof valor === 'object' &&
    valor !== null &&
    (valor as EstadoHistorial).dq === 1 &&
    esVista((valor as EstadoHistorial).vista) &&
    typeof (valor as EstadoHistorial).profundidad === 'number'
  )
}

export interface OpcionesControlador {
  existeLugar: (id: string) => boolean
  almacen: Almacen
  solicitarRuta: SolicitarRuta
  /** Para `tolerar-senal-irregular`: selección restaurada de un recorrido vigente. */
  seleccionInicial?: Pick<Seleccion, 'origen' | 'destino'>
  /**
   * `tolerar-senal-irregular`: con una selección restaurada y sin hash, abre directo el panel
   * "Cómo llegar" (y pide la ruta al conectar), como estaba antes de recargar.
   */
  abrirComoLlegar?: boolean
  ventana?: Window
  ahora?: () => number
}

export class ControladorPantalla {
  private readonly opciones: OpcionesControlador
  private readonly ventana: Window
  private instantanea: Instantanea
  private recientes: Reciente[]
  private readonly oyentes = new Set<() => void>()
  private profundidad = 0
  private historialIniciado = false
  private vistaPedida: Vista
  private clavePedido: string | null = null
  private abortador: AbortController | null = null
  private solicitar: SolicitarRuta

  constructor(opciones: OpcionesControlador) {
    this.opciones = opciones
    this.solicitar = opciones.solicitarRuta
    this.ventana = opciones.ventana ?? window
    const { almacen, existeLugar } = opciones

    const ultimo = almacen.leer(CLAVES.ultimoOrigen, esTexto)
    const sugerencia = ultimo && existeLugar(ultimo) ? ultimo : null
    const inicial = estadoInicial(sugerencia)
    const restaurada = opciones.seleccionInicial
    if (restaurada) {
      inicial.seleccion.origen =
        restaurada.origen && existeLugar(restaurada.origen) ? restaurada.origen : null
      inicial.seleccion.destino =
        restaurada.destino && existeLugar(restaurada.destino) ? restaurada.destino : null
    }

    this.recientes = recientesConocidos(
      almacen.leer(CLAVES.recientes, esListaRecientes) ?? [],
      existeLugar,
    )
    this.vistaPedida = vistaDeHash(this.ventana.location.hash, existeLugar)
    if (
      opciones.abrirComoLlegar &&
      inicial.seleccion.destino &&
      (this.vistaPedida.tipo === 'inicio' || this.ventana.location.hash === '#como-llegar')
    ) {
      this.vistaPedida = { tipo: 'como-llegar' }
    }
    inicial.vista = this.vistaPedida

    this.instantanea = {
      pantalla: inicial,
      fase: faseComoLlegar(inicial.seleccion),
      recientes: this.recientes.map((r) => r.id),
      primerUsoCerrado: almacen.leer(CLAVES.primerUsoCerrado, esBooleano) === true,
      pedido: null,
    }
  }

  // ---- Suscripción (useSyncExternalStore) -------------------------------------------------

  obtener = (): Instantanea => this.instantanea

  suscribir = (oyente: () => void): (() => void) => {
    this.oyentes.add(oyente)
    return () => this.oyentes.delete(oyente)
  }

  private publicar(cambios: Partial<Instantanea>) {
    const pantalla = cambios.pantalla ?? this.instantanea.pantalla
    this.instantanea = {
      ...this.instantanea,
      ...cambios,
      fase: faseComoLlegar(pantalla.seleccion),
    }
    for (const o of this.oyentes) o()
  }

  // ---- Historial ---------------------------------------------------------------------------

  /**
   * Conecta el historial. En la carga en frío con un hash válido hace `replaceState` con el
   * inicio y `pushState` con la vista pedida, así Atrás vuelve al inicio en lugar de salir.
   * Es idempotente (React en modo estricto monta los efectos dos veces).
   */
  conectar = (): (() => void) => {
    const { history } = this.ventana
    if (!this.historialIniciado) {
      this.historialIniciado = true
      const url = this.ventana.location.pathname + this.ventana.location.search
      this.reemplazar(INICIO, 0, url)
      if (this.vistaPedida.tipo !== 'inicio') this.empujar(this.vistaPedida)
      // Con un recorrido restaurado la vista ya es "Cómo llegar": se pide la ruta.
      this.revisarPedido()
    }
    const alVolver = (e: PopStateEvent) => this.alPopState(e.state ?? history.state)
    this.ventana.addEventListener('popstate', alVolver)
    return () => this.ventana.removeEventListener('popstate', alVolver)
  }

  private reemplazar(vista: Vista, profundidad: number, url?: string) {
    const estado: EstadoHistorial = { dq: 1, vista, profundidad }
    this.profundidad = profundidad
    this.ventana.history.replaceState(estado, '', url ?? this.urlDe(vista))
  }

  private empujar(vista: Vista) {
    const estado: EstadoHistorial = { dq: 1, vista, profundidad: this.profundidad + 1 }
    this.profundidad += 1
    this.ventana.history.pushState(estado, '', this.urlDe(vista))
  }

  private urlDe(vista: Vista): string {
    const { pathname, search } = this.ventana.location
    return pathname + search + hashDeVista(vista)
  }

  private alPopState(estado: unknown) {
    if (esEstadoHistorial(estado)) {
      this.profundidad = estado.profundidad
      const vista =
        estado.vista.tipo === 'ficha' && !this.opciones.existeLugar(estado.vista.lugarId)
          ? INICIO
          : estado.vista
      this.despachar({
        tipo: 'restaurar',
        vista,
        ...(typeof estado.consulta === 'string' ? { consulta: estado.consulta } : {}),
      })
    } else {
      this.profundidad = 0
      this.despachar({ tipo: 'restaurar', vista: INICIO })
    }
  }

  /** `←` de la interfaz, `Esc`: siempre por el historial. */
  volver = () => {
    if (this.instantanea.pantalla.vista.tipo === 'inicio') return
    if (this.profundidad > 0) {
      this.ventana.history.back()
    } else {
      this.reemplazar(INICIO, 0)
      this.despachar({ tipo: 'restaurar', vista: INICIO })
    }
  }

  /** `✕` de la ficha y del panel: vuelve al inicio. */
  cerrar = () => {
    if (this.profundidad > 0) {
      this.ventana.history.go(-this.profundidad)
    } else {
      this.reemplazar(INICIO, 0)
      this.despachar({ tipo: 'restaurar', vista: INICIO })
    }
  }

  // ---- Eventos -----------------------------------------------------------------------------

  despachar = (evento: EventoPantalla) => {
    const previo = this.instantanea.pantalla
    const siguiente = reducir(previo, evento)
    if (siguiente === previo) return

    if (evento.tipo !== 'restaurar' && siguiente.vista !== previo.vista) {
      if (previo.vista.tipo === 'buscando') {
        // La entrada de la búsqueda recuerda lo escrito antes de avanzar a otra vista.
        const estado: EstadoHistorial = {
          dq: 1,
          vista: previo.vista,
          profundidad: this.profundidad,
          consulta: previo.consulta,
        }
        this.ventana.history.replaceState(estado, '', this.urlDe(previo.vista))
      }
      this.empujar(siguiente.vista)
    }

    let recientes = this.recientes
    const ahora = this.opciones.ahora?.() ?? Date.now()
    if (evento.tipo === 'abrir-ficha' || evento.tipo === 'elegir-resultado') {
      const eligioDestino =
        previo.vista.tipo === 'buscando' &&
        previo.vista.desde === 'como-llegar' &&
        previo.vista.campo === 'destino'
      if (siguiente.vista.tipo === 'ficha' || eligioDestino) {
        recientes = agregarReciente(recientes, evento.lugarId, ahora)
      }
    }
    if (recientes !== this.recientes) {
      this.recientes = recientes
      this.opciones.almacen.escribir(CLAVES.recientes, recientes)
    }

    this.publicar({ pantalla: siguiente, recientes: recientes.map((r) => r.id) })

    // Elegir en la búsqueda abierta desde el panel vuelve al panel por el historial. Si se
    // eligió el origen y todavía falta el destino, la misma entrada pasa a buscar el destino.
    if (
      evento.tipo === 'elegir-resultado' &&
      previo.vista.tipo === 'buscando' &&
      previo.vista.desde === 'como-llegar'
    ) {
      if (previo.vista.campo === 'origen' && !siguiente.seleccion.destino) {
        this.pasarABuscarDestino()
      } else {
        this.volver()
      }
    }

    // Origen elegido desde la hoja del panel: si falta el destino, se abre su búsqueda.
    if (
      (evento.tipo === 'elegir-origen' || evento.tipo === 'confirmar-sugerencia') &&
      siguiente.vista.tipo === 'como-llegar' &&
      siguiente.seleccion.origen &&
      !siguiente.seleccion.destino
    ) {
      this.despachar({ tipo: 'abrir-busqueda', campo: 'destino' })
      return
    }

    this.revisarPedido()
  }

  /**
   * Inicio → "Cómo llegar" buscando el origen (la barra del inicio). Son dos entradas del
   * historial: Atrás desde la búsqueda vuelve al panel y desde el panel, al inicio.
   */
  empezarRecorrido = () => {
    if (this.instantanea.pantalla.vista.tipo !== 'inicio') return
    this.despachar({ tipo: 'abrir-como-llegar' })
    this.despachar({ tipo: 'abrir-busqueda', campo: 'origen' })
  }

  /** Reemplaza la búsqueda del origen por la del destino (sin agregar una entrada). */
  private pasarABuscarDestino() {
    const vista: Vista = { tipo: 'buscando', campo: 'destino', desde: 'como-llegar' }
    this.reemplazar(vista, this.profundidad)
    this.publicar({ pantalla: { ...this.instantanea.pantalla, vista, consulta: '' } })
  }

  /** Cambia la implementación de `solicitarRuta` sin recrear el controlador. */
  usarSolicitarRuta(solicitar: SolicitarRuta) {
    this.solicitar = solicitar
  }

  cerrarPrimerUso = () => {
    if (this.instantanea.primerUsoCerrado) return
    this.opciones.almacen.escribir(CLAVES.primerUsoCerrado, true)
    this.publicar({ primerUsoCerrado: true })
  }

  // ---- Pedido automático de la ruta --------------------------------------------------------

  private revisarPedido() {
    const { vista, seleccion } = this.instantanea.pantalla
    const { origen, destino } = seleccion
    const vale = enComoLlegar(vista) && faseComoLlegar(seleccion) === 'ruta' && origen && destino
    const clave = vale ? `${origen}\u0000${destino}` : null
    if (clave === this.clavePedido) return

    this.abortador?.abort()
    this.abortador = null
    this.clavePedido = clave

    if (!vale || !origen || !destino) {
      if (this.instantanea.pedido) this.publicar({ pedido: null })
      return
    }
    this.abortador = new AbortController()
    this.opciones.almacen.escribir(CLAVES.ultimoOrigen, origen)
    this.publicar({ pedido: { origen, destino } })
    try {
      this.solicitar({ origen, destino, signal: this.abortador.signal })
    } catch (error) {
      console.error('solicitarRuta falló', error)
    }
  }
}
