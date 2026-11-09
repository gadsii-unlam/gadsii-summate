/**
 * Indicaciones paso a paso (design.md de mostrar-ruta-e-indicaciones, decisiones 9 a 11).
 *
 * `generarIndicaciones` es pura: a partir de la ruta, el grafo y los nombres curados arma la lista
 * de pasos (salir, seguir, doblar, salir o entrar de un edificio, cambiar de edificio, llegar y,
 * para otros pisos, el piso). No usa React ni la red.
 */
import type { CatalogoLugares, Lugar, NodoCampus, Piso } from '../datos/index.ts'
import { redondearDistancia } from './formato.ts'
import { armarTramos, indexarNodos, VECTORES, type InfoNodos, type Tramo } from './tramos.ts'
import type { Direccion } from './tramos.ts'
import type { GrafoRuteable, RutaEncontrada } from './tipos.ts'

export type TipoPaso =
  | 'salir-lugar'
  | 'seguir'
  | 'girar'
  | 'salir-edificio'
  | 'entrar-edificio'
  | 'cambiar-edificio'
  | 'escalera'
  | 'llegar'
  | 'piso'

export type Lado = 'izquierda' | 'derecha'

export interface Paso {
  tipo: TipoPaso
  /** Texto completo de la maniobra ("Doblá a la izquierda"). */
  texto: string
  /** Lado del (primer) giro de la maniobra, si dobla. */
  giro?: Lado
  /** Longitud del tramo que sigue a la maniobra, redondeada a 5 m. Ausente en `llegar` y `piso`. */
  distanciaM?: number
  /** Longitud sin redondear del mismo tramo (para controles y tests). */
  distanciaRealM?: number
  /** `true` si el texto ya dice la distancia ("seguí la línea azul 40 m"): no repetirla al lado. */
  distanciaEnTexto?: boolean
  /** El tramo que sigue a la maniobra es al aire libre. */
  alAireLibre: boolean
  /** Índices en `ruta.nodos` del tramo del paso (para encuadrarlo y resaltarlo). */
  tramo: { desde: number; hasta: number }
}

/** Nombre visible de cada entrada de edificio (`datos-fuente/entradas.json`), por id de nodo. */
export type NombresEntradas = Readonly<Record<string, string>>

/** Un desvío más corto que esto entre dos tramos de la misma dirección no es un giro. */
export const UMBRAL_DESVIO_M = 3
/** Dos giros separados por menos que esto van en un solo paso ("y enseguida"). */
export const UMBRAL_ENSEGUIDA_M = 4

/**
 * Nombre de cada edificio para las indicaciones, con artículo ("Entrá al Edificio Este"). El
 * catálogo trae el nombre visible ("Edificio Este"), que se usa como respaldo para los
 * departamentos que no están acá. `central` nunca se nombra: se dice "al aire libre".
 */
export const EDIFICIOS_CORTOS: Readonly<Record<string, string>> = {
  'edificio-oeste': 'el Edificio Oeste',
  'edificio-este': 'el Edificio Este',
  'edificio-sur': 'el Edificio Sur',
  'primer-piso': 'la galería del 1er piso',
}

/** "a el" → "al" y "de el" → "del" ("entrá al Edificio Este", "salí del Edificio Sur"). */
export function contraer(preposicion: 'a' | 'de', nombre: string): string {
  if (!nombre.startsWith('el ')) return `${preposicion} ${nombre}`
  return `${preposicion === 'a' ? 'al' : 'del'} ${nombre.slice(3)}`
}

export interface DatosIndicaciones {
  grafo: GrafoRuteable
  /** Tipo y departamento de cada nodo (de `GrafoCampus.nodos`). */
  nodos: InfoNodos
  entradas: NombresEntradas
  /** Nombre visible de cada departamento (sin `central`). */
  edificios: ReadonlyMap<string, string>
}

export interface OpcionesDatosIndicaciones {
  grafo: GrafoRuteable
  /** Nodos del `GrafoCampus` con el que se armó `grafo`. */
  nodos: readonly NodoCampus[]
  /** Para el nombre de los edificios que no están en `EDIFICIOS_CORTOS`. */
  catalogo?: Pick<CatalogoLugares, 'lugares'>
  /** Por defecto, ninguna entrada tiene nombre (se usa el texto genérico). */
  entradas?: NombresEntradas
}

