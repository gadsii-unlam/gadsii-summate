import {
  calcularRuta,
  type Criterio,
  type GrafoRuteable,
  type ResultadoRuta,
  type TramosExcluidos,
} from '../rutas/index.ts'
import { crearMemoriaCriterio, type MemoriaCriterio } from './memoria-criterio.ts'
import { recomendar, type PlanDeRuta } from './recomendacion.ts'
import type { EstadoClima, ServicioClima } from './tipos.ts'

/**
 * Orquestación del cálculo (tareas 4.1 y 4.2): clima + cierres + los dos criterios.
 *
 * Los tramos excluidos se inyectan (valor fijo o proveedor sync/async) para no acoplarse a
 * `src/cierres/`: se piden en cada cálculo, porque la vigencia de los cierres cambia con la hora.
 */

export interface ConsultaOrigenDestino {
  /** Puertas del lugar de origen (`Lugar.puertas`). */
  origen: readonly string[]
  /** Puertas del lugar de destino. */
  destino: readonly string[]
  /** Ids de `Lugar` (opcionales): la interfaz los usa para saber a qué par corresponde el estado. */
  origenId?: string
  destinoId?: string
}

export type ProveedorExcluidos =
  TramosExcluidos | (() => TramosExcluidos | Promise<TramosExcluidos>)

export type EstadoOrquestador =
  | { tipo: 'inactivo' }
  /** Primera consulta para este origen y destino: "Buscando el camino…", sin ninguna ruta. */
  | { tipo: 'esperando-clima'; consulta: ConsultaOrigenDestino }
  | {
      tipo: 'listo'
      consulta: ConsultaOrigenDestino
      clima: EstadoClima
      plan: PlanDeRuta
      /** Resultados de los dos criterios (para dibujar la alternativa o las dos opciones). */
      rutas: { masCorta: ResultadoRuta; resguardada: ResultadoRuta }
      /**
       * Se está volviendo a consultar el clima (Reintentar o cambio de escenario): el plan anterior
       * sigue a la vista hasta que llegue la respuesta.
       */
      actualizando: boolean
    }

/** Un cálculo completo que todavía no se mostró (tolerar-senal-irregular, decisión 4). */
export interface CalculoPrevio {
  consulta: ConsultaOrigenDestino
  clima: EstadoClima
  plan: PlanDeRuta
  rutas: { masCorta: ResultadoRuta; resguardada: ResultadoRuta }
  /** Tramos excluidos con los que se calculó. */
  excluidos: TramosExcluidos
}

/** Lo necesario para volver a mostrar un recorrido guardado sin recalcular ni consultar. */
export interface RecorridoRestaurado {
  consulta: ConsultaOrigenDestino
  clima: EstadoClima
  rutas: { masCorta: ResultadoRuta; resguardada: ResultadoRuta }
  /** Criterio que había elegido el usuario con el clima caído. */
  criterioElegido?: Criterio
}

export interface OpcionesOrquestador {
  /** Grafo ruteable, o una promesa si todavía se está cargando (los cálculos esperan). */
  grafo: GrafoRuteable | Promise<GrafoRuteable>
  servicio: ServicioClima
  /** Tramos excluidos vigentes (`aplicar-cierres-temporales`). Por defecto, ninguno. */
  excluidos?: ProveedorExcluidos
  memoria?: MemoriaCriterio
}

export interface OrquestadorRuta {
  estado(): EstadoOrquestador
  suscribir(alCambiar: (estado: EstadoOrquestador) => void): () => void
  /**
   * Calcula la ruta para un origen y destino nuevos. Pasa por `esperando-clima` y entrega el plan
   * solo cuando hay estado del clima. Si mientras tanto llega otro cálculo, este se descarta
   * (devuelve `null`).
   */
  calcular(consulta: ConsultaOrigenDestino): Promise<PlanDeRuta | null>
  /** Vuelve a consultar el clima y recalcula con el mismo origen y destino ("Reintentar"). */
  reintentar(): Promise<PlanDeRuta | null>
  /** Igual que `reintentar`; se usa cuando el moderador cambia el escenario con una ruta en pantalla. */
  recalcular(): Promise<PlanDeRuta | null>
  /** El usuario elige el criterio con el clima no disponible: se recuerda y se rearma el plan. */
  elegirCriterio(criterio: Criterio): void
  /** Vuelve a `inactivo` y descarta cualquier cálculo en curso. */
  limpiar(): void
  /**
   * Muestra un recorrido guardado tal cual (sin consultar el clima ni recalcular): pasa directo a
   * `listo` con el plan armado con el clima y las rutas guardadas.
   */
  restaurar(recorrido: RecorridoRestaurado): PlanDeRuta
  /**
   * Vuelve a consultar el clima y calcula con el mismo origen y destino, **sin publicar**: para
   * comparar con la ruta en pantalla antes de reemplazarla. `null` si no hay consulta o si
   * mientras tanto cambió el estado.
   */
  previsualizar(): Promise<CalculoPrevio | null>
  /** Publica un cálculo hecho con `previsualizar` (si sigue siendo para la consulta actual). */
  aplicar(calculo: CalculoPrevio): boolean
}

const VACIO: TramosExcluidos = { nodos: new Set(), aristas: new Set() }

