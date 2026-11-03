/**
 * Geometría de una ruta para dibujarla y encuadrarla (sin React ni Leaflet): partes bajo techo y
 * al aire libre, marcadores, flecha de sentido y cajas de encuadre.
 */
import type { Caja } from '../../datos/index.ts'
import {
  armarTramos,
  partesDeRuta,
  puntosEntre,
  type DatosIndicaciones,
  type PartePolilinea,
  type Paso,
  type PuntoMapa,
  type RutaEncontrada,
  type Tramo,
} from '../../rutas/index.ts'

export interface GeometriaRuta {
  tramos: Tramo[]
  partes: PartePolilinea[]
  /** Todos los puntos de la ruta, en orden. */
  polilinea: PuntoMapa[]
  /** Puertas que usa la ruta (o la entrada al campus). */
  origen: PuntoMapa
  destino: PuntoMapa
  /** Flecha de sentido sobre el primer tramo cuando el origen es una entrada al campus. */
  flecha: { posicion: PuntoMapa; grados: number } | null
  tieneAireLibre: boolean
}

const punto = (datos: DatosIndicaciones, id: string): PuntoMapa => {
  const nodo = datos.grafo.nodos[datos.grafo.indiceNodo.get(id) ?? -1]
  if (!nodo) throw new Error(`${id} no está en el grafo`)
  return [nodo.x, nodo.y]
}

/** Grados de rotación (0 = este, en sentido horario porque la y crece hacia abajo). */
function rumbo(a: PuntoMapa, b: PuntoMapa): number {
  return (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI
}

export function geometriaRuta(ruta: RutaEncontrada, datos: DatosIndicaciones): GeometriaRuta {
  const tramos = armarTramos(ruta, datos.grafo, datos.nodos)
  const partes = partesDeRuta(tramos)
  const inicio = datos.nodos.get(ruta.puertaOrigen)
  const primero = tramos.find((t) => t.longitudPx > 0)
  const esEntradaCampus = inicio?.tipo === 'entrada' && inicio.depto === 'central'
  return {
    tramos,
    partes,
    polilinea: ruta.polilinea,
    origen: punto(datos, ruta.puertaOrigen),
    destino: punto(datos, ruta.puertaDestino),
    flecha:
      esEntradaCampus && primero
        ? {
            posicion: [
              (primero.puntoDesde[0] + primero.puntoHasta[0]) / 2,
              (primero.puntoDesde[1] + primero.puntoHasta[1]) / 2,
            ],
            grados: rumbo(primero.puntoDesde, primero.puntoHasta),
          }
        : null,
    tieneAireLibre: partes.some((p) => p.exterior),
  }
}

/** Caja que contiene todos los puntos (px del plano). */
export function cajaDePuntos(puntos: readonly PuntoMapa[]): Caja | null {
  if (puntos.length === 0) return null
  let x1 = Infinity
  let y1 = Infinity
  let x2 = -Infinity
  let y2 = -Infinity
  for (const [x, y] of puntos) {
    x1 = Math.min(x1, x)
    y1 = Math.min(y1, y)
    x2 = Math.max(x2, x)
    y2 = Math.max(y2, y)
  }
  return { x1, y1, x2, y2 }
}

/** Encuadre de la ruta completa (para `encuadreRuta` y el botón de recentrar). */
export function cajaDeRuta(ruta: Pick<RutaEncontrada, 'polilinea'>): Caja | null {
  return cajaDePuntos(ruta.polilinea)
}

/** Largo del comienzo de la ruta que se encuadra al tocar "Iniciar" (px del plano, ≈ 50 m). */
export const LARGO_INICIO_PX = 280

/** Los primeros `largo` px de la polilínea (el comienzo del recorrido, para "Iniciar"). */
export function puntosIniciales(
  polilinea: readonly PuntoMapa[],
  largo: number = LARGO_INICIO_PX,
): PuntoMapa[] {
  const puntos: PuntoMapa[] = []
  let recorrido = 0
  for (let i = 0; i < polilinea.length; i++) {
    const p = polilinea[i]!
    const previo = polilinea[i - 1]
    if (previo) {
      const tramo = Math.hypot(p[0] - previo[0], p[1] - previo[1])
      if (recorrido + tramo >= largo && tramo > 0) {
        const t = (largo - recorrido) / tramo
        puntos.push([previo[0] + (p[0] - previo[0]) * t, previo[1] + (p[1] - previo[1]) * t])
        break
      }
      recorrido += tramo
    }
    puntos.push(p)
  }
  return puntos
}

/** Puntos del tramo de un paso (decisión 12). `llegar` y `piso` encuadran la puerta destino. */
export function puntosDePaso(geo: GeometriaRuta, paso: Paso): PuntoMapa[] {
  if (paso.tipo === 'piso') return [geo.destino]
  const puntos = puntosEntre(geo.tramos, paso.tramo.desde, paso.tramo.hasta)
  if (paso.tipo === 'llegar') return puntos.length > 0 ? puntos : [geo.destino]
  return puntos.length > 0 ? puntos : [geo.origen]
}