/** Arma los datos que necesita `generarIndicaciones`. Se hace una vez por grafo. */
export function prepararDatosIndicaciones(op: OpcionesDatosIndicaciones): DatosIndicaciones {
  const edificios = new Map<string, string>()
  for (const l of op.catalogo?.lugares ?? []) {
    if (l.depto !== 'central' && !edificios.has(l.depto)) edificios.set(l.depto, l.edificio)
  }
  for (const [depto, nombre] of Object.entries(EDIFICIOS_CORTOS)) edificios.set(depto, nombre)
  return {
    grafo: op.grafo,
    nodos: indexarNodos(op.nodos),
    entradas: op.entradas ?? {},
    edificios,
  }
}

/** Lo que las indicaciones usan de los lugares de origen y destino (del catálogo). */
export type LugarIndicaciones = Pick<Lugar, 'nombre' | 'piso' | 'indicacion'>

export interface LugaresRuta {
  origen: LugarIndicaciones
  destino: LugarIndicaciones
}

const ETIQUETA_PISO: Record<Exclude<Piso, 'PB'>, string> = {
  '1': '1er piso',
  '2': '2do piso',
  '3': '3er piso',
}

export function etiquetaPiso(piso: Exclude<Piso, 'PB'>): string {
  return ETIQUETA_PISO[piso]
}

const PISOS: readonly Piso[] = ['PB', '1', '2', '3']

/** Piso de un nodo (0 es planta baja) como `Piso` del catálogo. */
export function pisoDeNodo(piso: number): Piso {
  return PISOS[piso] ?? 'PB'
}

function textoEscalera(desde: number, hasta: number): string {
  const destino = pisoDeNodo(hasta)
  const verbo = hasta > desde ? 'subí' : 'bajá'
  return destino === 'PB'
    ? `${verbo} la escalera a planta baja`
    : `${verbo} la escalera al ${etiquetaPiso(destino)}`
}

// ---------------------------------------------------------------------------------------------
// Giros
// ---------------------------------------------------------------------------------------------

export type Giro = Lado | 'derecho' | 'vuelta'

/**
 * Giro entre dos direcciones con el producto vectorial en coordenadas de pantalla (y hacia
 * abajo): `c = d1.x · d2.y − d1.y · d2.x`; `c > 0` es derecha, `c < 0` izquierda y `c = 0` sigue
 * derecho, o es una vuelta en U si las direcciones son opuestas.
 */
export function calcularGiro(d1: Direccion, d2: Direccion): Giro {
  const a = VECTORES[d1]
  const b = VECTORES[d2]
  const c = a.x * b.y - a.y * b.x
  if (c > 0) return 'derecha'
  if (c < 0) return 'izquierda'
  return a.x * b.x + a.y * b.y < 0 ? 'vuelta' : 'derecho'
}

function avisarVuelta(desde: string): void {
  console.warn(
    `Indicaciones: la ruta vuelve sobre sus pasos en ${desde}; no debería pasar en una ruta óptima.`,
  )
}

// ---------------------------------------------------------------------------------------------
// Textos
// ---------------------------------------------------------------------------------------------

const capitalizar = (t: string): string => t.charAt(0).toUpperCase() + t.slice(1)

/** "a", "a y b", "a, b y c" (con coma también si una parte ya tiene "y"). */
function unir(partes: readonly string[]): string {
  if (partes.length <= 1) return partes[0] ?? ''
  const ultima = partes[partes.length - 1]!
  const resto = partes.slice(0, -1)
  const conComa = resto.length > 1 || resto.some((p) => p.includes(' y '))
  return `${resto.join(', ')}${conComa ? ',' : ''} y ${ultima}`
}

const textoGiro = (giro: Giro): string =>
  giro === 'vuelta'
    ? 'volvé sobre tus pasos'
    : giro === 'derecho'
      ? 'seguí derecho'
      : `doblá a la ${giro}`

// ---------------------------------------------------------------------------------------------
// Generación
// ---------------------------------------------------------------------------------------------

interface EventoEdificio {
  tipo: 'salida' | 'entrada' | 'escalera'
  texto: string
}

