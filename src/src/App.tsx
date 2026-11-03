import {
  Suspense,
  lazy,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react'
import {
  excluidosDeControlador,
  formatearDiaHora,
  iniciarCierres,
  leerFechaSimulada,
} from './cierres/index.ts'
import type { ControladorCierres } from './cierres/index.ts'
import {
  crearCoordinadorConexion,
  crearMonitorConexion,
  recorridoParaRestaurar,
  type OrigenDatos,
} from './conexion/index.ts'
import type { CierresCargados } from './cierres/index.ts'
import type { CatalogoLugares, GrafoCampus, PlanoBase } from './datos/index.ts'
import { URL_GRAFO, URL_LUGARES, URL_PLANO } from './datos/index.ts'
import {
  decidirRestauracion,
  leerRecorrido,
  versionDatos as calcularVersionDatos,
  type RecorridoGuardado,
} from './datos/persistencia.ts'
import { crearClimaDeLaApp, crearOrquestadorRuta } from './clima/index.ts'
import {
  NOMBRES_ENTRADAS,
  prepararDatosIndicaciones,
  prepararGrafoRuteable,
} from './rutas/index.ts'
import type { DatosIndicaciones, GrafoRuteable } from './rutas/index.ts'
import { crearCatalogoUI } from './ui/catalogo.ts'
import type { CatalogoUI } from './ui/catalogo.ts'
import { estadoAccesoDe } from './ui/cierres/acceso.ts'
import { ContextoCierres } from './ui/cierres/contexto.ts'
import EtiquetaFechaSimulada from './ui/cierres/EtiquetaFechaSimulada.tsx'
import { SIMBOLOS_CIERRES } from './ui/cierres/leyenda.ts'
import { useEstadoCierres } from './ui/cierres/useEstadoCierres.ts'
import AvisoClima from './ui/clima/AvisoClima.tsx'
import { ContextoOrquestadorRuta } from './ui/clima/contexto.ts'
import PanelPrueba from './ui/clima/PanelPrueba.tsx'
import { crearSolicitarRuta } from './ui/clima/solicitarRuta.ts'
import { usePanelPrueba } from './ui/clima/usePanelPrueba.ts'
import AvisosApp from './ui/conexion/AvisosApp.tsx'
import AyudaInstalar from './ui/conexion/AyudaInstalar.tsx'
import BotonInstalar from './ui/conexion/BotonInstalar.tsx'
import { ContextoConexion } from './ui/conexion/contexto.ts'
import { useSinConexionApp } from './ui/conexion/useSinConexionApp.ts'
import type { Seleccion } from './ui/estado/pantalla.ts'
import { componerCapas } from './ui/integraciones.ts'
import type { Integraciones, SolicitarRuta } from './ui/integraciones.ts'
import type { PropsMapa } from './ui/mapa/tipos.ts'
import Pantalla from './ui/Pantalla.tsx'
import ContenidoRutaApp from './ui/ruta/ContenidoRutaApp.tsx'
import { ContextoDatosIndicaciones, ContextoVistaRuta, crearVistaRuta } from './ui/ruta/conexion.ts'
import { cajaDeRuta } from './ui/ruta/geometria.ts'
import { TEXTOS } from './ui/textos.ts'

// Leaflet se carga aparte: la interfaz aparece sin esperar el bundle del mapa.
const MapaCampus = lazy(() => import('./ui/mapa/MapaCampus.tsx'))

function MapaPerezoso(props: PropsMapa) {
  return (
    <Suspense fallback={<div className="mapa" />}>
      <MapaCampus {...props} />
    </Suspense>
  )
}

// La capa de cierres también usa Leaflet: va en su propio chunk, dentro del mapa.
const CapaCierresMapa = lazy(() => import('./ui/cierres/CapaCierresMapa.tsx'))

function CapaCierresPerezosa() {
  return (
    <Suspense fallback={null}>
      <CapaCierresMapa />
    </Suspense>
  )
}

// La capa de la ruta (mostrar-ruta-e-indicaciones) también usa Leaflet: su propio chunk.
const CapaRutaMapa = lazy(() => import('./ui/ruta/CapaRutaMapa.tsx'))

function CapaRutaPerezosa() {
  return (
    <Suspense fallback={null}>
      <CapaRutaMapa />
    </Suspense>
  )
}

/** Capas del mapa, en orden (el orden visual lo deciden los panes: cierres debajo de la ruta). */
const CAPAS_MAPA = componerCapas(CapaCierresPerezosa, CapaRutaPerezosa)

/** Promesa que se resuelve desde afuera (el grafo llega después de montar la interfaz). */
function diferido<T>() {
  let resolver: (valor: T) => void = () => {}
  const promesa = new Promise<T>((r) => (resolver = r))
  return { promesa, resolver }
}

/**
 * Clima simulado y orquestador de rutas (adaptar-ruta-al-clima). El orquestador espera al grafo y
 * al controlador de cierres: los cálculos pedidos antes quedan en "Buscando el camino…".
 *
 * También arma lo de tolerar-senal-irregular que no es React: el monitor de conexión (que
 * envuelve los `fetch` de clima y cierres), la vista de la ruta, el coordinador de "Reintentar" y
 * reconexión, y el par restaurado de un recorrido guardado.
 */
function crearRutasDeLaApp() {
  const monitor = crearMonitorConexion()
  // Cada consulta de clima informa al monitor de conexión; sin conexión no se reutiliza el
  // clima guardado (nunca un `lluvia` o `seco` de antes del corte).
  const clima = crearClimaDeLaApp({
    fetch: monitor.envolverFetch((url, init) => fetch(url, init)),
    sinConexion: () =>
      monitor.estado === 'sin-conexion' ||
      (typeof navigator !== 'undefined' && navigator.onLine === false),
  })
  const grafo = diferido<GrafoRuteable>()
  const cierres: { actual: ControladorCierres | null } = { actual: null }
  const orquestador = crearOrquestadorRuta({
    grafo: grafo.promesa,
    servicio: clima.servicio,
    excluidos: () => excluidosDeControlador(cierres.actual),
  })
  const vistaRuta = crearVistaRuta()
  // Los cierres pasan por el monitor; si la red no responde en 4,5 s, "Sin conexión".
  const fetchCierres = monitor.envolverFetch(
    (url: string, init?: { signal?: AbortSignal }) => fetch(url, init),
    { timeoutMs: 4500 },
  )
  let recargarCierres: () => Promise<OrigenDatos | null> = () => Promise.resolve(null)
  let restaurado: string | null = null
  const coordinador = crearCoordinadorConexion({
    monitor,
    orquestador,
    rutaMostrada: () => {
      const { clave, seleccion } = vistaRuta.estado()
      return clave && seleccion
        ? { clave, criterio: seleccion.criterio, elegida: seleccion.elegida }
        : null
    },
    recargarCierres: () => recargarCierres(),
    invalidarClima: () => clima.servicio.invalidar(),
  })
  return {
    monitor,
    clima,
    orquestador,
    cierres,
    vistaRuta,
    coordinador,
    fetchCierres,
    grafoListo: grafo.resolver,
    /** La app conecta acá cómo recargar los cierres (necesita su estado). */
    usarRecargaDeCierres(fn: () => Promise<OrigenDatos | null>) {
      recargarCierres = fn
    },
    /** `origen|destino` restaurado: el primer pedido de ruta de ese par no recalcula. */
    marcarRestaurado(clave: string) {
      restaurado = clave
    },
    hayRestaurado: () => restaurado !== null,
    tomarRestaurado(clave: string): boolean {
      if (restaurado !== clave) return false
      restaurado = null
      return true
    },
  }
}

type RutasDeLaApp = ReturnType<typeof crearRutasDeLaApp>

/**
 * Decide qué hacer con el recorrido guardado (decisión 6). Con la misma `versionDatos`, dibuja
 * las rutas guardadas sin recalcular ni consultar el clima; con otra, recalcula si los lugares
 * siguen existiendo; si no, devuelve el aviso "No pudimos recuperar tu recorrido anterior".
 */
function restaurarRecorrido(
  rutas: RutasDeLaApp,
  version: string,
  ruteable: GrafoRuteable,
  ui: CatalogoUI,
): { inicial: Inicial | null; mensaje: string | null } {
  const decision = decidirRestauracion({
    versionDatos: version,
    existeLugar: (id) => ui.porId.has(id),
    existeNodo: (id) => ruteable.indiceNodo.has(id),
  })
  if (decision.tipo === 'ninguna') return { inicial: null, mensaje: null }
  if (decision.tipo === 'descartada') return { inicial: null, mensaje: decision.mensaje }
  const { recorrido } = decision
  const inicial: Inicial = {
    seleccion: { origen: recorrido.origen ?? null, destino: recorrido.destino ?? null },
  }
  if (decision.tipo === 'restaurar') {
    const datos = recorridoParaRestaurar(recorrido, ruteable, ui.porId)
    if (datos) {
      const plan = rutas.orquestador.restaurar(datos)
      const clave = `${recorrido.origen}|${recorrido.destino}`
      rutas.vistaRuta.mostrar(clave, plan, null)
      rutas.vistaRuta.elegir(plan, recorrido.alternativaMostrada)
      rutas.marcarRestaurado(clave)
    }
  }
  return { inicial, mensaje: null }
}

async function pedirJson<T>(url: string): Promise<T> {
  const r = await fetch(url)
  if (!r.ok) throw new Error(`${url}: ${r.status}`)
  return (await r.json()) as T
}

/** Selección con la que abre la pantalla cuando se restaura un recorrido (decisión 6). */
interface Inicial {
  seleccion: Pick<Seleccion, 'origen' | 'destino'>
}

type Estado =
  | { tipo: 'cargando' }
  | { tipo: 'error' }
  | {
      tipo: 'listo'
      catalogo: CatalogoLugares
      plano: PlanoBase
      ui: CatalogoUI
      versionDatos: string | null
      inicial: Inicial | null
    }

/** El origen de los cierres para el aviso "Cierres sin actualizar desde las HH:MM". */
function origenDeCierres(c: CierresCargados): OrigenDatos {
  if (c.origen === 'red') return { origen: 'red' }
  return { origen: c.origen, guardadoEn: c.guardadoEn }
}

/** Cuánto se ve "No pudimos recuperar tu recorrido anterior". */
const DURACION_MENSAJE_RECORRIDO_MS = 8000

export interface PropsApp {
  /** Puntos de integración de los otros cambios (ver `src/ui/integraciones.ts`). */
  integraciones?: Partial<Integraciones>
}

export default function App({ integraciones }: PropsApp) {
  const [estado, setEstado] = useState<Estado>({ tipo: 'cargando' })
  const [intento, setIntento] = useState(0)
  // Cierres temporales: el controlador llega después del grafo; mientras tanto, sin cierres.
  const [controlador, setControlador] = useState<ControladorCierres | null>(null)
  const [fechaSimulada] = useState(() => leerFechaSimulada())
  const estadoCierres = useEstadoCierres(controlador)
  const [rutas] = useState(crearRutasDeLaApp)
  // Recorrido guardado: se lee antes del primer render (sincrónico).
  const [guardado] = useState<RecorridoGuardado | null>(() => leerRecorrido())
  const [mensajeRecorrido, setMensajeRecorrido] = useState<string | null>(null)
  const [grafoCargado, setGrafoCargado] = useState<{
    ruteable: GrafoRuteable
    catalogo: CatalogoLugares
  } | null>(null)
  // Ruta que se ve (hoja ↔ mapa) y datos de las indicaciones (cuando llega el grafo).
  const { vistaRuta, fetchCierres } = rutas
  const estadoVistaRuta = useSyncExternalStore(vistaRuta.suscribir, vistaRuta.estado)
  const [datosIndicaciones, setDatosIndicaciones] = useState<DatosIndicaciones | null>(null)
  const rutasRef = useRef(rutas)
  const panelPrueba = usePanelPrueba()

  // Cambio de escenario desde el panel con una ruta en pantalla: se vuelve a consultar el clima.
  useEffect(
    () => rutas.clima.alCambiarEscenario(() => void rutas.orquestador.recalcular()),
    [rutas],
  )

  useEffect(() => {
    let vigente = true
    let creado: ControladorCierres | null = null
    Promise.all([pedirJson<CatalogoLugares>(URL_LUGARES), pedirJson<PlanoBase>(URL_PLANO)])
      .then(([catalogo, plano]) => {
        if (!vigente) return
        // Con un recorrido guardado se espera al grafo: hay que decidir antes de mostrar la
        // pantalla si se restaura (decisión 6). El grafo sale del precache, así que es rápido.
        if (!guardado) {
          setEstado({
            tipo: 'listo',
            catalogo,
            plano,
            ui: crearCatalogoUI(catalogo),
            versionDatos: null,
            inicial: null,
          })
        }
        // El grafo solo ubica el pin en la puerta exacta: se carga después, sin bloquear.
        return pedirJson<GrafoCampus>(URL_GRAFO).then(async (grafo) => {
          if (!vigente) return
          const ui = crearCatalogoUI(catalogo, grafo.nodos)
          const ruteable = prepararGrafoRuteable(grafo)
          setGrafoCargado({ ruteable, catalogo })
          const version = calcularVersionDatos(grafo, catalogo)
          let inicial: Inicial | null = null
          if (guardado) {
            const r = restaurarRecorrido(rutasRef.current, version, ruteable, ui)
            inicial = r.inicial
            if (r.mensaje) setMensajeRecorrido(r.mensaje)
          }
          setEstado((previo) => ({
            tipo: 'listo',
            catalogo,
            plano,
            ui,
            versionDatos: version,
            inicial: previo.tipo === 'listo' ? previo.inicial : inicial,
          }))
          setDatosIndicaciones(
            prepararDatosIndicaciones({
              grafo: ruteable,
              nodos: grafo.nodos,
              catalogo,
              entradas: NOMBRES_ENTRADAS,
            }),
          )
          try {
            const control = await iniciarCierres({
              grafo: ruteable,
              lugares: catalogo.lugares,
              fechaSimulada,
              carga: { fetch: fetchCierres },
              alCargar: (c) =>
                rutasRef.current.coordinador.registrarOrigenCierres(origenDeCierres(c)),
            })
            if (!vigente) return control.detener()
            creado = control
            rutasRef.current.cierres.actual = control
            setControlador(control)
          } finally {
            // Recién ahora se rutea: con los cierres vigentes (o sin ellos si fallaron).
            if (vigente) rutasRef.current.grafoListo(ruteable)
          }
          // Un recorrido restaurado se dibujó sin esperar la red: ahora se actualizan cierres y
          // clima en segundo plano, sin reemplazar la ruta (decisión 4).
          if (vigente && rutasRef.current.hayRestaurado()) {
            void rutasRef.current.coordinador.actualizarEnSegundoPlano()
          }
        })
      })
      .catch((error: unknown) => {
        console.error(error)
        if (vigente) setEstado((e) => (e.tipo === 'listo' ? e : { tipo: 'error' }))
      })
    return () => {
      vigente = false
      creado?.detener()
    }
    // `guardado` y `fetchCierres` no cambian.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intento, fechaSimulada])

  // Mensaje de recorrido no recuperado: se ve unos segundos.
  useEffect(() => {
    if (!mensajeRecorrido) return
    const id = window.setTimeout(() => setMensajeRecorrido(null), DURACION_MENSAJE_RECORRIDO_MS)
    return () => window.clearTimeout(id)
  }, [mensajeRecorrido])

  /** "Reintentar" y reconexión: vuelve a cargar los cierres y reemplaza el controlador. */
  const recargarCierres = useCallback(async (): Promise<OrigenDatos | null> => {
    const g = grafoCargado
    if (!g) return null
    let origen: OrigenDatos | null = null
    const control = await iniciarCierres({
      grafo: g.ruteable,
      lugares: g.catalogo.lugares,
      fechaSimulada,
      carga: { fetch: fetchCierres },
      alCargar: (c) => {
        origen = origenDeCierres(c)
      },
    })
    const anterior = rutasRef.current.cierres.actual
    rutasRef.current.cierres.actual = control
    setControlador(control)
    anterior?.detener()
    return origen
  }, [grafoCargado, fechaSimulada, fetchCierres])
  useEffect(() => rutas.usarRecargaDeCierres(recargarCierres), [rutas, recargarCierres])

  const sinConexion = useSinConexionApp({
    monitor: rutas.monitor,
    orquestador: rutas.orquestador,
    coordinador: rutas.coordinador,
    vistaRuta,
    versionDatos: estado.tipo === 'listo' ? estado.versionDatos : null,
    mensajeRecorrido,
  })

  const reintentar = useCallback(() => {
    setEstado({ tipo: 'cargando' })
    setIntento((n) => n + 1)
  }, [])

  const estadoAcceso = useMemo(() => estadoAccesoDe(estadoCierres), [estadoCierres])
  const catalogoUI = estado.tipo === 'listo' ? estado.ui : null
  const solicitarRuta = useMemo<SolicitarRuta | undefined>(() => {
    if (!catalogoUI) return undefined
    const calcular = crearSolicitarRuta(rutas.orquestador, catalogoUI)
    return (pedido) => {
      // El recorrido restaurado ya está en pantalla: no se recalcula (se actualiza en segundo
      // plano). Salir del panel lo limpia igual que un pedido normal.
      if (rutas.tomarRestaurado(`${pedido.origen}|${pedido.destino}`)) {
        const consulta = rutas.orquestador.estado()
        pedido.signal.addEventListener(
          'abort',
          () => {
            const ahora = rutas.orquestador.estado()
            if (ahora.tipo !== 'inactivo' && consulta.tipo !== 'inactivo') {
              if (ahora.consulta === consulta.consulta) rutas.orquestador.limpiar()
            }
          },
          { once: true },
        )
        return
      }
      calcular(pedido)
    }
  }, [catalogoUI, rutas])
  // Recentrar con una ruta en pantalla vuelve al encuadre de la ruta (y oculta el pin suelto).
  const { clave: claveRuta, seleccion: rutaVista } = estadoVistaRuta
  const encuadreRuta = useCallback(
    (origenId: string, destinoId: string) =>
      rutaVista && claveRuta === `${origenId}|${destinoId}` ? cajaDeRuta(rutaVista.elegida) : null,
    [claveRuta, rutaVista],
  )
  const integracionesApp = useMemo<Partial<Integraciones>>(
    () => ({
      estadoAcceso,
      CapasMapa: CAPAS_MAPA,
      AvisoClima,
      ContenidoRuta: ContenidoRutaApp,
      encuadreRuta,
      Avisos: AvisosApp,
      ExtraAyuda: AyudaInstalar,
      BotonInstalar,
      ...(solicitarRuta ? { solicitarRuta } : {}),
      ...integraciones,
    }),
    [estadoAcceso, solicitarRuta, encuadreRuta, integraciones],
  )
  const etiquetaFecha = <EtiquetaFechaSimulada fecha={fechaSimulada} />
  const panel = (
    <PanelPrueba
      control={rutas.clima.control}
      abierto={panelPrueba.abierto}
      onCerrar={panelPrueba.cerrar}
      fechaSimulada={fechaSimulada === null ? null : formatearDiaHora(fechaSimulada)}
    />
  )

  if (estado.tipo !== 'listo') {
    return (
      <main className="pantalla pantalla--aviso">
        <h1 className="solo-lector">{TEXTOS.app}</h1>
        {estado.tipo === 'cargando' ? (
          <p role="status">{TEXTOS.cargando}</p>
        ) : (
          <div role="alert">
            <p>{TEXTOS.errorCarga}</p>
            <button type="button" className="boton boton--primario" onClick={reintentar}>
              {TEXTOS.reintentar}
            </button>
          </div>
        )}
        {etiquetaFecha}
        {panel}
      </main>
    )
  }

  return (
    <ContextoConexion.Provider value={sinConexion.valor}>
      <ContextoCierres.Provider value={controlador}>
        <ContextoOrquestadorRuta.Provider value={rutas.orquestador}>
          <ContextoVistaRuta.Provider value={vistaRuta}>
            <ContextoDatosIndicaciones.Provider value={datosIndicaciones}>
              <Pantalla
                catalogo={estado.ui}
                plano={estado.plano}
                Mapa={MapaPerezoso}
                integraciones={integracionesApp}
                simbolosLeyenda={SIMBOLOS_CIERRES}
                propsBotonAyuda={panelPrueba.propsBotonAyuda}
                alCambiarSeleccion={sinConexion.alCambiarSeleccion}
                {...(estado.inicial
                  ? { seleccionInicial: estado.inicial.seleccion, abrirComoLlegar: true }
                  : {})}
              />
            </ContextoDatosIndicaciones.Provider>
          </ContextoVistaRuta.Provider>
          {etiquetaFecha}
          {panel}
        </ContextoOrquestadorRuta.Provider>
      </ContextoCierres.Provider>
    </ContextoConexion.Provider>
  )
}
