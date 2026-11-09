/**
 * Datos de la capa de tramos cerrados (decisión 9), estilo corte de Google Maps: línea roja
 * punteada sobre cada tramo e ícono de paso prohibido en el punto medio de la arista o sobre el
 * nodo. Solo los cierres vigentes. Las coordenadas están en px de `mapa-unlam`.
 */
import type { GrafoRuteable, PuntoMapa } from '../rutas/index.ts'
import { textoCerradoHasta } from './fechas.ts'
import type { Cierre } from './tipos.ts'

export const ESTILO_TRAMO_CERRADO = {
  color: '#D93025',
  /** Grosor de la línea en px de pantalla. */
  grosor: 4,
  /** `dashArray` de Leaflet/SVG: guiones de 6 px. */
  guiones: '6 6',
} as const

/** Lado mínimo del objetivo táctil del ícono, en px de pantalla. */
export const TAMANO_TACTIL_ICONO = 44

export interface IconoCierre {
  posicion: PuntoMapa
  /** Sobre un nodo cerrado o en el punto medio de una arista cerrada. */
  sobre: 'nodo' | 'arista'
  /** Id del nodo o de la arista. */
  elemento: string
}

export interface TramoCerrado {
  cierreId: string
  motivo: string
  /** Fin del cierre (ms) o `null`. */
  hasta: number | null
  /** Polilíneas a dibujar en rojo punteado (una por arista, sin repetidas). */
  segmentos: PuntoMapa[][]
  iconos: IconoCierre[]
}

export interface DetalleCierre {
  motivo: string
  /** "Cerrado hasta el 14/11 a las 23:00", o `null` si no tiene fin. */
  hasta: string | null
}

/** Polilínea completa de una arista, de `a` a `b`. */
function polilineaArista(grafo: GrafoRuteable, indice: number): PuntoMapa[] {
  const e = grafo.aristas[indice]!
  const a = grafo.nodos[e.a]!
  const b = grafo.nodos[e.b]!
  return [[a.x, a.y], ...e.puntos.map((p): PuntoMapa => [p[0], p[1]]), [b.x, b.y]]
}

/** Punto a mitad de camino (por longitud) de una polilínea. */
export function puntoMedio(puntos: readonly PuntoMapa[]): PuntoMapa {
  const largos: number[] = []
  let total = 0
  for (let i = 1; i < puntos.length; i++) {
    const [x1, y1] = puntos[i - 1]!
    const [x2, y2] = puntos[i]!
    const l = Math.hypot(x2 - x1, y2 - y1)
    largos.push(l)
    total += l
  }
  let resto = total / 2
  for (let i = 1; i < puntos.length; i++) {
    const l = largos[i - 1]!
    const [x1, y1] = puntos[i - 1]!
    const [x2, y2] = puntos[i]!
    if (resto <= l && l > 0) {
      const t = resto / l
      return [x1 + (x2 - x1) * t, y1 + (y2 - y1) * t]
    }
    resto -= l
  }
  const ultimo = puntos[puntos.length - 1] ?? [0, 0]
  return [ultimo[0], ultimo[1]]
}

/** Arma la capa con los cierres `vigentes` (ver `cierresVigentes`), en el orden del archivo. */
export function capaDeCierres(grafo: GrafoRuteable, vigentes: readonly Cierre[]): TramoCerrado[] {
  return vigentes.map((c) => {
    const aristas = new Set<number>()
    const iconos: IconoCierre[] = []
    for (const id of c.nodos) {
      const i = grafo.indiceNodo.get(id)
      if (i === undefined) continue
      const n = grafo.nodos[i]!
      iconos.push({ posicion: [n.x, n.y], sobre: 'nodo', elemento: id })
      for (const v of n.vecinos) aristas.add(v.arista)
    }
    for (const id of c.aristas) {
      const i = grafo.indiceArista.get(id)
      if (i === undefined) continue
      aristas.add(i)
      iconos.push({
        posicion: puntoMedio(polilineaArista(grafo, i)),
        sobre: 'arista',
        elemento: id,
      })
    }
    return {
      cierreId: c.id,
      motivo: c.motivo,
      hasta: c.hasta,
      segmentos: [...aristas].sort((x, y) => x - y).map((i) => polilineaArista(grafo, i)),
      iconos,
    }
  })
}

/** Texto de la burbuja al tocar el ícono. `zonaHoraria` por defecto la del dispositivo. */
export function detalleDeCierre(
  tramo: Pick<TramoCerrado, 'motivo' | 'hasta'>,
  zonaHoraria?: string,
): DetalleCierre {
  return {
    motivo: tramo.motivo,
    hasta: tramo.hasta === null ? null : textoCerradoHasta(tramo.hasta, zonaHoraria),
  }
}