interface Ancla {
  /** Índice en `cuerpo` del primer tramo después de la maniobra (`cuerpo.length` en la llegada). */
  k: number
  giro: Giro | null
  evento: EventoEdificio | null
}

/**
 * Lista de pasos de una ruta, de la salida del lugar de origen a la llegada (y el piso, si el
 * destino no está en planta baja). Las distancias se redondean a 5 m y cada paso marca si su
 * tramo es al aire libre.
 */
export function generarIndicaciones(
  ruta: RutaEncontrada,
  datos: DatosIndicaciones,
  lugares: LugaresRuta,
): Paso[] {
  const tramos = armarTramos(ruta, datos.grafo, datos.nodos)
  const { destino } = lugares
  const n = ruta.nodos.length
  const infoOrigen = datos.nodos.get(ruta.nodos[0]!)
  const infoDestino = datos.nodos.get(ruta.nodos[n - 1]!)

  const nombreEdificio = (depto: string): string | null =>
    depto === 'central' ? null : (datos.edificios.get(depto) ?? null)
  // La ruta termina en el piso del lugar (el grafo tiene nodos en ese piso).
  const llegaAlPiso = destino.piso === pisoDeNodo(infoDestino?.piso ?? 0)

  // Tramos de las puertas (salir del lugar y llegar) y cuerpo de la ruta entre ellas.
  const origenPuerta = infoOrigen?.tipo === 'puerta' && tramos.length > 0
  let inicio = origenPuerta ? tramos.findIndex((t) => t.nodo >= 1) : 0
  if (inicio < 0) inicio = tramos.length
  let destinoPuerta = infoDestino?.tipo === 'puerta' && tramos.length > 0
  let fin = destinoPuerta ? tramos.findIndex((t) => t.nodo === n - 2) : tramos.length
  if (fin < inicio) {
    // Ruta de una sola arista que sale de una puerta: no hay tramo propio de llegada.
    destinoPuerta = false
    fin = tramos.length
  }
  const cuerpo = tramos.slice(inicio, fin)
  const tramoSalida: Tramo | undefined = origenPuerta ? tramos[inicio - 1] : undefined
  const tramoLlegada: Tramo | undefined = destinoPuerta ? tramos[fin] : undefined

  // 1. Direcciones efectivas: los desvíos de menos de 3 m entre dos tramos iguales no cuentan.
  const direcciones = cuerpo.map((t) => t.direccion)
  // Un tramo de 0 px (dos nodos en el mismo lugar) no tiene dirección: toma la del vecino.
  for (let k = 0; k < cuerpo.length; k++) {
    if (cuerpo[k]!.longitudPx > 0) continue
    const vecino = k > 0 ? direcciones[k - 1] : cuerpo.find((t) => t.longitudPx > 0)?.direccion
    if (vecino) direcciones[k] = vecino
  }
  for (let k = 1; k < cuerpo.length - 1; k++) {
    const antes = direcciones[k - 1]
    if (
      cuerpo[k]!.longitudM < UMBRAL_DESVIO_M &&
      antes === cuerpo[k + 1]!.direccion &&
      direcciones[k] !== antes
    ) {
      direcciones[k] = antes
    }
  }

  // 2. Eventos de edificio: cambio entre bajo techo y aire libre en el nodo donde empieza `t`,
  //    o una escalera (el tramo `t` une dos pisos).
  const evento = (anterior: Tramo, t: Tramo): EventoEdificio | null => {
    if (t.pisoDesde !== t.pisoHasta) {
      return { tipo: 'escalera', texto: textoEscalera(t.pisoDesde, t.pisoHasta) }
    }
    if (anterior.exterior === t.exterior) return null
    const id = t.desde
    const edificio = nombreEdificio(t.deptoDesde)
    const entrada = t.tipoDesde === 'entrada' ? datos.entradas[id] : undefined
    if (!anterior.exterior) {
      const base = edificio ? `salí ${contraer('de', edificio)}` : 'salí'
      return {
        tipo: 'salida',
        texto: entrada ? `${base} por la ${entrada}` : `${base} al aire libre`,
      }
    }
    const base = edificio ? `entrá ${contraer('a', edificio)}` : 'entrá bajo techo'
    return { tipo: 'entrada', texto: entrada ? `${base} por la ${entrada}` : base }
  }

  // 3. Anclas: el inicio, cada cambio de dirección y cada evento de edificio.
  const anclas: Ancla[] = []
  for (let k = 0; k < cuerpo.length; k++) {
    const t = cuerpo[k]!
    const anterior = k > 0 ? cuerpo[k - 1] : tramoSalida
    const ev = anterior ? evento(anterior, t) : null
    if (k === 0) {
      anclas.push({ k, giro: null, evento: ev })
      continue
    }
    const giro =
      direcciones[k] !== direcciones[k - 1]
        ? calcularGiro(direcciones[k - 1]!, direcciones[k]!)
        : null
    if (giro === 'vuelta') avisarVuelta(t.desde)
    if (giro || ev) anclas.push({ k, giro, evento: ev })
  }

  const largo = (desde: number, hasta: number): number => {
    let m = 0
    for (let k = desde; k < hasta; k++) m += cuerpo[k]!.longitudM
    return m
  }
  /** Índice en `ruta.nodos` del nodo donde empieza el tramo `k` del cuerpo (o donde termina). */
  const nodoDe = (k: number): number =>
    k < cuerpo.length
      ? cuerpo[k]!.nodo
      : cuerpo.length > 0
        ? cuerpo[cuerpo.length - 1]!.nodo + 1
        : tramoSalida
          ? tramoSalida.nodo + 1
          : 0
  /** Edificios a los que se pasa bajo techo dentro de los tramos `[desde, hasta)`. */
  const cambiosDeEdificio = (desde: number, hasta: number): string[] => {
    const nombres: string[] = []
    for (let k = desde; k < hasta; k++) {
      const t = cuerpo[k]!
      if (t.exterior || t.deptoDesde === t.deptoHasta) continue
      const nombre = nombreEdificio(t.deptoHasta)
      if (nombre && nombres[nombres.length - 1] !== nombre) nombres.push(nombre)
    }
    return nombres
  }

  const pasos: Paso[] = []
  for (let i = 0; i < anclas.length; i++) {
    const ancla = anclas[i]!
    let siguiente = i + 1
    const partes: string[] = []
    let giroPaso: Lado | undefined
    let tipo: TipoPaso

    // Giro de la maniobra (en el primer paso, contra la dirección en que se sale por la puerta).
    let giro = ancla.giro
    if (i === 0 && tramoSalida && cuerpo.length > 0) {
      giro = calcularGiro(tramoSalida.direccion, direcciones[0]!)
      if (giro === 'vuelta') avisarVuelta(tramoSalida.hasta)
      if (giro === 'derecho') giro = null
    }
    // "Doblá a la izquierda y enseguida a la derecha" si el próximo giro está a menos de 4 m.
    let textoDelGiro = giro ? textoGiro(giro) : null
    if (giro === 'izquierda' || giro === 'derecha') {
      giroPaso = giro
      const prox = anclas[i + 1]
      if (
        prox &&
        !prox.evento &&
        (prox.giro === 'izquierda' || prox.giro === 'derecha') &&
        largo(ancla.k, prox.k) < UMBRAL_ENSEGUIDA_M
      ) {
        textoDelGiro = `doblá a la ${giro} y enseguida a la ${prox.giro}`
        siguiente = i + 2
      }
    }

    if (i === 0) {
      tipo = 'salir-lugar'
      if (!origenPuerta) {
        partes.push(`desde ${lugares.origen.nombre}, seguí la línea azul`)
      } else {
        partes.push(
          tramoSalida?.exterior
            ? `salí de ${lugares.origen.nombre} a la vereda`
            : `salí de ${lugares.origen.nombre}`,
        )
        if (textoDelGiro) partes.push(textoDelGiro)
      }
      if (ancla.evento) partes.push(ancla.evento.texto)
    } else if (ancla.evento?.tipo === 'salida') {
      tipo = 'salir-edificio'
      partes.push(textoDelGiro ?? 'seguí derecho', ancla.evento.texto)
    } else if (ancla.evento?.tipo === 'entrada') {
      tipo = 'entrar-edificio'
      partes.push(ancla.evento.texto)
      if (textoDelGiro) partes.push(textoDelGiro)
    } else if (ancla.evento?.tipo === 'escalera') {
      tipo = 'escalera'
      if (textoDelGiro) partes.push(textoDelGiro)
      partes.push(ancla.evento.texto)
    } else {
      tipo = textoDelGiro ? 'girar' : 'seguir'
      partes.push(textoDelGiro ?? 'seguí derecho')
    }

    const hastaK = anclas[siguiente]?.k ?? cuerpo.length
    const cambios = cambiosDeEdificio(ancla.k, hastaK)
    const ultimoCambio = cambios[cambios.length - 1]
    if (ultimoCambio) {
      partes.push(`seguí por el pasillo hasta ${ultimoCambio}`)
      if (tipo === 'girar' || tipo === 'seguir') tipo = 'cambiar-edificio'
    }

    const metros = largo(ancla.k, hastaK)
    const paso: Paso = {
      tipo,
      texto: '',
      alAireLibre: cuerpo[ancla.k]?.exterior ?? false,
      tramo: { desde: i === 0 ? 0 : nodoDe(ancla.k), hasta: nodoDe(hastaK) },
    }
    if (giroPaso) paso.giro = giroPaso
    if (hastaK > ancla.k) {
      paso.distanciaM = redondearDistancia(metros)
      paso.distanciaRealM = metros
    }
    if (i === 0 && !origenPuerta && paso.distanciaM !== undefined) {
      partes[0] = `${partes[0]} ${paso.distanciaM} m`
      paso.distanciaEnTexto = true
    }
    paso.texto = capitalizar(unir(partes))
    pasos.push(paso)
    i = siguiente - 1
  }

  if (pasos.length === 0) {
    // Ruta sin cuerpo (por ejemplo, puerta → pasillo → puerta): solo se sale del lugar.
    pasos.push({
      tipo: 'salir-lugar',
      texto: origenPuerta
        ? `Salí de ${lugares.origen.nombre}`
        : `Desde ${lugares.origen.nombre}, seguí la línea azul`,
      alAireLibre: tramoSalida?.exterior ?? false,
      tramo: { desde: 0, hasta: nodoDe(0) },
    })
  }

  // Llegada: el tramo pasillo → puerta da el lado.
  pasos.push(llegada())

  // Otros pisos sin nodos en el grafo: el texto curado del catálogo, tal cual (nunca se inventan
  // escaleras). Si la ruta ya llega al piso del lugar, la escalera salió como un paso más.
  if (!llegaAlPiso && destino.piso !== 'PB') {
    const piso = etiquetaPiso(destino.piso)
    pasos.push({
      tipo: 'piso',
      texto: destino.indicacion
        ? `${capitalizar(piso)}: ${destino.indicacion}`
        : `El lugar está en el ${piso}`,
      alAireLibre: false,
      tramo: { desde: n - 1, hasta: n - 1 },
    })
  }
  return pasos

  function llegada(): Paso {
    const desde = nodoDe(cuerpo.length)
    const base: Paso = {
      tipo: 'llegar',
      texto: '',
      alAireLibre: false,
      tramo: { desde, hasta: n - 1 },
    }
    const objetivo = llegaAlPiso
      ? `llegaste a ${destino.nombre}`
      : 'llegaste al acceso de planta baja'
    if (!tramoLlegada) {
      base.texto = capitalizar(objetivo)
      return base
    }
    const partes: string[] = []
    const anterior = cuerpo[cuerpo.length - 1] ?? tramoSalida
    const ev = anterior ? evento(anterior, tramoLlegada) : null
    // Una salida a la vereda justo antes de la puerta no se nombra: "Llegaste a Biblioteca".
    if (ev?.tipo === 'entrada') partes.push(ev.texto)
    if (tramoLlegada.exterior) {
      base.texto = capitalizar([...partes, objetivo].join(': '))
      return base
    }
    const dirAntes =
      cuerpo.length > 0
        ? direcciones[cuerpo.length - 1]!
        : tramoSalida
          ? tramoSalida.direccion
          : null
    const giro = dirAntes ? calcularGiro(dirAntes, tramoLlegada.direccion) : 'derecho'
    if (giro === 'vuelta') avisarVuelta(tramoLlegada.desde)
    if (giro === 'izquierda' || giro === 'derecha') base.giro = giro
    partes.push(textoGiro(giro))
    base.texto = `${capitalizar(unir(partes))}: ${objetivo}`
    return base
  }
}