export function crearOrquestadorRuta(opciones: OpcionesOrquestador): OrquestadorRuta {
  const { grafo, servicio } = opciones
  const memoria = opciones.memoria ?? crearMemoriaCriterio()
  const proveedor = opciones.excluidos ?? VACIO
  let estado: EstadoOrquestador = { tipo: 'inactivo' }
  let generacion = 0
  let cancelar: AbortController | null = null
  const suscriptores = new Set<(e: EstadoOrquestador) => void>()

  function publicar(nuevo: EstadoOrquestador) {
    estado = nuevo
    for (const s of [...suscriptores]) s(nuevo)
  }

  async function ejecutar(
    consulta: ConsultaOrigenDestino,
    conservarPlan: boolean,
  ): Promise<PlanDeRuta | null> {
    const mia = ++generacion
    cancelar?.abort()
    const control = new AbortController()
    cancelar = control

    if (conservarPlan && estado.tipo === 'listo') publicar({ ...estado, actualizando: true })
    else publicar({ tipo: 'esperando-clima', consulta })

    // La consulta de clima sale primero; los A* (milisegundos) corren mientras espera la red.
    const climaPromesa = servicio.consultar(control.signal)
    const [g, excluidos] = await Promise.all([grafo, obtenerExcluidos()])
    if (mia !== generacion) return null
    const base = { origen: consulta.origen, destino: consulta.destino, excluidos }
    const masCorta = calcularRuta(g, { ...base, criterio: 'mas-corta' })
    const resguardada = calcularRuta(g, { ...base, criterio: 'resguardada' })
    const clima = await climaPromesa
    if (mia !== generacion) return null

    cancelar = null
    memoria.registrarClima(clima)
    const plan = recomendar(clima, masCorta, resguardada, memoria.elegido())
    publicar({
      tipo: 'listo',
      consulta,
      clima,
      plan,
      rutas: { masCorta, resguardada },
      actualizando: false,
    })
    return plan
  }

  async function obtenerExcluidos(): Promise<TramosExcluidos> {
    if (typeof proveedor !== 'function') return proveedor
    try {
      return await proveedor()
    } catch (error) {
      // Sin cierres conocidos se rutea igual (mismo criterio que sin archivo de cierres).
      console.warn('No se pudieron obtener los tramos excluidos; se calcula sin cierres.', error)
      return VACIO
    }
  }

  async function calcularSinPublicar(
    consulta: ConsultaOrigenDestino,
    signal: AbortSignal,
  ): Promise<CalculoPrevio> {
    const climaPromesa = servicio.consultar(signal)
    const [g, excluidos] = await Promise.all([grafo, obtenerExcluidos()])
    const base = { origen: consulta.origen, destino: consulta.destino, excluidos }
    const masCorta = calcularRuta(g, { ...base, criterio: 'mas-corta' })
    const resguardada = calcularRuta(g, { ...base, criterio: 'resguardada' })
    const clima = await climaPromesa
    // La elección del usuario con el clima caído sigue valiendo si el clima sigue caído.
    const elegido = clima.tipo === 'ok' ? undefined : memoria.elegido()
    const plan = recomendar(clima, masCorta, resguardada, elegido)
    return { consulta, clima, plan, rutas: { masCorta, resguardada }, excluidos }
  }

  function consultaActual(): ConsultaOrigenDestino | null {
    return estado.tipo === 'inactivo' ? null : estado.consulta
  }

  function rehacer(): Promise<PlanDeRuta | null> {
    const consulta = consultaActual()
    return consulta ? ejecutar(consulta, true) : Promise.resolve(null)
  }

  return {
    estado: () => estado,
    suscribir(alCambiar) {
      suscriptores.add(alCambiar)
      return () => suscriptores.delete(alCambiar)
    },
    calcular: (consulta) => ejecutar(consulta, false),
    reintentar: rehacer,
    recalcular: rehacer,
    elegirCriterio(criterio) {
      // Solo se recuerda una elección hecha con el clima caído (con clima `ok` manda la regla).
      if (estado.tipo !== 'listo' || estado.clima.tipo === 'ok') return
      memoria.elegir(criterio)
      const { clima, rutas } = estado
      publicar({
        ...estado,
        plan: recomendar(clima, rutas.masCorta, rutas.resguardada, memoria.elegido()),
      })
    },
    limpiar() {
      generacion++
      cancelar?.abort()
      cancelar = null
      publicar({ tipo: 'inactivo' })
    },
    restaurar({ consulta, clima, rutas, criterioElegido }) {
      generacion++
      cancelar?.abort()
      cancelar = null
      if (criterioElegido && clima.tipo !== 'ok') memoria.elegir(criterioElegido)
      const plan = recomendar(clima, rutas.masCorta, rutas.resguardada, memoria.elegido())
      publicar({ tipo: 'listo', consulta, clima, plan, rutas, actualizando: false })
      return plan
    },
    async previsualizar() {
      if (estado.tipo !== 'listo') return null
      const { consulta } = estado
      const mia = generacion
      const calculo = await calcularSinPublicar(consulta, new AbortController().signal)
      if (mia !== generacion || estado.tipo !== 'listo' || estado.consulta !== consulta) return null
      return calculo
    },
    aplicar(calculo) {
      if (estado.tipo === 'inactivo' || estado.consulta !== calculo.consulta) return false
      generacion++
      cancelar?.abort()
      cancelar = null
      memoria.registrarClima(calculo.clima)
      publicar({
        tipo: 'listo',
        consulta: calculo.consulta,
        clima: calculo.clima,
        plan: calculo.plan,
        rutas: calculo.rutas,
        actualizando: false,
      })
      return true
    },
  }
}
